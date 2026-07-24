import 'package:flutter/foundation.dart';

import '../api/device_api.dart';
import '../auth/auth_service.dart';
import 'installation.dart';
import 'push_service.dart';

/// 로그인 이후 이 기기를 서버에 등록하고, 토큰 갱신을 반영하는 조정자.
///
/// 알림 권한·FCM 토큰은 PushService가 (Firebase 미설정 시) 없이도 채워주므로, 등록 자체는 항상 성공한다.
/// 알림이 부가 기능이라 등록 실패가 로그인·앱 사용을 막지 않는다.
class DeviceRegistrar {
  DeviceRegistrar({DeviceApi? api}) : _api = api ?? HttpDeviceApi();

  final DeviceApi _api;

  static final DeviceRegistrar instance = DeviceRegistrar();

  bool _tokenRefreshHooked = false;

  /// 현재 설치의 installationId. 기기 목록에서 '이 기기'를 가리는 데도 쓴다.
  Future<String> installationId() => Installation.instance.id();

  /// 로그인 직후 호출 — 권한 요청 + 토큰 확보 후 서버에 등록한다.
  /// 실패해도 앱 흐름을 막지 않도록 예외를 삼킨다.
  Future<void> registerAfterLogin() async {
    final token = AuthService.instance.accessToken;
    if (token == null) return;

    try {
      final installationId = await Installation.instance.id();
      final reg = await PushService.instance.requestAndFetch();

      await _api.register(
        accessToken: token,
        installationId: installationId,
        platform: reg.platform,
        pushToken: reg.token,
        notificationPermission: reg.permission.wire,
        deviceName: reg.deviceName,
      );

      _hookTokenRefresh(installationId, reg.platform);
    } catch (e) {
      debugPrint('[device] 등록 실패(무시): $e');
    }
  }

  /// FCM 토큰이 갱신되면 서버에 재등록한다. 한 번만 건다.
  void _hookTokenRefresh(String installationId, String platform) {
    if (_tokenRefreshHooked) return;
    _tokenRefreshHooked = true;

    PushService.instance.onTokenRefresh((token) async {
      final accessToken = AuthService.instance.accessToken;
      if (accessToken == null) return;
      try {
        await _api.register(
          accessToken: accessToken,
          installationId: installationId,
          platform: platform,
          pushToken: token,
          notificationPermission: PushPermission.granted.wire,
        );
      } catch (e) {
        debugPrint('[device] 토큰 갱신 재등록 실패(무시): $e');
      }
    });
  }
}

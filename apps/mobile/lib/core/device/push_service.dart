import 'dart:io' show Platform;

import 'package:device_info_plus/device_info_plus.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

/// 알림 권한 상태 — 서버 Device.notificationPermission 과 동일한 문자열로 전송한다.
enum PushPermission { granted, denied, undetermined }

/// FCM 토큰·권한·기기 이름을 모은 결과. 기기 등록 API의 입력이 된다.
class PushRegistration {
  const PushRegistration({
    required this.permission,
    required this.platform,
    this.token,
    this.deviceName,
  });

  final PushPermission permission;

  /// 'ios' | 'android' — 서버 Device.platform.
  final String platform;

  /// FCM 등록 토큰. 권한 미허용이거나 Firebase 미설정이면 null.
  final String? token;

  final String? deviceName;
}

/// 푸시 권한·토큰을 다루는 얇은 계층.
///
/// **Firebase 프로젝트 설정(google-services 파일)이 없으면 조용히 비활성**된다 — 소셜 로그인 키처럼
/// 인프라가 준비되기 전에도 앱과 멀티기기 등록은 동작해야 하기 때문이다. 이 경우 토큰 없이
/// (permission=undetermined) 기기를 등록하고, 설정이 붙으면 토큰까지 채워진다.
class PushService {
  PushService._();

  static final PushService instance = PushService._();

  bool _firebaseReady = false;
  bool _initTried = false;

  /// Firebase를 한 번만 초기화한다. 설정 파일이 없으면 실패를 삼키고 비활성 상태로 둔다.
  Future<void> _ensureFirebase() async {
    if (_initTried) return;
    _initTried = true;

    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp();
      }
      _firebaseReady = true;
    } catch (e) {
      // google-services 파일 미설정 등 — 푸시는 비활성, 앱은 정상 동작.
      debugPrint('[push] Firebase 미설정 — 푸시 비활성: $e');
      _firebaseReady = false;
    }
  }

  /// 현재 플랫폼 라벨.
  String get _platform => Platform.isIOS ? 'ios' : 'android';

  /// 알림 권한을 요청하고 토큰을 확보한다. Firebase가 없으면 토큰 없이 기기 이름·플랫폼만 채운다.
  Future<PushRegistration> requestAndFetch() async {
    final deviceName = await _deviceName();
    await _ensureFirebase();

    if (!_firebaseReady) {
      return PushRegistration(
        permission: PushPermission.undetermined,
        platform: _platform,
        deviceName: deviceName,
      );
    }

    try {
      final messaging = FirebaseMessaging.instance;
      final settings = await messaging.requestPermission();
      final permission = _toPermission(settings.authorizationStatus);

      final token = permission == PushPermission.granted ? await messaging.getToken() : null;

      return PushRegistration(
        permission: permission,
        platform: _platform,
        token: token,
        deviceName: deviceName,
      );
    } catch (e) {
      debugPrint('[push] 토큰 획득 실패: $e');
      return PushRegistration(
        permission: PushPermission.undetermined,
        platform: _platform,
        deviceName: deviceName,
      );
    }
  }

  /// 현재 권한 상태만 확인한다(요청하지 않음). 알림 설정 화면 표시용.
  Future<PushPermission> currentPermission() async {
    await _ensureFirebase();
    if (!_firebaseReady) return PushPermission.undetermined;

    try {
      final settings = await FirebaseMessaging.instance.getNotificationSettings();
      return _toPermission(settings.authorizationStatus);
    } catch (_) {
      return PushPermission.undetermined;
    }
  }

  /// 토큰 갱신 스트림을 구독해 서버에 재등록시킨다. Firebase 미설정이면 아무 일도 하지 않는다.
  void onTokenRefresh(void Function(String token) handler) {
    if (!_firebaseReady) return;
    try {
      FirebaseMessaging.instance.onTokenRefresh.listen(handler);
    } catch (_) {
      // 무시 — 토큰 갱신 구독 실패는 치명적이지 않다.
    }
  }

  PushPermission _toPermission(AuthorizationStatus status) {
    switch (status) {
      case AuthorizationStatus.authorized:
      case AuthorizationStatus.provisional:
        return PushPermission.granted;
      case AuthorizationStatus.denied:
        return PushPermission.denied;
      default:
        return PushPermission.undetermined;
    }
  }

  Future<String?> _deviceName() async {
    try {
      final info = DeviceInfoPlugin();
      if (Platform.isIOS) {
        final ios = await info.iosInfo;
        return ios.utsname.machine; // 예: iPhone15,2
      }
      final android = await info.androidInfo;
      return '${android.manufacturer} ${android.model}';
    } catch (_) {
      return null;
    }
  }
}

extension PushPermissionWire on PushPermission {
  /// 서버로 보낼 문자열 값.
  String get wire => switch (this) {
        PushPermission.granted => 'granted',
        PushPermission.denied => 'denied',
        PushPermission.undetermined => 'undetermined',
      };
}

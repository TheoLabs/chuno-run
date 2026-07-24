import 'api_client.dart';

/// 기기 관리 화면의 기기 한 줄 — GET /devices 의 items[].
class DeviceItem {
  const DeviceItem({
    required this.id,
    required this.platform,
    required this.status,
    required this.notificationPermission,
    required this.raceStartingSoonEnabled,
    required this.raceStartedEnabled,
    required this.raceFinishedEnabled,
    required this.isCurrent,
    this.deviceName,
    this.lastActiveOn,
  });

  final int id;

  /// 'ios' | 'android'
  final String platform;

  /// 'active' | 'revoked'
  final String status;

  /// 'granted' | 'denied' | 'undetermined'
  final String notificationPermission;

  final bool raceStartingSoonEnabled;
  final bool raceStartedEnabled;
  final bool raceFinishedEnabled;

  /// 지금 이 요청을 보낸 기기인지 — '이 기기' 배지·해지 차단.
  final bool isCurrent;

  final String? deviceName;
  final String? lastActiveOn;

  bool get notificationsGranted => notificationPermission == 'granted';

  factory DeviceItem.fromJson(Map<String, dynamic> json) => DeviceItem(
        id: (json['id'] as num).toInt(),
        platform: (json['platform'] as String?) ?? '',
        status: (json['status'] as String?) ?? '',
        notificationPermission: (json['notificationPermission'] as String?) ?? 'undetermined',
        raceStartingSoonEnabled: (json['raceStartingSoonEnabled'] as bool?) ?? true,
        raceStartedEnabled: (json['raceStartedEnabled'] as bool?) ?? true,
        raceFinishedEnabled: (json['raceFinishedEnabled'] as bool?) ?? true,
        isCurrent: (json['isCurrent'] as bool?) ?? false,
        deviceName: json['deviceName'] as String?,
        lastActiveOn: json['lastActiveOn'] as String?,
      );
}

/// 기기 API. 등록·목록·알림 설정·해지.
abstract class DeviceApi {
  /// 기기 등록/갱신 (POST /devices). 같은 installationId면 서버가 upsert한다.
  Future<void> register({
    required String accessToken,
    required String installationId,
    required String platform,
    String? pushToken,
    String? notificationPermission,
    String? deviceName,
  });

  /// 내 기기 목록 (GET /devices?installationId=...).
  Future<List<DeviceItem>> list({required String accessToken, required String installationId});

  /// 알림 종류별 수신 설정 변경 (PUT /devices/:id/notifications).
  Future<void> changeNotifications({
    required String accessToken,
    required int id,
    bool? raceStartingSoon,
    bool? raceStarted,
    bool? raceFinished,
  });

  /// 기기 해지 (DELETE /devices/:id).
  Future<void> revoke({required String accessToken, required int id});
}

class HttpDeviceApi implements DeviceApi {
  HttpDeviceApi({ApiClient? client}) : _client = client ?? ApiClient();
  final ApiClient _client;

  @override
  Future<void> register({
    required String accessToken,
    required String installationId,
    required String platform,
    String? pushToken,
    String? notificationPermission,
    String? deviceName,
  }) async {
    await _client.post('/devices', token: accessToken, body: {
      'installationId': installationId,
      'platform': platform,
      if (pushToken != null) 'pushToken': pushToken,
      if (notificationPermission != null) 'notificationPermission': notificationPermission,
      if (deviceName != null) 'deviceName': deviceName,
    });
  }

  @override
  Future<List<DeviceItem>> list({required String accessToken, required String installationId}) async {
    final json = await _client.get('/devices?installationId=$installationId', token: accessToken);
    final data = json['data'] as Map<String, dynamic>;
    return (data['items'] as List<dynamic>? ?? const [])
        .map((e) => DeviceItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<void> changeNotifications({
    required String accessToken,
    required int id,
    bool? raceStartingSoon,
    bool? raceStarted,
    bool? raceFinished,
  }) async {
    await _client.put('/devices/$id/notifications', token: accessToken, body: {
      if (raceStartingSoon != null) 'raceStartingSoon': raceStartingSoon,
      if (raceStarted != null) 'raceStarted': raceStarted,
      if (raceFinished != null) 'raceFinished': raceFinished,
    });
  }

  @override
  Future<void> revoke({required String accessToken, required int id}) async {
    await _client.delete('/devices/$id', token: accessToken);
  }
}

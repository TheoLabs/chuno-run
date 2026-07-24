import 'dart:async';
import 'dart:io' show Platform;

import 'package:geolocator/geolocator.dart';

/// 위치 권한 상태 — 앱 진입 게이트가 이 값으로 분기한다.
enum LocationAccess {
  /// 사용할 수 있다 (앱 사용 중 또는 항상 허용).
  granted,

  /// 사용자가 거부했다. 다시 물어볼 수 있다.
  denied,

  /// 사용자가 영구 거부했다. 앱 설정에서만 바꿀 수 있다.
  deniedForever,

  /// 기기의 위치 서비스(GPS) 자체가 꺼져 있다.
  serviceDisabled,
}

/// 위치 권한 확인·요청과 GPS 스트림을 감싸는 얇은 계층.
///
/// 추노는 위치가 서비스의 전제라 권한이 없으면 아예 진입시키지 않는다(기획 §5 위치 권한).
/// 화면은 이 서비스만 알고 geolocator 를 직접 쓰지 않는다 — 테스트에서 갈아끼우기 위해서다.
abstract class LocationService {
  /// 전역 인스턴스. 테스트에서는 가짜 구현으로 교체한다.
  static LocationService instance = GeolocatorLocationService();

  /// 현재 권한 상태를 확인한다(요청하지 않음).
  Future<LocationAccess> check();

  /// 권한을 요청하고 결과 상태를 반환한다.
  Future<LocationAccess> request();

  /// 앱의 시스템 설정 화면을 연다 — 영구 거부 상태를 사용자가 직접 풀도록.
  Future<void> openSettings();

  /// 기기 위치 서비스 설정 화면을 연다.
  Future<void> openLocationSettings();

  /// 위치 갱신 스트림. [distanceFilterMeter] 만큼 움직일 때마다 이벤트가 온다.
  Stream<Position> watch({int distanceFilterMeter = 5});

  /// 두 지점 사이 거리(m).
  double distanceBetween(Position a, Position b);
}

/// geolocator 기반 실제 구현.
class GeolocatorLocationService implements LocationService {
  @override
  Future<LocationAccess> check() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      return LocationAccess.serviceDisabled;
    }
    return _toAccess(await Geolocator.checkPermission());
  }

  @override
  Future<LocationAccess> request() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      return LocationAccess.serviceDisabled;
    }

    var permission = await Geolocator.checkPermission();

    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    return _toAccess(permission);
  }

  @override
  Future<void> openSettings() => Geolocator.openAppSettings();

  @override
  Future<void> openLocationSettings() => Geolocator.openLocationSettings();

  @override
  Stream<Position> watch({int distanceFilterMeter = 5}) {
    return Geolocator.getPositionStream(
      locationSettings: _settings(distanceFilterMeter),
    );
  }

  @override
  double distanceBetween(Position a, Position b) => Geolocator.distanceBetween(
        a.latitude,
        a.longitude,
        b.latitude,
        b.longitude,
      );

  /// 플랫폼별 백그라운드 추적 설정.
  ///
  /// 화면이 꺼지거나 앱이 백그라운드로 가도 추적이 끊기면 안 되므로(CH-21),
  /// iOS 는 백그라운드 위치 표시자를, 안드로이드는 포그라운드 서비스 알림을 켠다.
  LocationSettings _settings(int distanceFilterMeter) {
    if (Platform.isIOS) {
      return AppleSettings(
        accuracy: LocationAccuracy.best,
        activityType: ActivityType.fitness,
        distanceFilter: distanceFilterMeter,
        // 백그라운드에서도 위치 갱신을 계속 받는다(Info.plist 의 UIBackgroundModes: location 필요).
        allowBackgroundLocationUpdates: true,
        pauseLocationUpdatesAutomatically: false,
        showBackgroundLocationIndicator: true,
      );
    }

    if (Platform.isAndroid) {
      return AndroidSettings(
        accuracy: LocationAccuracy.best,
        distanceFilter: distanceFilterMeter,
        // 포그라운드 서비스로 승격해야 화면이 꺼진 뒤에도 OS 가 추적을 유지한다.
        foregroundNotificationConfig: const ForegroundNotificationConfig(
          notificationTitle: '추노 경주 진행 중',
          notificationText: '러닝 거리를 기록하고 있어요.',
          enableWakeLock: true,
        ),
      );
    }

    return LocationSettings(
      accuracy: LocationAccuracy.best,
      distanceFilter: distanceFilterMeter,
    );
  }

  LocationAccess _toAccess(LocationPermission permission) => switch (permission) {
        LocationPermission.always || LocationPermission.whileInUse => LocationAccess.granted,
        LocationPermission.deniedForever => LocationAccess.deniedForever,
        _ => LocationAccess.denied,
      };
}

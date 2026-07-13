import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb;

/// 앱 전역 설정. 로컬 개발 중에는 core-api(:3000)에 붙는다.
class AppConfig {
  AppConfig._();

  /// `flutter run --dart-define=API_BASE_URL=http://192.168.0.10:3000` 로 덮어쓸 수 있다.
  static const String _override = String.fromEnvironment('API_BASE_URL');

  /// API 베이스 URL. Android 에뮬레이터는 호스트를 10.0.2.2로 접근한다.
  static String get apiBaseUrl {
    if (_override.isNotEmpty) return _override;
    if (!kIsWeb && Platform.isAndroid) return 'http://10.0.2.2:3000';
    return 'http://localhost:3000';
  }
}

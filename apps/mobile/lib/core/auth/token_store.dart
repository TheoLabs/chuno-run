import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// 액세스 토큰 보관소. 앱을 다시 켰을 때 자동 로그인하려면 토큰이 남아 있어야 한다. (CH-5)
///
/// 토큰은 자격증명이라 SharedPreferences 가 아니라 키체인/키스토어에 저장한다.
abstract class TokenStore {
  /// 전역 인스턴스. 테스트에서는 메모리 구현으로 교체한다.
  static TokenStore instance = SecureTokenStore();

  Future<String?> read();
  Future<void> write(String token);
  Future<void> clear();
}

class SecureTokenStore implements TokenStore {
  SecureTokenStore({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              // 기기가 잠겨 있는 동안에는 읽을 필요가 없다 — 노출 면을 좁힌다.
              iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
            );

  final FlutterSecureStorage _storage;

  static const _key = 'chuno.accessToken';

  @override
  Future<String?> read() async {
    try {
      return await _storage.read(key: _key);
    } catch (_) {
      // 키체인 접근 실패는 '저장된 세션 없음'과 같게 다룬다 — 앱을 막지 않는다.
      return null;
    }
  }

  @override
  Future<void> write(String token) async {
    try {
      await _storage.write(key: _key, value: token);
    } catch (_) {
      // 저장 실패해도 이번 세션은 메모리 토큰으로 계속 쓸 수 있다.
    }
  }

  @override
  Future<void> clear() async {
    try {
      await _storage.delete(key: _key);
    } catch (_) {
      // 무시 — 어차피 메모리 세션은 비운다.
    }
  }
}

/// 테스트·비저장 환경용 인메모리 구현.
class InMemoryTokenStore implements TokenStore {
  String? _token;

  @override
  Future<String?> read() async => _token;

  @override
  Future<void> write(String token) async => _token = token;

  @override
  Future<void> clear() async => _token = null;
}

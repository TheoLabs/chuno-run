import 'dart:math';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// 앱 설치 단위 식별자를 보관·발급한다. 서버는 (userId, installationId)로 기기를 유일하게 본다.
///
/// 재설치하면 값이 새로 생기고(=새 기기), 같은 설치에서 재로그인하면 같은 값이라 서버가 기존 기기를
/// 되살린다. 토큰과 달리 자격증명은 아니지만, 일관성을 위해 secure storage에 함께 둔다.
class Installation {
  Installation._();

  static final Installation instance = Installation._();

  static const _key = 'chuno.installationId';
  final _storage = const FlutterSecureStorage();

  String? _cached;

  /// 이 설치의 식별자. 없으면 한 번 생성해 저장한 뒤 이후 계속 같은 값을 돌려준다.
  Future<String> id() async {
    if (_cached != null) return _cached!;

    final stored = await _read();
    if (stored != null && stored.isNotEmpty) {
      _cached = stored;
      return stored;
    }

    final generated = _generate();
    _cached = generated;
    await _write(generated);
    return generated;
  }

  Future<String?> _read() async {
    try {
      return await _storage.read(key: _key);
    } catch (_) {
      return null;
    }
  }

  Future<void> _write(String value) async {
    try {
      await _storage.write(key: _key, value: value);
    } catch (_) {
      // 저장 실패해도 이번 실행에서는 메모리 캐시로 일관성을 유지한다.
    }
  }

  /// UUID v4 형태의 랜덤 식별자. (별도 패키지 없이 생성)
  String _generate() {
    final rng = Random.secure();
    final bytes = List<int>.generate(16, (_) => rng.nextInt(256));
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
    final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
    return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-'
        '${hex.substring(16, 20)}-${hex.substring(20)}';
  }
}

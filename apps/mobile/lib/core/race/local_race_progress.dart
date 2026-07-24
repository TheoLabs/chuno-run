import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// 경주 중 기기에 보관하는 마지막 진행값. 앱이 강제 종료돼도 복귀 시 서버와 재동기화하는 근거다. (CH-58)
class LocalRaceProgress {
  const LocalRaceProgress({required this.roomId, required this.distanceMeter, required this.savedAt});

  final int roomId;
  final int distanceMeter;
  final String savedAt;

  Map<String, dynamic> toJson() => {'roomId': roomId, 'distanceMeter': distanceMeter, 'savedAt': savedAt};

  factory LocalRaceProgress.fromJson(Map<String, dynamic> json) => LocalRaceProgress(
        roomId: (json['roomId'] as num).toInt(),
        distanceMeter: (json['distanceMeter'] as num).toInt(),
        savedAt: (json['savedAt'] as String?) ?? '',
      );
}

/// 진행 중 경주 하나의 로컬 스냅샷을 저장·복원한다. 경주가 끝나면 지운다.
class LocalRaceProgressStore {
  LocalRaceProgressStore._();

  static final LocalRaceProgressStore instance = LocalRaceProgressStore._();

  static const _key = 'chuno.raceProgress';
  final _storage = const FlutterSecureStorage();

  Future<void> save(LocalRaceProgress progress) async {
    try {
      await _storage.write(key: _key, value: jsonEncode(progress.toJson()));
    } catch (_) {
      // 저장 실패는 복귀 정확도만 낮출 뿐 경주를 막지 않는다.
    }
  }

  Future<LocalRaceProgress?> read() async {
    try {
      final raw = await _storage.read(key: _key);
      if (raw == null || raw.isEmpty) return null;
      return LocalRaceProgress.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  Future<void> clear() async {
    try {
      await _storage.delete(key: _key);
    } catch (_) {
      // 무시.
    }
  }
}

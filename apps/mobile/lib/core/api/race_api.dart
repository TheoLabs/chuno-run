import 'api_client.dart';

/// 결과 화면의 참가자 한 줄 — GET /rooms/:id/result 의 `participants[]`.
class RaceResultParticipant {
  const RaceResultParticipant({
    required this.userId,
    required this.nickname,
    required this.status,
    required this.distanceMeter,
    required this.isMe,
    this.finalRank,
    this.elapsedSeconds,
    this.paceSecondsPerKm,
    this.profileImageUrl,
    this.voided = false,
  });

  final int userId;
  final String nickname;

  /// 'finished' | 'dnf' | 'running' | 'joined'
  final String status;
  final int distanceMeter;
  final bool isMe;

  final int? finalRank;

  /// 출발부터 도달까지 걸린 시간(초).
  final int? elapsedSeconds;

  /// 평균 페이스(초/km).
  final int? paceSecondsPerKm;

  final String? profileImageUrl;

  /// 부정행위 탐지로 기록이 무효(실격) 처리됐는지. 일반 미완주와 구분해 표시한다(CH-62).
  final bool voided;

  bool get isFinished => status == 'finished';

  factory RaceResultParticipant.fromJson(Map<String, dynamic> json) => RaceResultParticipant(
        userId: (json['userId'] as num?)?.toInt() ?? 0,
        nickname: (json['nickname'] as String?) ?? '',
        status: (json['status'] as String?) ?? '',
        distanceMeter: (json['distanceMeter'] as num?)?.toInt() ?? 0,
        isMe: (json['isMe'] as bool?) ?? false,
        finalRank: (json['finalRank'] as num?)?.toInt(),
        elapsedSeconds: (json['elapsedSeconds'] as num?)?.toInt(),
        paceSecondsPerKm: (json['paceSecondsPerKm'] as num?)?.toInt(),
        profileImageUrl: json['profileImageUrl'] as String?,
        voided: (json['voided'] as bool?) ?? false,
      );
}

/// 경주 결과 — GET /rooms/:id/result 의 `data`.
class RaceResult {
  const RaceResult({
    required this.id,
    required this.title,
    required this.status,
    required this.goalDistanceMeter,
    required this.goalLimitMinutes,
    required this.participants,
    this.finishedOn,
  });

  final int id;
  final String title;
  final String status;
  final int goalDistanceMeter;
  final int goalLimitMinutes;
  final List<RaceResultParticipant> participants;
  final DateTime? finishedOn;

  bool get isFinished => status == 'finished';

  /// 내 기록. 참가자가 아니면 null.
  RaceResultParticipant? get me {
    for (final participant in participants) {
      if (participant.isMe) return participant;
    }
    return null;
  }

  factory RaceResult.fromJson(Map<String, dynamic> json) => RaceResult(
        id: (json['id'] as num?)?.toInt() ?? 0,
        title: (json['title'] as String?) ?? '',
        status: (json['status'] as String?) ?? '',
        goalDistanceMeter: (json['goalDistanceMeter'] as num?)?.toInt() ?? 0,
        goalLimitMinutes: (json['goalLimitMinutes'] as num?)?.toInt() ?? 0,
        finishedOn: DateTime.tryParse((json['finishedOn'] as String?) ?? ''),
        participants: (json['participants'] as List<dynamic>? ?? const [])
            .map((e) => RaceResultParticipant.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

/// 경주 이력 한 줄 — GET /users/me/races 의 `items[]`.
class RaceHistoryItem {
  const RaceHistoryItem({
    required this.id,
    required this.title,
    required this.status,
    required this.goalDistanceMeter,
    required this.startOn,
    required this.participantCount,
    required this.myStatus,
    required this.myDistanceMeter,
    this.myFinalRank,
    this.myElapsedSeconds,
    this.myPaceSecondsPerKm,
    this.myVoided = false,
  });

  final int id;
  final String title;
  final String status;
  final int goalDistanceMeter;
  final DateTime startOn;
  final int participantCount;

  final String myStatus;
  final int myDistanceMeter;
  final int? myFinalRank;
  final int? myElapsedSeconds;
  final int? myPaceSecondsPerKm;

  /// 내 기록이 부정행위로 무효(실격) 처리됐는지. 이력에서 구분 표시한다(CH-62).
  final bool myVoided;

  bool get isCancelled => status == 'cancelled';
  bool get didFinish => myStatus == 'finished';

  factory RaceHistoryItem.fromJson(Map<String, dynamic> json) => RaceHistoryItem(
        id: (json['id'] as num?)?.toInt() ?? 0,
        title: (json['title'] as String?) ?? '',
        status: (json['status'] as String?) ?? '',
        goalDistanceMeter: (json['goalDistanceMeter'] as num?)?.toInt() ?? 0,
        startOn: DateTime.tryParse((json['startOn'] as String?) ?? '') ?? DateTime.now(),
        participantCount: (json['participantCount'] as num?)?.toInt() ?? 0,
        myStatus: (json['myStatus'] as String?) ?? '',
        myDistanceMeter: (json['myDistanceMeter'] as num?)?.toInt() ?? 0,
        myFinalRank: (json['myFinalRank'] as num?)?.toInt(),
        myElapsedSeconds: (json['myElapsedSeconds'] as num?)?.toInt(),
        myPaceSecondsPerKm: (json['myPaceSecondsPerKm'] as num?)?.toInt(),
        myVoided: (json['myVoided'] as bool?) ?? false,
      );
}

/// [2차] 진행 중 경주 복귀 정보 — GET /races/active 의 data.
class ActiveRace {
  const ActiveRace({required this.resumable, this.roomId, this.title, this.reason});

  /// 복귀 가능 여부. false면 진행 중 경주가 없거나(none) 시한 초과(expired).
  final bool resumable;
  final int? roomId;
  final String? title;

  /// 'expired' | 'none' | null(resumable).
  final String? reason;

  bool get expired => reason == 'expired';

  factory ActiveRace.fromJson(Map<String, dynamic> json) {
    final snapshot = json['snapshot'] as Map<String, dynamic>?;
    return ActiveRace(
      resumable: (json['resumable'] as bool?) ?? false,
      roomId: (snapshot?['roomId'] as num?)?.toInt(),
      title: snapshot?['title'] as String?,
      reason: json['reason'] as String?,
    );
  }
}

/// 경주 결과·이력 조회 API. 실시간 진행은 WebSocket(RaceSocket)이 담당한다.
abstract class RaceApi {
  /// 경주 결과 (GET /rooms/:id/result).
  Future<RaceResult> result({required String accessToken, required int roomId});

  /// 내 경주 이력 (GET /users/me/races).
  Future<List<RaceHistoryItem>> history({required String accessToken, int page = 1, int limit = 20});

  /// [2차] 진행 중 경주 복귀 정보 (GET /races/active).
  Future<ActiveRace> activeRace({required String accessToken});

  /// [2차] 복귀 재동기화 — 기기 보관 거리를 서버에 다시 올린다 (POST /rooms/:id/resync).
  Future<void> resync({required String accessToken, required int roomId, required int distanceMeter});
}

class HttpRaceApi implements RaceApi {
  HttpRaceApi({ApiClient? client}) : _client = client ?? ApiClient();
  final ApiClient _client;

  @override
  Future<RaceResult> result({required String accessToken, required int roomId}) async {
    final json = await _client.get('/rooms/$roomId/result', token: accessToken);
    return RaceResult.fromJson(json['data'] as Map<String, dynamic>);
  }

  @override
  Future<List<RaceHistoryItem>> history({
    required String accessToken,
    int page = 1,
    int limit = 20,
  }) async {
    final json = await _client.get('/users/me/races?page=$page&limit=$limit', token: accessToken);
    final data = json['data'] as Map<String, dynamic>;
    return (data['items'] as List<dynamic>? ?? const [])
        .map((e) => RaceHistoryItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<ActiveRace> activeRace({required String accessToken}) async {
    final json = await _client.get('/races/active', token: accessToken);
    return ActiveRace.fromJson(json['data'] as Map<String, dynamic>);
  }

  @override
  Future<void> resync({required String accessToken, required int roomId, required int distanceMeter}) async {
    await _client.post('/rooms/$roomId/resync', token: accessToken, body: {'distanceMeter': distanceMeter});
  }
}

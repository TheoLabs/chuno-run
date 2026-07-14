import 'api_client.dart';

/// core-api Room 목록 항목 — GET /rooms 의 `data.items[]` 한 건.
///
/// 서버는 참여 가능한 방(모집중·마감·진행중)만 내려주며, 목표/제한/정원과 함께
/// 현재 참가 인원(currentParticipantCount)을 준다.
class RoomListItem {
  const RoomListItem({
    required this.id,
    required this.hostUserId,
    required this.title,
    required this.goalDistanceMeter,
    required this.goalLimitMinutes,
    required this.startOn,
    required this.capacity,
    required this.status,
    required this.currentParticipantCount,
    required this.isJoined,
  });

  final int id;

  /// 방장(생성자) user id. 로그인 사용자 id와 같으면 내가 만든 방이다.
  final int hostUserId;
  final String title;
  final int goalDistanceMeter;
  final int goalLimitMinutes;

  /// 예정 시작 시각. 서버 KST 문자열('YYYY-MM-DD HH:mm:ss')을 로컬 DateTime으로 파싱한다.
  final DateTime startOn;
  final int capacity;

  /// 'recruiting' | 'ready' | 'live' | 'finished' | 'cancelled'
  final String status;

  /// 현재 참가 인원 (server: participants 수).
  final int currentParticipantCount;

  /// 현재 로그인 유저가 이 방의 참가자면 true (방장이면 자동 참가되어 true).
  final bool isJoined;

  factory RoomListItem.fromJson(Map<String, dynamic> json) => RoomListItem(
        id: json['id'] as int,
        hostUserId: (json['hostUserId'] as num?)?.toInt() ?? 0,
        title: (json['title'] as String?) ?? '',
        goalDistanceMeter: (json['goalDistanceMeter'] as num?)?.toInt() ?? 0,
        goalLimitMinutes: (json['goalLimitMinutes'] as num?)?.toInt() ?? 0,
        startOn: DateTime.tryParse((json['startOn'] as String?) ?? '') ?? DateTime.now(),
        capacity: (json['capacity'] as num?)?.toInt() ?? 0,
        status: (json['status'] as String?) ?? '',
        currentParticipantCount: (json['currentParticipantCount'] as num?)?.toInt() ?? 0,
        isJoined: (json['isJoined'] as bool?) ?? false,
      );
}

/// 방 상세의 참가자 한 명 — GET /rooms/:id 의 `data.participants[]` 한 건.
///
/// 참가자 메타(진행거리·순위·완주시각)와 함께 사용자(user) 프로필을 평탄화해 보관한다.
class RoomParticipant {
  const RoomParticipant({
    required this.id,
    required this.roomId,
    required this.status,
    required this.currentDistanceMeter,
    required this.userId,
    required this.nickname,
    this.finishedOn,
    this.finalRank,
    this.joinOn,
    this.profileImageUrl,
  });

  final int id;
  final int roomId;

  /// 참가 상태 ('joined' | 'ready' | 'running' | 'finished' 등 서버 도메인).
  final String status;
  final int currentDistanceMeter;

  /// 완주 시각 문자열. 미완주면 null.
  final String? finishedOn;

  /// 최종 순위. 경주 종료 전이면 null.
  final int? finalRank;

  /// 참가 시각 문자열.
  final String? joinOn;

  /// user.id — 방장 판정(hostUserId 비교)에 쓴다.
  final int userId;
  final String nickname;
  final String? profileImageUrl;

  factory RoomParticipant.fromJson(Map<String, dynamic> json) {
    final user = (json['user'] as Map<String, dynamic>?) ?? const {};
    return RoomParticipant(
      id: (json['id'] as num?)?.toInt() ?? 0,
      roomId: (json['roomId'] as num?)?.toInt() ?? 0,
      status: (json['status'] as String?) ?? '',
      currentDistanceMeter: (json['currentDistanceMeter'] as num?)?.toInt() ?? 0,
      finishedOn: json['finishedOn'] as String?,
      finalRank: (json['finalRank'] as num?)?.toInt(),
      joinOn: json['joinOn'] as String?,
      userId: (user['id'] as num?)?.toInt() ?? 0,
      nickname: (user['nickname'] as String?) ?? '',
      profileImageUrl: user['profileImageUrl'] as String?,
    );
  }
}

/// core-api 방 상세 — GET /rooms/:id 의 `data`(GeneralRoomRetrieveResponseDto).
class RoomDetail {
  const RoomDetail({
    required this.id,
    required this.hostUserId,
    required this.title,
    required this.goalDistanceMeter,
    required this.goalLimitMinutes,
    required this.startOn,
    required this.capacity,
    required this.status,
    required this.participants,
    this.finishedOn,
  });

  final int id;

  /// 방장(생성자) user id. 로그인 사용자 id와 같으면 방장이다.
  final int hostUserId;
  final String title;
  final int goalDistanceMeter;
  final int goalLimitMinutes;

  /// 예정 시작 시각. 서버 KST 문자열('YYYY-MM-DD HH:mm:ss')을 로컬 DateTime으로 파싱한다.
  final DateTime startOn;
  final int capacity;

  /// 'recruiting' | 'ready' | 'live' | 'finished' | 'cancelled'
  final String status;

  /// 종료 시각 문자열. 미종료면 null.
  final String? finishedOn;

  final List<RoomParticipant> participants;

  factory RoomDetail.fromJson(Map<String, dynamic> json) => RoomDetail(
        id: (json['id'] as num?)?.toInt() ?? 0,
        hostUserId: (json['hostUserId'] as num?)?.toInt() ?? 0,
        title: (json['title'] as String?) ?? '',
        goalDistanceMeter: (json['goalDistanceMeter'] as num?)?.toInt() ?? 0,
        goalLimitMinutes: (json['goalLimitMinutes'] as num?)?.toInt() ?? 0,
        startOn: DateTime.tryParse((json['startOn'] as String?) ?? '') ?? DateTime.now(),
        capacity: (json['capacity'] as num?)?.toInt() ?? 0,
        status: (json['status'] as String?) ?? '',
        finishedOn: json['finishedOn'] as String?,
        participants: (json['participants'] as List<dynamic>? ?? const [])
            .map((e) => RoomParticipant.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

/// 방 API 추상화 — 테스트에서 가짜 구현으로 교체할 수 있다.
abstract class RoomApi {
  /// 참여 가능한 방 목록을 반환한다 (GET /rooms).
  Future<List<RoomListItem>> list({required String accessToken});

  /// 방 상세를 반환한다 (GET /rooms/:id).
  Future<RoomDetail> retrieve({required String accessToken, required int id});

  /// 방에 참가한다 (POST /rooms/:id/join, 요청 본문 없음). 실패 시 [ApiException].
  Future<void> join({required String accessToken, required int id});

  /// 방에서 나간다 (POST /rooms/:id/exit, 요청 본문 없음). 모집중이 아니면 [ApiException](400).
  Future<void> exit({required String accessToken, required int id});

  /// 방을 생성한다 (POST /rooms). 생성자는 방장으로 자동 참가된다.
  ///
  /// [startOn]은 서버 형식 'YYYY-MM-DD HH:mm:ss'(KST). 서버가 미래 시각·정원≥2·
  /// 진행중 방 1개 제한 등을 검증하므로 위반 시 [ApiException]을 던진다.
  /// (현재 서버 응답에 생성된 방 id가 없어 반환값은 없다.)
  Future<void> create({
    required String accessToken,
    required String title,
    required int goalDistanceMeter,
    required int goalLimitMinutes,
    required String startOn,
    required int capacity,
  });
}

/// core-api 방 API 구현 (GET/POST /rooms).
class HttpRoomApi implements RoomApi {
  HttpRoomApi({ApiClient? client}) : _client = client ?? ApiClient();
  final ApiClient _client;

  @override
  Future<List<RoomListItem>> list({required String accessToken}) async {
    final json = await _client.get('/rooms', token: accessToken);
    final data = json['data'] as Map<String, dynamic>;
    final items = (data['items'] as List<dynamic>? ?? const [])
        .map((e) => RoomListItem.fromJson(e as Map<String, dynamic>))
        .toList();
    return items;
  }

  @override
  Future<RoomDetail> retrieve({required String accessToken, required int id}) async {
    final json = await _client.get('/rooms/$id', token: accessToken);
    final data = json['data'] as Map<String, dynamic>;
    return RoomDetail.fromJson(data);
  }

  @override
  Future<void> join({required String accessToken, required int id}) async {
    await _client.post('/rooms/$id/join', token: accessToken);
  }

  @override
  Future<void> exit({required String accessToken, required int id}) async {
    await _client.post('/rooms/$id/exit', token: accessToken);
  }

  @override
  Future<void> create({
    required String accessToken,
    required String title,
    required int goalDistanceMeter,
    required int goalLimitMinutes,
    required String startOn,
    required int capacity,
  }) async {
    await _client.post('/rooms', token: accessToken, body: {
      'title': title,
      'goalDistanceMeter': goalDistanceMeter,
      'goalLimitMinutes': goalLimitMinutes,
      'startOn': startOn,
      'capacity': capacity,
    });
  }
}

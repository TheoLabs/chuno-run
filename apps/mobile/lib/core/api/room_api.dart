import 'api_client.dart';

/// core-api Room 목록 항목 — GET /rooms 의 `data.items[]` 한 건.
///
/// 서버는 참여 가능한 방(모집중·마감·진행중)만 내려주며, 목표/제한/정원과 함께
/// 현재 참가 인원(currentParticipantCount)을 준다.
class RoomListItem {
  const RoomListItem({
    required this.id,
    required this.title,
    required this.goalDistanceMeter,
    required this.goalLimitMinutes,
    required this.startOn,
    required this.capacity,
    required this.status,
    required this.currentParticipantCount,
  });

  final int id;
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

  factory RoomListItem.fromJson(Map<String, dynamic> json) => RoomListItem(
        id: json['id'] as int,
        title: (json['title'] as String?) ?? '',
        goalDistanceMeter: (json['goalDistanceMeter'] as num?)?.toInt() ?? 0,
        goalLimitMinutes: (json['goalLimitMinutes'] as num?)?.toInt() ?? 0,
        startOn: DateTime.tryParse((json['startOn'] as String?) ?? '') ?? DateTime.now(),
        capacity: (json['capacity'] as num?)?.toInt() ?? 0,
        status: (json['status'] as String?) ?? '',
        currentParticipantCount: (json['currentParticipantCount'] as num?)?.toInt() ?? 0,
      );
}

/// 방 API 추상화 — 테스트에서 가짜 구현으로 교체할 수 있다.
abstract class RoomApi {
  /// 참여 가능한 방 목록을 반환한다 (GET /rooms).
  Future<List<RoomListItem>> list({required String accessToken});
}

/// core-api 방 API 구현 (GET /rooms).
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
}

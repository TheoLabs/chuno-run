import 'api_client.dart';

/// 내 러닝 통계 — GET /users/me/stats 의 `data`.
///
/// 서버가 집계해 내려주는 프로필 상단 통계값이다. 거리는 미터(m) 단위,
/// 완주율은 0~100 정수 퍼센트(이미 반올림됨)다.
class UserStats {
  const UserStats({
    required this.participatedRoomCount,
    required this.winCount,
    required this.totalRunningDistanceMeter,
    required this.completedRate,
  });

  /// 참가한 경주 수.
  final int participatedRoomCount;

  /// 우승(1위) 수.
  final int winCount;

  /// 총 달린 거리(미터). 화면에서는 km로 변환해 표시한다.
  final int totalRunningDistanceMeter;

  /// 완주율 — 0~100 정수 퍼센트. '%'를 붙여 그대로 표시한다.
  final int completedRate;

  factory UserStats.fromJson(Map<String, dynamic> json) => UserStats(
        participatedRoomCount: (json['participatedRoomCount'] as num?)?.toInt() ?? 0,
        winCount: (json['winCount'] as num?)?.toInt() ?? 0,
        totalRunningDistanceMeter:
            (json['totalRunningDistanceMeter'] as num?)?.toInt() ?? 0,
        completedRate: (json['completedRate'] as num?)?.toInt() ?? 0,
      );
}

/// 유저 통계 API 추상화 — 테스트에서 가짜 구현으로 교체할 수 있다.
abstract class UserStatsApi {
  /// 내 러닝 통계를 반환한다 (GET /users/me/stats). 실패 시 [ApiException].
  Future<UserStats> me({required String accessToken});
}

/// core-api 유저 통계 API 구현 (GET /users/me/stats).
class HttpUserStatsApi implements UserStatsApi {
  HttpUserStatsApi({ApiClient? client}) : _client = client ?? ApiClient();
  final ApiClient _client;

  @override
  Future<UserStats> me({required String accessToken}) async {
    final json = await _client.get('/users/me/stats', token: accessToken);
    final data = json['data'] as Map<String, dynamic>;
    return UserStats.fromJson(data);
  }
}

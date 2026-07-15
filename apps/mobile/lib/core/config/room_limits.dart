/// 방 조건(목표 거리·제한 시간)의 클라이언트 검증 상·하한 (기획 §8).
///
/// 서버(core-api)도 동일 범위를 강제하지만, 사용자에게 즉시 안내하기 위해
/// 방 생성/방 조건 변경 두 화면이 이 상수를 공유한다.
///
/// - 목표 거리: 입력·표시는 km(소수 1자리 = 100m 스텝), 전송/저장은 meter.
///   전송 시 `(km * 1000).round()` 로 환산한다 (goalDistanceMeter 100~100,000).
/// - 제한 시간: 분(int) 단위 그대로.
library;

/// 목표 거리 하한 — 0.1km(100m).
const double kGoalDistanceKmMin = 0.1;

/// 목표 거리 상한 — 100km.
const double kGoalDistanceKmMax = 100;

/// 제한 시간 하한 — 5분.
const int kGoalLimitMinutesMin = 5;

/// 제한 시간 상한 — 1,440분(24시간).
const int kGoalLimitMinutesMax = 1440;

/// 목표 거리(km) 안내 문구.
const String kGoalDistanceRangeMessage = '목표 거리는 0.1km ~ 100km 범위여야 해요';

/// 제한 시간(분) 안내 문구.
const String kGoalLimitRangeMessage = '제한 시간은 5분 ~ 24시간(1,440분) 범위여야 해요';

/// 목표 거리(km)가 허용 범위 안인지.
bool isGoalDistanceKmInRange(double km) =>
    km >= kGoalDistanceKmMin && km <= kGoalDistanceKmMax;

/// 제한 시간(분)이 허용 범위 안인지.
bool isGoalLimitMinutesInRange(int minutes) =>
    minutes >= kGoalLimitMinutesMin && minutes <= kGoalLimitMinutesMax;

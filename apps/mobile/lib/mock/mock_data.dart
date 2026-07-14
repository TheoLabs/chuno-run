import '../design_system/app_colors.dart';
import 'package:flutter/material.dart';

/// 방(경주) 상태 — Room.status 도메인과 동일.
enum RoomStatus { recruiting, ready, live, finished, cancelled }

/// 서버 status 문자열 → [RoomStatus]. 알 수 없는 값은 recruiting으로 처리한다.
RoomStatus roomStatusFromString(String? value) => switch (value) {
      'ready' => RoomStatus.ready,
      'live' => RoomStatus.live,
      'finished' => RoomStatus.finished,
      'cancelled' => RoomStatus.cancelled,
      _ => RoomStatus.recruiting,
    };

extension RoomStatusX on RoomStatus {
  String get label => switch (this) {
        RoomStatus.recruiting => '모집중',
        RoomStatus.ready => '모집 마감',
        RoomStatus.live => '진행중',
        RoomStatus.finished => '종료',
        RoomStatus.cancelled => '취소됨',
      };

  Color get color => switch (this) {
        RoomStatus.recruiting => AppColors.coral,
        RoomStatus.ready => AppColors.gold,
        RoomStatus.live => AppColors.success,
        RoomStatus.finished => AppColors.dMuted,
        RoomStatus.cancelled => AppColors.danger,
      };
}

/// 참가 결과 상태 — Participant.status 도메인과 동일.
enum EntryResult { finished, timeout, dnf }

class RoomSummary {
  const RoomSummary({
    required this.title,
    required this.goalMeter,
    required this.limitMinutes,
    required this.joined,
    required this.capacity,
    required this.status,
    this.id,
    this.liveElapsed,
    this.startTimeLabel,
    this.startsInLabel,
  });

  /// 서버 방 id. 목업 데이터에서는 null.
  final int? id;
  final String title;
  final int goalMeter;
  final int limitMinutes;
  final int joined;
  final int capacity;
  final RoomStatus status;
  final String? liveElapsed; // 진행중일 때 경과
  final String? startTimeLabel; // 예: 오전 7:00 (경주 시작 시각)
  final String? startsInLabel; // 예: 2시간 10분 후 (시작까지 남은 시간)

  String get goalLabel => '${(goalMeter / 1000).toStringAsFixed(goalMeter % 1000 == 0 ? 0 : 1)}km';
  String get limitLabel => '$limitMinutes분';
  String get peopleLabel => '$joined/$capacity';
}

class RaceEntry {
  const RaceEntry({
    required this.name,
    required this.distanceMeter,
    required this.rank,
    this.isMe = false,
    this.isHost = false,
    this.ready = true,
    this.result,
    this.finishLabel,
  });

  final String name;
  final int distanceMeter;
  final int rank;
  final bool isMe;
  final bool isHost;
  final bool ready;
  final EntryResult? result;
  final String? finishLabel;

  String get distanceLabel => '${(distanceMeter / 1000).toStringAsFixed(1)}km';
}

/// 앱 전역 목업 데이터.
class MockData {
  MockData._();

  static const String myNick = '런너';

  static const List<RoomSummary> rooms = [
    RoomSummary(
      title: '아침 5K 대결',
      goalMeter: 5000,
      limitMinutes: 30,
      joined: 2,
      capacity: 8,
      status: RoomStatus.recruiting,
      startTimeLabel: '오전 7:00',
      startsInLabel: '2시간 10분 후',
    ),
    RoomSummary(
      title: '퇴근런 챌린지',
      goalMeter: 3000,
      limitMinutes: 20,
      joined: 5,
      capacity: 6,
      status: RoomStatus.live,
      liveElapsed: '12:04',
    ),
    RoomSummary(
      title: '주말 10K 롱런',
      goalMeter: 10000,
      limitMinutes: 75,
      joined: 10,
      capacity: 10,
      status: RoomStatus.ready,
      startTimeLabel: '오전 8:30',
      startsInLabel: '곧 시작',
    ),
  ];

  static const RoomSummary lobbyRoom = RoomSummary(
    title: '아침 5K 대결',
    goalMeter: 5000,
    limitMinutes: 30,
    joined: 3,
    capacity: 8,
    status: RoomStatus.recruiting,
  );

  static const List<RaceEntry> lobbyParticipants = [
    RaceEntry(name: '런너', distanceMeter: 0, rank: 0, isMe: true, isHost: true),
    RaceEntry(name: '민지', distanceMeter: 0, rank: 0),
    RaceEntry(name: '준호', distanceMeter: 0, rank: 0, ready: false),
  ];

  // 실시간 레이스 스냅샷
  static const int raceGoalMeter = 5000;
  static const String raceRemaining = '24:37';
  static const int myDistanceMeter = 2800;
  static const String myPace = "5'42\"/km";
  static const int myRank = 2;

  static const List<RaceEntry> raceLeaderboard = [
    RaceEntry(name: '민지', distanceMeter: 3100, rank: 1),
    RaceEntry(name: '런너', distanceMeter: 2800, rank: 2, isMe: true),
    RaceEntry(name: '준호', distanceMeter: 2400, rank: 3),
  ];

  // 결과
  static const List<RaceEntry> resultRanking = [
    RaceEntry(name: '민지', distanceMeter: 5000, rank: 1, result: EntryResult.finished, finishLabel: '28:12'),
    RaceEntry(name: '런너', distanceMeter: 5000, rank: 2, isMe: true, result: EntryResult.finished, finishLabel: '29:47'),
    RaceEntry(name: '준호', distanceMeter: 4300, rank: 3, result: EntryResult.timeout, finishLabel: '시간초과'),
  ];

  // 프로필 통계
  static const int totalRaces = 12;
  static const int totalWins = 5;
  static const double totalDistanceKm = 48.2;
}

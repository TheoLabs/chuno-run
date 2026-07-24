import 'dart:async';

import 'package:socket_io_client/socket_io_client.dart' as io;

import '../config/app_config.dart';

/// 리더보드 한 줄 — 서버가 브로드캐스트하는 참가자 진행 상태.
class RaceEntry {
  const RaceEntry({
    required this.participantId,
    required this.userId,
    required this.nickname,
    required this.distanceMeter,
    required this.status,
    required this.rank,
    this.finalRank,
    this.profileImageUrl,
  });

  final int participantId;
  final int userId;
  final String nickname;
  final int distanceMeter;

  /// 'joined' | 'running' | 'finished' | 'dnf'
  final String status;

  /// 거리 기준 실시간 순위(완주자는 확정 등수).
  final int rank;

  /// 확정된 최종 등수. 완주·종료 전에는 null.
  final int? finalRank;

  final String? profileImageUrl;

  bool get isFinished => status == 'finished';
  bool get isDnf => status == 'dnf';

  factory RaceEntry.fromJson(Map<String, dynamic> json) => RaceEntry(
        participantId: (json['participantId'] as num?)?.toInt() ?? 0,
        userId: (json['userId'] as num?)?.toInt() ?? 0,
        nickname: (json['nickname'] as String?) ?? '',
        distanceMeter: (json['distanceMeter'] as num?)?.toInt() ?? 0,
        status: (json['status'] as String?) ?? '',
        rank: (json['rank'] as num?)?.toInt() ?? 0,
        finalRank: (json['finalRank'] as num?)?.toInt(),
        profileImageUrl: json['profileImageUrl'] as String?,
      );
}

/// 경주 상태 스냅샷 — 서버가 접속 시와 상태가 바뀔 때마다 통째로 내려준다.
class RaceSnapshot {
  const RaceSnapshot({
    required this.roomId,
    required this.title,
    required this.status,
    required this.goalDistanceMeter,
    required this.goalLimitMinutes,
    required this.startOn,
    required this.endsOn,
    required this.serverTime,
    required this.leaderboard,
  });

  final int roomId;
  final String title;

  /// 'recruiting' | 'ready' | 'live' | 'finished' | 'cancelled'
  final String status;
  final int goalDistanceMeter;
  final int goalLimitMinutes;

  /// 서버 기준 출발 시각.
  final DateTime startOn;

  /// 서버 기준 종료 시각(출발 + 제한 시간).
  final DateTime endsOn;

  /// 이 스냅샷을 만든 서버 시각. 클라이언트 시계와의 차이를 보정하는 기준점이다.
  final DateTime serverTime;

  final List<RaceEntry> leaderboard;

  bool get isLive => status == 'live';
  bool get isFinished => status == 'finished';
  bool get isCancelled => status == 'cancelled';

  RaceEntry? entryOf(int userId) {
    for (final entry in leaderboard) {
      if (entry.userId == userId) return entry;
    }
    return null;
  }

  factory RaceSnapshot.fromJson(Map<String, dynamic> json) {
    DateTime parse(String? value) => DateTime.tryParse(value ?? '') ?? DateTime.now();

    return RaceSnapshot(
      roomId: (json['roomId'] as num?)?.toInt() ?? 0,
      title: (json['title'] as String?) ?? '',
      status: (json['status'] as String?) ?? '',
      goalDistanceMeter: (json['goalDistanceMeter'] as num?)?.toInt() ?? 0,
      goalLimitMinutes: (json['goalLimitMinutes'] as num?)?.toInt() ?? 0,
      startOn: parse(json['startOn'] as String?),
      endsOn: parse(json['endsOn'] as String?),
      serverTime: parse(json['serverTime'] as String?),
      leaderboard: (json['leaderboard'] as List<dynamic>? ?? const [])
          .map((e) => RaceEntry.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

/// 경주 실시간 채널 클라이언트. (CH-20 · CH-22 · CH-23)
///
/// - 접속하면 서버가 곧바로 스냅샷을 보내준다. 재연결 때도 같은 경로로 리더보드가 복구된다.
/// - 내 누적 거리를 주기적으로 올려보내면 서버가 순위를 매겨 방 전원에게 뿌린다.
/// - 출발·종료 카운트다운은 스냅샷의 서버 시각(serverTime)과 기기 시계의 차이를 보정해 계산한다.
class RaceSocket {
  RaceSocket({required this.accessToken, required this.roomId});

  final String accessToken;
  final int roomId;

  io.Socket? _socket;

  final _snapshots = StreamController<RaceSnapshot>.broadcast();
  final _errors = StreamController<String>.broadcast();
  final _connection = StreamController<bool>.broadcast();

  /// 상태 스냅샷 스트림(진행 갱신·상태 전이·종료 모두 여기로 온다).
  Stream<RaceSnapshot> get snapshots => _snapshots.stream;

  /// 서버가 보낸 오류 메시지.
  Stream<String> get errors => _errors.stream;

  /// 연결 여부 변화. 화면 상단의 '재연결 중' 표시에 쓴다.
  Stream<bool> get connection => _connection.stream;

  /// 서버 시각 − 기기 시각. 카운트다운은 이 값으로 보정한다.
  Duration _clockOffset = Duration.zero;

  /// 마지막으로 서버에 보낸 누적 거리. 재연결 직후 재동기화에 쓴다.
  int _lastSentDistanceMeter = 0;

  bool get isConnected => _socket?.connected ?? false;

  /// 서버 시각 기준 현재 시각(기기 시계 오차 보정).
  DateTime get serverNow => DateTime.now().add(_clockOffset);

  void connect() {
    if (_socket != null) {
      return;
    }

    final socket = io.io(
      '${AppConfig.apiBaseUrl}/races',
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': accessToken, 'roomId': '$roomId'})
          // 끊기면 자동으로 다시 붙는다 — 러닝 중 네트워크 단절 복구(CH-22).
          .enableReconnection()
          .setReconnectionDelay(1000)
          .setReconnectionDelayMax(5000)
          .build(),
    );

    socket.onConnect((_) {
      _connection.add(true);
      // 재연결이면 끊긴 사이 쌓인 거리를 즉시 다시 올려 서버 상태를 복구한다.
      if (_lastSentDistanceMeter > 0) {
        socket.emit('race:progress', {'distanceMeter': _lastSentDistanceMeter});
      }
      socket.emit('race:sync');
    });

    socket.onDisconnect((_) => _connection.add(false));
    socket.on('race:state', _handleSnapshot);
    socket.on('race:finished', _handleSnapshot);
    socket.on('race:error', (data) {
      final message = data is Map ? data['message']?.toString() : data?.toString();
      _errors.add(message ?? '경주 연결에 문제가 생겼어요.');
    });

    _socket = socket;
  }

  void _handleSnapshot(dynamic data) {
    if (data is! Map) {
      return;
    }

    final snapshot = RaceSnapshot.fromJson(Map<String, dynamic>.from(data));
    _clockOffset = snapshot.serverTime.difference(DateTime.now());
    _snapshots.add(snapshot);
  }

  /// 누적 거리를 서버에 올린다. 값이 그대로면 보내지 않는다(불필요한 트래픽 억제).
  /// [elapsedSeconds]는 출발 이후 경과 시간 — 서버가 타임스탬프 정합성 검사에 쓴다(2차).
  void sendProgress(int distanceMeter, {int? elapsedSeconds}) {
    if (distanceMeter == _lastSentDistanceMeter) {
      return;
    }

    _lastSentDistanceMeter = distanceMeter;
    _socket?.emit('race:progress', {
      'distanceMeter': distanceMeter,
      if (elapsedSeconds != null) 'elapsedSeconds': elapsedSeconds,
    });
  }

  /// 목표 도달을 알린다. 등수는 이 신호의 **서버 도착 순서**로 확정된다.
  void sendReachGoal(int distanceMeter) {
    _lastSentDistanceMeter = distanceMeter;
    _socket?.emit('race:reach-goal', {'distanceMeter': distanceMeter});
  }

  /// 경주를 포기한다. 완주자 뒤, 지금까지 달린 거리순으로 기록된다.
  void sendQuit() => _socket?.emit('race:quit');

  Future<void> dispose() async {
    _socket?.dispose();
    _socket = null;
    await _snapshots.close();
    await _errors.close();
    await _connection.close();
  }
}

import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/auth/auth_service.dart';
import '../../core/location/location_service.dart';
import '../../core/location/run_tracker.dart';
import '../../core/race/local_race_progress.dart';
import '../../core/race/race_socket.dart';
import '../../design_system/app_colors.dart';
import '../../design_system/app_dimens.dart';
import '../../design_system/app_palette.dart';
import '../../design_system/widgets.dart';

/// 실시간 경주 화면. (CH-19 · CH-20 · CH-22 · CH-23 · CH-25)
///
/// 흐름: 기기 GPS 로 누적 거리를 계산([RunTracker]) → WebSocket 으로 서버에 올림([RaceSocket])
/// → 서버가 방 전원의 순위를 매겨 브로드캐스트 → 리더보드 렌더.
/// 목표에 닿으면 도달 이벤트를 보내고, 서버가 **도착 순서**로 등수를 확정한다.
///
/// 남은 시간은 스냅샷의 서버 시각으로 보정해 계산하므로 기기 시계가 틀려도 전원이 같은 시점에 끝난다.
class RaceScreen extends StatefulWidget {
  const RaceScreen({super.key, this.roomId});

  final int? roomId;

  @override
  State<RaceScreen> createState() => _RaceScreenState();
}

class _RaceScreenState extends State<RaceScreen> {
  RaceSocket? _socket;
  RunTracker? _tracker;
  Timer? _ticker;
  Timer? _progressSender;

  final _subscriptions = <StreamSubscription<dynamic>>[];

  RaceSnapshot? _snapshot;
  RunProgress? _progress;
  bool _connected = false;
  bool _navigated = false;
  bool _voidHandled = false;
  String? _error;

  /// 내 진행값을 서버로 올리는 주기. 지연 목표(3초)를 지키면서 트래픽을 아낀다.
  static const _sendInterval = Duration(seconds: 2);

  int get _myUserId => AuthService.instance.user?.id ?? 0;

  @override
  void initState() {
    super.initState();
    _start();
  }

  @override
  void dispose() {
    for (final subscription in _subscriptions) {
      subscription.cancel();
    }
    _ticker?.cancel();
    _progressSender?.cancel();
    _tracker?.dispose();
    _socket?.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    final roomId = widget.roomId;
    final token = AuthService.instance.accessToken;

    if (roomId == null || token == null) {
      setState(() => _error = '경주 정보를 찾을 수 없어요.');
      return;
    }

    // 위치 권한은 서비스의 전제 — 없으면 경주를 시작하지 않고 안내 화면으로 보낸다.
    final access = await LocationService.instance.request();
    if (!mounted) return;

    if (access != LocationAccess.granted) {
      Navigator.of(context).pushReplacementNamed('/location-denied');
      return;
    }

    final socket = RaceSocket(accessToken: token, roomId: roomId);
    _socket = socket;

    _subscriptions.add(socket.snapshots.listen(_onSnapshot));
    _subscriptions.add(socket.connection.listen((connected) {
      if (mounted) setState(() => _connected = connected);
    }));
    _subscriptions.add(socket.errors.listen((message) {
      if (mounted) setState(() => _error = message);
    }));

    socket.connect();

    // 남은 시간 표시를 1초마다 갱신한다(서버 시각 보정 기준).
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  void _onSnapshot(RaceSnapshot snapshot) {
    if (!mounted) return;

    setState(() => _snapshot = snapshot);

    // [2차] 부정행위 탐지로 내 기록이 무효(dnf) 처리됐으면 안내 후 종료로 보낸다.
    final mine = snapshot.entryOf(_myUserId);
    if (snapshot.isLive && mine != null && mine.isDnf && !_voidHandled) {
      _voidHandled = true;
      _showVoidNotice(snapshot);
      return;
    }

    if (snapshot.isLive) {
      _ensureTracking(snapshot);
      return;
    }

    if (snapshot.isFinished || snapshot.isCancelled) {
      _goToResult(snapshot);
    }
  }

  /// 기록 무효 안내 — 계정에는 영향이 없음을 알리고 결과 화면으로 보낸다.
  Future<void> _showVoidNotice(RaceSnapshot snapshot) async {
    await _tracker?.stop();
    _progressSender?.cancel();
    await LocalRaceProgressStore.instance.clear();
    if (!mounted) return;

    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Text('이 경주 기록이 무효 처리됐어요'),
        content: const Text('이동 패턴이 러닝으로 보기 어려워 기록이 미완주로 처리됩니다. 계정에는 영향이 없어요.'),
        actions: [
          FilledButton(onPressed: () => Navigator.pop(ctx), child: const Text('확인')),
        ],
      ),
    );

    if (!mounted) return;
    Navigator.of(context).pushReplacementNamed('/result', arguments: snapshot.roomId);
  }

  /// 경주가 live 가 된 뒤 GPS 추적을 시작한다(이미 돌고 있으면 아무 일도 하지 않는다).
  void _ensureTracking(RaceSnapshot snapshot) {
    if (_tracker != null) return;

    final tracker = RunTracker(goalDistanceMeter: snapshot.goalDistanceMeter);
    _tracker = tracker;

    // 재접속이라면 서버가 기억하는 내 거리에서 이어서 누적한다(CH-22).
    final mine = snapshot.entryOf(_myUserId);

    tracker.onGoalReached = (progress) => _socket?.sendReachGoal(progress.distanceMeter);
    _subscriptions.add(tracker.progress.listen((progress) {
      if (mounted) setState(() => _progress = progress);
    }));

    tracker.start(
      resumeFromMeter: (mine?.distanceMeter ?? 0).toDouble(),
      startedAt: snapshot.startOn,
    );

    _progressSender = Timer.periodic(_sendInterval, (_) {
      final current = _tracker?.current;
      if (current == null) return;
      // 경과 시간을 함께 보내 서버 타임스탬프 정합성 검사를 돕고(2차), 기기에 진행을 보관해 복귀에 대비한다.
      _socket?.sendProgress(current.distanceMeter, elapsedSeconds: current.elapsed.inSeconds);
      LocalRaceProgressStore.instance.save(LocalRaceProgress(
        roomId: snapshot.roomId,
        distanceMeter: current.distanceMeter,
        savedAt: DateTime.now().toIso8601String(),
      ));
    });
  }

  void _goToResult(RaceSnapshot snapshot) {
    if (_navigated) return;
    _navigated = true;

    _tracker?.stop();
    _progressSender?.cancel();
    // 경주가 끝났으니 복귀용 기기 보관 기록은 정리한다(2차).
    LocalRaceProgressStore.instance.clear();

    Navigator.of(context).pushReplacementNamed(
      snapshot.isCancelled ? '/race-cancelled' : '/result',
      arguments: snapshot.roomId,
    );
  }

  Future<void> _confirmQuit() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('경주를 포기할까요?'),
        content: const Text('포기하면 완주자 뒤, 지금까지 달린 거리순으로 기록됩니다.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('계속 달리기')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: context.palette.danger),
            child: const Text('포기'),
          ),
        ],
      ),
    );

    if (ok != true || !mounted) return;

    _socket?.sendQuit();
    await _tracker?.stop();
    _progressSender?.cancel();

    if (!mounted) return;
    Navigator.of(context).pushReplacementNamed('/result', arguments: widget.roomId);
  }

  /// 남은 시간 — 서버 시각 기준. 아직 출발 전이면 출발까지 남은 시간을 센다.
  Duration get _remaining {
    final snapshot = _snapshot;
    final socket = _socket;
    if (snapshot == null || socket == null) return Duration.zero;

    final target = snapshot.isLive ? snapshot.endsOn : snapshot.startOn;
    final diff = target.difference(socket.serverNow);

    return diff.isNegative ? Duration.zero : diff;
  }

  String _clock(Duration d) {
    String two(int n) => n.toString().padLeft(2, '0');
    final h = d.inHours;
    final m = d.inMinutes % 60;
    final s = d.inSeconds % 60;
    return h > 0 ? '$h:${two(m)}:${two(s)}' : '${two(m)}:${two(s)}';
  }

  String _paceLabel(int? paceSecondsPerKm) {
    if (paceSecondsPerKm == null) return "--'--\"/km";
    String two(int n) => n.toString().padLeft(2, '0');
    return "${paceSecondsPerKm ~/ 60}'${two(paceSecondsPerKm % 60)}\"/km";
  }

  String _km(int meter) => (meter / 1000).toStringAsFixed(2);

  @override
  Widget build(BuildContext context) {
    final snapshot = _snapshot;

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: Text(snapshot == null ? '경주 준비 중' : '경기 중 · ${snapshot.title}'),
      ),
      body: SafeArea(
        child: snapshot == null ? _waiting(context) : _content(context, snapshot),
      ),
    );
  }

  Widget _waiting(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (_error == null) ...[
            const CircularProgressIndicator(),
            const SizedBox(height: AppDimens.lg),
            Text('경주에 연결하는 중…',
                style: context.text.bodyMedium?.copyWith(color: context.palette.muted)),
          ] else ...[
            Icon(Icons.wifi_off, size: 36, color: context.palette.danger),
            const SizedBox(height: AppDimens.md),
            Text(_error!, textAlign: TextAlign.center, style: context.text.bodyMedium),
            const SizedBox(height: AppDimens.lg),
            OutlinedButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('돌아가기'),
            ),
          ],
        ],
      ),
    );
  }

  Widget _content(BuildContext context, RaceSnapshot snapshot) {
    return Column(
      children: [
        if (!_connected) _reconnectingBanner(context),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(AppDimens.screenPad),
            children: [
              _myCard(context, snapshot),
              const SizedBox(height: AppDimens.lg),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('실시간 순위', style: context.text.titleMedium),
                  _liveTag(context, snapshot),
                ],
              ),
              const SizedBox(height: AppDimens.sm),
              for (final entry in snapshot.leaderboard)
                _leaderboardRow(context, snapshot, entry),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(
              AppDimens.screenPad, 0, AppDimens.screenPad, AppDimens.lg),
          child: SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: snapshot.isLive ? _confirmQuit : null,
              style: OutlinedButton.styleFrom(
                foregroundColor: context.palette.danger,
                side: BorderSide(color: context.palette.danger.withValues(alpha: 0.5)),
              ),
              child: const Text('경주 포기'),
            ),
          ),
        ),
      ],
    );
  }

  /// 네트워크가 끊긴 동안 띄우는 배너. 거리는 기기에서 계속 누적되고, 재연결 시 서버로 재동기화된다.
  Widget _reconnectingBanner(BuildContext context) {
    return Container(
      width: double.infinity,
      color: context.palette.danger.withValues(alpha: 0.18),
      padding: const EdgeInsets.symmetric(
          horizontal: AppDimens.screenPad, vertical: AppDimens.sm),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 12,
            height: 12,
            child: CircularProgressIndicator(strokeWidth: 2, color: context.palette.danger),
          ),
          const SizedBox(width: AppDimens.sm),
          Text('재연결 중 · 기록은 계속 쌓이고 있어요',
              style: context.text.labelMedium?.copyWith(color: context.palette.danger)),
        ],
      ),
    );
  }

  Widget _liveTag(BuildContext context, RaceSnapshot snapshot) {
    final p = context.palette;

    if (!snapshot.isLive) {
      return Text('경기 종료', style: context.text.labelMedium?.copyWith(color: p.muted));
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.circle, size: 8, color: p.success),
        const SizedBox(width: 5),
        Text(
          'LIVE · 목표 ${_km(snapshot.goalDistanceMeter)}km',
          style: context.text.labelMedium
              ?.copyWith(color: p.success, fontWeight: FontWeight.w600),
        ),
      ],
    );
  }

  Widget _myCard(BuildContext context, RaceSnapshot snapshot) {
    final scheme = context.scheme;
    // GPS 추적값이 우선. 아직 시작 전이면 서버가 아는 내 거리를 보여준다.
    final distanceMeter = _progress?.distanceMeter ?? snapshot.entryOf(_myUserId)?.distanceMeter ?? 0;
    final progress = snapshot.goalDistanceMeter <= 0
        ? 0.0
        : (distanceMeter / snapshot.goalDistanceMeter).clamp(0.0, 1.0);
    final myRank = snapshot.entryOf(_myUserId)?.rank;

    return Container(
      padding: const EdgeInsets.all(AppDimens.xl),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF26262B), Color(0xFF201B18)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(AppDimens.radiusLg),
        border: Border.all(color: scheme.primary.withValues(alpha: 0.4)),
      ),
      child: Column(
        children: [
          Text(
            '내 거리 · 목표 ${_km(snapshot.goalDistanceMeter)}km',
            style: context.text.labelMedium?.copyWith(color: Colors.white70),
          ),
          const SizedBox(height: AppDimens.sm),
          Text.rich(
            TextSpan(
              text: _km(distanceMeter),
              style: context.text.displaySmall?.copyWith(fontSize: 40, color: Colors.white),
              children: [
                TextSpan(
                  text: ' km',
                  style: context.text.titleMedium?.copyWith(color: Colors.white70),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppDimens.md),
          ClipRRect(
            borderRadius: BorderRadius.circular(AppDimens.radiusPill),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 8,
              backgroundColor: Colors.white.withValues(alpha: 0.14),
              valueColor: AlwaysStoppedAnimation(scheme.primary),
            ),
          ),
          const SizedBox(height: AppDimens.md),
          Text(
            snapshot.isLive
                ? '페이스 ${_paceLabel(_progress?.paceSecondsPerKm)} · 남은 ${_clock(_remaining)}'
                : '출발까지 ${_clock(_remaining)}',
            style: context.text.bodyMedium?.copyWith(color: Colors.white70),
          ),
          if (myRank != null) ...[
            const SizedBox(height: 4),
            Text('현재 $myRank위',
                style: context.text.labelLarge?.copyWith(color: scheme.primary)),
          ],
          // GPS 튐/정지 드리프트로 걸러낸 지점 수 — 측정 품질을 사용자에게 투명하게 보여준다(CH-63).
          if (snapshot.isLive && (_progress?.droppedSamples ?? 0) > 0) ...[
            const SizedBox(height: 4),
            Text('GPS 보정 · 걸러낸 지점 ${_progress!.droppedSamples}개',
                style: context.text.labelSmall?.copyWith(color: Colors.white54)),
          ],
        ],
      ),
    );
  }

  Widget _leaderboardRow(BuildContext context, RaceSnapshot snapshot, RaceEntry entry) {
    final p = context.palette;
    final scheme = context.scheme;
    final isMe = entry.userId == _myUserId;
    // 내 행은 서버 왕복을 기다리지 않고 방금 측정한 거리를 곧바로 보여준다.
    final distanceMeter = isMe ? (_progress?.distanceMeter ?? entry.distanceMeter) : entry.distanceMeter;
    final progress = snapshot.goalDistanceMeter <= 0
        ? 0.0
        : (distanceMeter / snapshot.goalDistanceMeter).clamp(0.0, 1.0);

    return Container(
      margin: const EdgeInsets.only(bottom: AppDimens.sm),
      padding: const EdgeInsets.symmetric(
          horizontal: AppDimens.md, vertical: AppDimens.md),
      decoration: BoxDecoration(
        color: isMe ? scheme.primary.withValues(alpha: 0.12) : Colors.transparent,
        borderRadius: BorderRadius.circular(AppDimens.radius),
        border: Border.all(color: isMe ? scheme.primary : p.outline),
      ),
      child: Column(
        children: [
          Row(
            children: [
              SizedBox(
                width: 20,
                child: Text(
                  '${entry.rank}',
                  textAlign: TextAlign.center,
                  style: context.text.titleMedium
                      ?.copyWith(color: entry.rank == 1 ? p.gold : p.muted),
                ),
              ),
              const SizedBox(width: AppDimens.sm),
              AvatarCircle(entry.nickname.isEmpty ? '?' : entry.nickname, size: 28),
              const SizedBox(width: AppDimens.sm),
              Expanded(
                child: Row(
                  children: [
                    Flexible(
                      child: Text(entry.nickname,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: context.text.titleMedium),
                    ),
                    if (isMe) ...[
                      const SizedBox(width: 6),
                      const StatusPill('나', accent: AppColors.coral),
                    ],
                    if (entry.isFinished) ...[
                      const SizedBox(width: 6),
                      StatusPill('완주', accent: p.success),
                    ] else if (entry.isDnf) ...[
                      const SizedBox(width: 6),
                      StatusPill('포기', accent: p.muted),
                    ],
                  ],
                ),
              ),
              Text('${_km(distanceMeter)} km', style: context.text.labelLarge),
            ],
          ),
          const SizedBox(height: AppDimens.sm),
          ClipRRect(
            borderRadius: BorderRadius.circular(AppDimens.radiusPill),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 6,
              backgroundColor: p.surfaceHigh,
              valueColor: AlwaysStoppedAnimation(
                entry.isFinished ? p.success : (isMe ? scheme.primary : p.muted),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

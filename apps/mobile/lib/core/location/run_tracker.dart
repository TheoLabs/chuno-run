import 'dart:async';

import 'package:geolocator/geolocator.dart';

import 'location_service.dart';

/// 러닝 진행 상태 한 스냅샷.
class RunProgress {
  const RunProgress({
    required this.distanceMeter,
    required this.elapsed,
    required this.paceSecondsPerKm,
    this.droppedSamples = 0,
  });

  /// 누적 이동 거리(m). 서버에는 이 값만 보낸다(원시 좌표는 보존하지 않는다).
  final int distanceMeter;

  /// 출발부터 지금까지 흐른 시간.
  final Duration elapsed;

  /// 평균 페이스(초/km). 아직 계산할 만큼 뛰지 않았으면 null.
  final int? paceSecondsPerKm;

  /// GPS 튐/정지 드리프트로 버린 표본 수(누적). 품질 표시·디버깅용. (CH-63)
  final int droppedSamples;

  /// 목표 대비 진행률(0.0~1.0).
  double progressOf(int goalDistanceMeter) =>
      goalDistanceMeter <= 0 ? 0 : (distanceMeter / goalDistanceMeter).clamp(0.0, 1.0);
}

/// GPS 스트림으로 이동 거리를 누적하고 페이스를 산출한다. (CH-19)
///
/// 판정 모델이 **서버 릴레이**라 목표 도달 판정도 여기(클라이언트)서 한다 — 누적 거리가 목표에
/// 닿는 순간 [onGoalReached] 가 한 번 호출된다. 서버는 그 도착 순서로 등수만 확정한다.
///
/// 정확도가 나쁜 표본은 버리고, 아주 짧은 이동은 무시해 GPS 지터가 거리에 누적되지 않게 한다.
/// (본격적인 GPS 튐 보정은 2차 범위다.)
class RunTracker {
  RunTracker({
    required this.goalDistanceMeter,
    LocationService? locationService,
  }) : _locationService = locationService ?? LocationService.instance;

  final int goalDistanceMeter;
  final LocationService _locationService;

  /// 이보다 정확도가 나쁜(오차 반경이 큰) 표본은 버린다.
  static const double _maxAccuracyMeter = 50;

  /// 이보다 짧은 이동은 GPS 지터로 보고 누적하지 않는다.
  static const double _minStepMeter = 2;

  /// 한 표본에서 이보다 멀리 뛴 것으로 나오면 튄 값으로 보고 버린다(순간이동 방지).
  static const double _maxStepMeter = 200;

  /// 이보다 빠른 순간 속도(m/s)로 나오면 GPS 튐으로 보고 버린다(약 45km/h). 서버 재검증과 별개로
  /// 클라이언트 누적 거리의 정확도를 지키는 완충이다. (CH-63)
  static const double _maxSpeedMps = 12.5;

  StreamSubscription<Position>? _subscription;
  Timer? _ticker;
  Position? _lastPosition;
  DateTime? _lastFixOn;
  DateTime? _startedAt;
  double _distanceMeter = 0;
  int _droppedSamples = 0;
  bool _goalReported = false;

  /// GPS 튐/정지 드리프트로 버린 표본 수(누적). (CH-63)
  int get droppedSamples => _droppedSamples;

  final _controller = StreamController<RunProgress>.broadcast();

  /// 진행 상태 스트림. 위치가 갱신될 때와 1초마다(경과 시간 갱신) 흘러나온다.
  Stream<RunProgress> get progress => _controller.stream;

  /// 목표 도달 순간 한 번 호출된다.
  void Function(RunProgress progress)? onGoalReached;

  RunProgress get current => _snapshot();

  bool get isRunning => _subscription != null;

  /// 추적을 시작한다. [resumeFromMeter] 를 주면 그 거리에서 이어서 누적한다(재접속 복구).
  void start({double resumeFromMeter = 0, DateTime? startedAt}) {
    if (_subscription != null) {
      return;
    }

    _distanceMeter = resumeFromMeter;
    _startedAt = startedAt ?? DateTime.now();
    _goalReported = _distanceMeter >= goalDistanceMeter;
    _lastPosition = null;
    _lastFixOn = null;
    _droppedSamples = 0;

    _subscription = _locationService.watch().listen(_onPosition);
    // 멈춰 있어도 경과 시간·남은 시간이 흐르도록 1초마다 스냅샷을 낸다.
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) => _emit());
  }

  Future<void> stop() async {
    await _subscription?.cancel();
    _subscription = null;
    _ticker?.cancel();
    _ticker = null;
  }

  Future<void> dispose() async {
    await stop();
    await _controller.close();
  }

  void _onPosition(Position position) {
    if (position.accuracy > _maxAccuracyMeter) {
      _droppedSamples++;
      return;
    }

    final previous = _lastPosition;
    final previousFixOn = _lastFixOn;
    final now = DateTime.now();

    final step = previous == null ? 0.0 : _locationService.distanceBetween(previous, position);

    // 정지 드리프트 억제: 이동량이 두 표본의 정확도 반경 안이면 실제 이동이 아니라 GPS 흔들림으로 본다.
    // 기준 이동을 정확도에 맞춰 키워(최소 _minStepMeter) 서 있을 때 거리가 슬금슬금 늘지 않게 한다. (CH-63)
    final driftFloor = (previous == null)
        ? _minStepMeter
        : (((position.accuracy + previous.accuracy) / 2).clamp(_minStepMeter, _maxAccuracyMeter)).toDouble();

    // 기준점 자체는 위치가 확실한 표본으로만 갱신한다(튄 표본으로 기준을 오염시키지 않는다).
    if (previous == null) {
      _lastPosition = position;
      _lastFixOn = now;
      _emit();
      return;
    }

    // 순간이동/과속 표본은 버리고 기준점도 유지한다(다음 정상 표본과 비교되게).
    final seconds = previousFixOn == null ? 0 : now.difference(previousFixOn).inMilliseconds / 1000;
    final speed = seconds > 0 ? step / seconds : 0;
    if (step > _maxStepMeter || speed > _maxSpeedMps) {
      _droppedSamples++;
      return;
    }

    // 드리프트 이하 이동은 누적하지 않지만, 기준점은 최신으로 옮겨 오차가 쌓이지 않게 한다.
    if (step < driftFloor) {
      _droppedSamples++;
      _lastPosition = position;
      _lastFixOn = now;
      return;
    }

    _distanceMeter += step;
    _lastPosition = position;
    _lastFixOn = now;
    _emit();
  }

  void _emit() {
    final snapshot = _snapshot();
    _controller.add(snapshot);

    if (!_goalReported && snapshot.distanceMeter >= goalDistanceMeter) {
      _goalReported = true;
      onGoalReached?.call(snapshot);
    }
  }

  RunProgress _snapshot() {
    final elapsed = _startedAt == null ? Duration.zero : DateTime.now().difference(_startedAt!);
    final distanceMeter = _distanceMeter.round();

    // 100m 는 뛰어야 페이스가 의미 있는 값이 된다.
    final paceSecondsPerKm = distanceMeter >= 100 && elapsed.inSeconds > 0
        ? (elapsed.inSeconds / (distanceMeter / 1000)).round()
        : null;

    return RunProgress(
      distanceMeter: distanceMeter,
      elapsed: elapsed,
      paceSecondsPerKm: paceSecondsPerKm,
      droppedSamples: _droppedSamples,
    );
  }
}

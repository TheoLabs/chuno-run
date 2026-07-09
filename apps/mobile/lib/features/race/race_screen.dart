import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';

import '../../design_system/app_colors.dart';
import '../../design_system/app_dimens.dart';
import '../../design_system/app_palette.dart';
import '../../design_system/widgets.dart';

class _Runner {
  _Runner(this.name, this.distanceKm, {this.isMe = false});
  final String name;
  double distanceKm;
  final bool isMe;
}

class RaceScreen extends StatefulWidget {
  const RaceScreen({super.key});

  @override
  State<RaceScreen> createState() => _RaceScreenState();
}

class _RaceScreenState extends State<RaceScreen> {
  static const double _goalKm = 3.0;

  final Random _rng = Random();
  Timer? _timer;
  int _remaining = 1800; // 남은 시간(초)
  bool _finished = false;

  final List<_Runner> _runners = [
    _Runner('나', 0, isMe: true),
    _Runner('러너_김', 0.10),
    _Runner('러너_이', 0.05),
    _Runner('러너_박', 0.08),
  ];

  _Runner get _me => _runners.firstWhere((r) => r.isMe);
  List<_Runner> get _ranked =>
      [..._runners]..sort((a, b) => b.distanceKm.compareTo(a.distanceKm));

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _tick() {
    if (_finished) return;
    setState(() {
      if (_remaining > 0) _remaining--;
      for (final r in _runners) {
        if (r.distanceKm < _goalKm) {
          r.distanceKm =
              (r.distanceKm + _rng.nextDouble() * 0.06 + 0.01).clamp(0, _goalKm);
        }
      }
      if (_remaining <= 0 || _runners.every((r) => r.distanceKm >= _goalKm)) {
        _finished = true;
        _timer?.cancel();
      }
    });
  }

  String get _remainLabel {
    final m = _remaining ~/ 60, s = _remaining % 60;
    String two(int n) => n < 10 ? '0$n' : '$n';
    return '${two(m)}:${two(s)}';
  }

  String get _paceLabel => _me.distanceKm > 0.15 ? "5'20\"/km" : "--'--\"/km";

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
    if (ok == true && mounted) Navigator.of(context).pushReplacementNamed('/result');
  }

  @override
  Widget build(BuildContext context) {
    final ranked = _ranked;
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text('경기 중 · 아침 3km 대결'),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(AppDimens.screenPad),
                children: [
                  _myCard(context),
                  const SizedBox(height: AppDimens.md),
                  _mapPlaceholder(context),
                  const SizedBox(height: AppDimens.lg),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('실시간 순위', style: context.text.titleMedium),
                      _liveTag(context),
                    ],
                  ),
                  const SizedBox(height: AppDimens.sm),
                  for (var i = 0; i < ranked.length; i++) _lbRow(context, ranked[i], i + 1),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                  AppDimens.screenPad, 0, AppDimens.screenPad, AppDimens.lg),
              child: SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: _confirmQuit,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: context.palette.danger,
                    side: BorderSide(color: context.palette.danger.withValues(alpha: 0.5)),
                  ),
                  child: const Text('경주 포기'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _liveTag(BuildContext context) {
    final p = context.palette;
    if (_finished) {
      return Text('경기 종료',
          style: context.text.labelMedium?.copyWith(color: p.muted));
    }
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.circle, size: 8, color: p.success),
        const SizedBox(width: 5),
        Text('LIVE · 목표 3.0km',
            style: context.text.labelMedium?.copyWith(color: p.success, fontWeight: FontWeight.w600)),
      ],
    );
  }

  Widget _myCard(BuildContext context) {
    final scheme = context.scheme;
    final progress = (_me.distanceKm / _goalKm).clamp(0.0, 1.0);
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
          Text('내 거리 · 목표 3.0km',
              style: context.text.labelMedium?.copyWith(color: Colors.white70)),
          const SizedBox(height: AppDimens.sm),
          Text.rich(
            TextSpan(
              text: _me.distanceKm.toStringAsFixed(2),
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
          Text('페이스 $_paceLabel · 남은 $_remainLabel',
              style: context.text.bodyMedium?.copyWith(color: Colors.white70)),
        ],
      ),
    );
  }

  Widget _mapPlaceholder(BuildContext context) {
    return Container(
      height: 88,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: context.palette.surfaceHigh,
        borderRadius: BorderRadius.circular(AppDimens.radius),
        border: Border.all(color: context.palette.outline),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.map_outlined, size: 18, color: context.palette.muted),
          const SizedBox(width: 6),
          Text('지도 · 경로 (2차 예정)',
              style: context.text.labelMedium?.copyWith(color: context.palette.muted)),
        ],
      ),
    );
  }

  Widget _lbRow(BuildContext context, _Runner r, int rank) {
    final p = context.palette;
    final scheme = context.scheme;
    final finished = r.distanceKm >= _goalKm;
    final progress = (r.distanceKm / _goalKm).clamp(0.0, 1.0);
    return Container(
      margin: const EdgeInsets.only(bottom: AppDimens.sm),
      padding: const EdgeInsets.symmetric(horizontal: AppDimens.md, vertical: AppDimens.md),
      decoration: BoxDecoration(
        color: r.isMe ? scheme.primary.withValues(alpha: 0.12) : Colors.transparent,
        borderRadius: BorderRadius.circular(AppDimens.radius),
        border: Border.all(color: r.isMe ? scheme.primary : p.outline),
      ),
      child: Column(
        children: [
          Row(
            children: [
              SizedBox(
                width: 20,
                child: Text('$rank',
                    textAlign: TextAlign.center,
                    style: context.text.titleMedium?.copyWith(
                        color: rank == 1 ? p.gold : p.muted)),
              ),
              const SizedBox(width: AppDimens.sm),
              AvatarCircle(r.name, size: 28),
              const SizedBox(width: AppDimens.sm),
              Expanded(
                child: Row(
                  children: [
                    Flexible(
                      child: Text(r.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: context.text.titleMedium),
                    ),
                    if (r.isMe) ...[
                      const SizedBox(width: 6),
                      const StatusPill('나', accent: AppColors.coral),
                    ],
                    if (finished) ...[
                      const SizedBox(width: 6),
                      StatusPill('완주', accent: p.success),
                    ],
                  ],
                ),
              ),
              Text('${r.distanceKm.toStringAsFixed(2)} km',
                  style: context.text.labelLarge),
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
                  finished ? p.success : (r.isMe ? scheme.primary : p.muted)),
            ),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';

import '../../core/api/race_api.dart';
import '../../core/auth/auth_service.dart';
import '../../design_system/app_dimens.dart';
import '../../design_system/app_palette.dart';
import '../../design_system/widgets.dart';

/// 경주 이력 — GET /users/me/races 로 내가 참여했던 지난 경주를 최근순으로 보여준다. (CH-30)
///
/// 항목을 누르면 등수·거리·시간·페이스 상세가 펼쳐지고, '결과 보기'로 결과 화면에 들어간다.
class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key, this.raceApi});

  final RaceApi? raceApi;

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  late final RaceApi _raceApi = widget.raceApi ?? HttpRaceApi();

  final Set<int> _expanded = {};

  List<RaceHistoryItem> _items = const [];
  bool _loading = true;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final token = AuthService.instance.accessToken;

    if (token == null) {
      setState(() {
        _loading = false;
        _failed = true;
      });
      return;
    }

    setState(() {
      _loading = true;
      _failed = false;
    });

    try {
      final items = await _raceApi.history(accessToken: token);
      if (!mounted) return;
      setState(() {
        _items = items;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _failed = true;
      });
    }
  }

  String _km(int meter) => (meter / 1000).toStringAsFixed(2);

  String _goalLabel(int meter) =>
      '${(meter / 1000).toStringAsFixed(meter % 1000 == 0 ? 0 : 1)}km';

  String _duration(int? seconds) {
    if (seconds == null || seconds <= 0) return '--:--';
    String two(int n) => n.toString().padLeft(2, '0');
    final h = seconds ~/ 3600;
    final m = (seconds % 3600) ~/ 60;
    final s = seconds % 60;
    return h > 0 ? "$h:${two(m)}:${two(s)}" : "${two(m)}'${two(s)}\"";
  }

  String _pace(int? paceSecondsPerKm) {
    if (paceSecondsPerKm == null) return "--'--\"";
    String two(int n) => n.toString().padLeft(2, '0');
    return "${paceSecondsPerKm ~/ 60}'${two(paceSecondsPerKm % 60)}\"/km";
  }

  String _dateLabel(DateTime at) {
    String two(int n) => n.toString().padLeft(2, '0');
    return '${at.year}-${two(at.month)}-${two(at.day)} ${two(at.hour)}:${two(at.minute)}';
  }

  /// 우측 배지 — 취소된 경주 / 무효 / 미완주 / 등수.
  String _badge(RaceHistoryItem item) {
    if (item.isCancelled) return '취소됨';
    if (item.myVoided) return '무효';
    if (!item.didFinish) return '미완주';
    return item.myFinalRank == null ? '집계 중' : '${item.myFinalRank}위';
  }

  String _detail(RaceHistoryItem item) {
    if (item.isCancelled) {
      return '인원 미달 또는 운영 취소로 진행되지 않았어요';
    }

    if (item.myVoided) {
      return '무효(실격) · ${_km(item.myDistanceMeter)}km · 부정행위 탐지로 기록이 무효 처리됐어요';
    }

    if (!item.didFinish) {
      return '미완주 · ${_km(item.myDistanceMeter)}km / ${_goalLabel(item.goalDistanceMeter)}';
    }

    return '${item.myFinalRank ?? '-'}위 · ${_km(item.myDistanceMeter)}km · '
        '${_duration(item.myElapsedSeconds)} · 평균 ${_pace(item.myPaceSecondsPerKm)}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text('경주 이력'),
      ),
      body: SafeArea(child: _body(context)),
    );
  }

  Widget _body(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_failed) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('이력을 불러오지 못했어요',
                style: context.text.bodyMedium?.copyWith(color: context.palette.muted)),
            const SizedBox(height: AppDimens.sm),
            OutlinedButton(onPressed: _load, child: const Text('다시 시도')),
          ],
        ),
      );
    }

    if (_items.isEmpty) {
      return RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(AppDimens.screenPad),
          children: [
            const SizedBox(height: 120),
            Icon(Icons.directions_run, size: 40, color: context.palette.muted),
            const SizedBox(height: AppDimens.md),
            Text('아직 완료한 경주가 없어요',
                textAlign: TextAlign.center, style: context.text.titleMedium),
            const SizedBox(height: AppDimens.xs),
            Text('방에 참가해 첫 경주를 완주해 보세요.',
                textAlign: TextAlign.center,
                style: context.text.bodyMedium?.copyWith(color: context.palette.muted)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(AppDimens.screenPad),
        children: [
          Text('지난 경주 기록을 눌러 상세를 확인하세요',
              style: context.text.bodyMedium?.copyWith(color: context.palette.muted)),
          const SizedBox(height: AppDimens.lg),
          for (var i = 0; i < _items.length; i++) ...[
            _card(context, i, _items[i]),
            const SizedBox(height: AppDimens.md),
          ],
        ],
      ),
    );
  }

  Widget _card(BuildContext context, int index, RaceHistoryItem item) {
    final open = _expanded.contains(index);
    final dimmed = item.isCancelled || !item.didFinish;

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(AppDimens.radiusLg),
        onTap: () => setState(() => open ? _expanded.remove(index) : _expanded.add(index)),
        child: Padding(
          padding: const EdgeInsets.all(AppDimens.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Flexible(
                    child: Text(item.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: context.text.titleMedium),
                  ),
                  const SizedBox(width: AppDimens.sm),
                  StatusPill(
                    _badge(item),
                    accent: dimmed ? context.palette.muted : context.palette.gold,
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                '${_dateLabel(item.startOn)} · 목표 ${_goalLabel(item.goalDistanceMeter)} · ${item.participantCount}명',
                style: context.text.labelMedium?.copyWith(color: context.palette.muted),
              ),
              if (open) ...[
                const SizedBox(height: AppDimens.md),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(AppDimens.md),
                  decoration: BoxDecoration(
                    color: context.palette.surfaceHigh,
                    borderRadius: BorderRadius.circular(AppDimens.radius),
                  ),
                  child: Text(_detail(item), style: context.text.bodyMedium),
                ),
                if (!item.isCancelled) ...[
                  const SizedBox(height: AppDimens.sm),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context)
                          .pushNamed('/result', arguments: item.id),
                      child: const Text('결과 보기'),
                    ),
                  ),
                ],
              ],
            ],
          ),
        ),
      ),
    );
  }
}

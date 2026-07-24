import 'package:flutter/material.dart';

import '../../core/api/race_api.dart';
import '../../core/auth/auth_service.dart';
import '../../design_system/app_colors.dart';
import '../../design_system/app_dimens.dart';
import '../../design_system/app_palette.dart';
import '../../design_system/widgets.dart';

/// 경주 결과 화면 — GET /rooms/:id/result 로 최종 순위와 개인 기록을 보여준다. (CH-29)
///
/// [roomId]는 경주 화면에서 라우트 arguments(int)로 전달된다.
class ResultScreen extends StatefulWidget {
  const ResultScreen({super.key, this.roomId, this.raceApi});

  final int? roomId;
  final RaceApi? raceApi;

  @override
  State<ResultScreen> createState() => _ResultScreenState();
}

class _ResultScreenState extends State<ResultScreen> {
  late final RaceApi _raceApi = widget.raceApi ?? HttpRaceApi();

  RaceResult? _result;
  bool _loading = true;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final roomId = widget.roomId;
    final token = AuthService.instance.accessToken;

    if (roomId == null || token == null) {
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
      final result = await _raceApi.result(accessToken: token, roomId: roomId);
      if (!mounted) return;
      setState(() {
        _result = result;
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

  /// 목표 거리 라벨 — 딱 떨어지면 정수로(3km), 아니면 소수 1자리(3.5km).
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
    if (paceSecondsPerKm == null) return "--'--\"/km";
    String two(int n) => n.toString().padLeft(2, '0');
    return "${paceSecondsPerKm ~/ 60}'${two(paceSecondsPerKm % 60)}\"/km";
  }

  /// 완주자는 기록(시간), 미완주자는 달린 거리를 보여준다.
  String _record(RaceResultParticipant p) =>
      p.isFinished ? _duration(p.elapsedSeconds) : '${_km(p.distanceMeter)}km';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('경기 결과')),
      body: SafeArea(child: _body(context)),
    );
  }

  Widget _body(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    final result = _result;

    if (_failed || result == null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('결과를 불러오지 못했어요',
                style: context.text.bodyMedium?.copyWith(color: context.palette.muted)),
            const SizedBox(height: AppDimens.sm),
            OutlinedButton(onPressed: _load, child: const Text('다시 시도')),
          ],
        ),
      );
    }

    final p = context.palette;

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(AppDimens.screenPad),
        children: [
          Text(result.title, textAlign: TextAlign.center, style: context.text.titleLarge),
          const SizedBox(height: AppDimens.xs),
          Text(
            '목표 ${_goalLabel(result.goalDistanceMeter)} · 참가 ${result.participants.length}명 · ${result.isFinished ? '종료' : '집계 중'}',
            textAlign: TextAlign.center,
            style: context.text.bodyMedium?.copyWith(color: p.muted),
          ),
          const SizedBox(height: AppDimens.xl),
          if (result.participants.length >= 2) ...[
            _podium(context, result),
            const SizedBox(height: AppDimens.xl),
          ],
          _myRecordCard(context, result),
          const SizedBox(height: AppDimens.xl),
          Text('전체 순위', style: context.text.titleMedium),
          const SizedBox(height: AppDimens.sm),
          ...result.participants.map((participant) => _rankRow(context, participant)),
          const SizedBox(height: AppDimens.lg),
          FilledButton(
            onPressed: () =>
                Navigator.of(context).pushNamedAndRemoveUntil('/main', (route) => false),
            child: const Text('홈으로'),
          ),
        ],
      ),
    );
  }

  /// 시상대 — 1·2·3위. 참가자가 적으면 있는 만큼만 세운다.
  Widget _podium(BuildContext context, RaceResult result) {
    final p = context.palette;
    final top = result.participants.take(3).toList();

    RaceResultParticipant? at(int index) => index < top.length ? top[index] : null;

    final second = at(1);
    final first = at(0);
    final third = at(2);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(child: _podiumCol(context, second, 2, 64, const Color(0xFFB9BBC6))),
        Expanded(child: _podiumCol(context, first, 1, 96, p.gold)),
        Expanded(child: _podiumCol(context, third, 3, 46, AppColors.coralSoft)),
      ],
    );
  }

  Widget _podiumCol(
    BuildContext context,
    RaceResultParticipant? participant,
    int rank,
    double height,
    Color color,
  ) {
    if (participant == null) {
      return const SizedBox.shrink();
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          participant.isMe ? '나' : participant.nickname,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: context.text.labelMedium?.copyWith(color: context.palette.muted),
        ),
        const SizedBox(height: AppDimens.sm),
        Container(
          height: height,
          margin: const EdgeInsets.symmetric(horizontal: AppDimens.xs),
          alignment: Alignment.topCenter,
          padding: const EdgeInsets.only(top: AppDimens.sm),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.22),
            border: Border.all(color: color.withValues(alpha: 0.6)),
            borderRadius:
                const BorderRadius.vertical(top: Radius.circular(AppDimens.radius)),
          ),
          child: Text('${participant.finalRank ?? rank}',
              style: context.text.titleLarge?.copyWith(color: color)),
        ),
      ],
    );
  }

  Widget _myRecordCard(BuildContext context, RaceResult result) {
    final me = result.me;

    if (me == null) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(AppDimens.xl),
          child: Text('이 경주에 참가하지 않았어요',
              textAlign: TextAlign.center,
              style: context.text.bodyMedium?.copyWith(color: context.palette.muted)),
        ),
      );
    }

    final p = context.palette;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppDimens.xl),
        child: Column(
          children: [
            Text('내 기록',
                style: context.text.labelMedium?.copyWith(color: p.muted)),
            const SizedBox(height: AppDimens.xs),
            Text(
              me.voided
                  ? '무효 · ${_km(me.distanceMeter)}km'
                  : '${me.finalRank == null ? '집계 중' : '${me.finalRank}등'} · ${_km(me.distanceMeter)}km',
              style: context.text.headlineMedium?.copyWith(color: me.voided ? p.danger : null),
            ),
            const SizedBox(height: AppDimens.xs),
            Text(
              '기록 ${_duration(me.elapsedSeconds)} · 평균 페이스 ${_pace(me.paceSecondsPerKm)}',
              style: context.text.bodyMedium?.copyWith(color: p.muted),
            ),
            // 무효 처리 사유·안내 배너 — 계정에는 영향 없음을 재확인(CH-62).
            if (me.voided) ...[
              const SizedBox(height: AppDimens.md),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppDimens.md),
                decoration: BoxDecoration(
                  color: p.danger.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(AppDimens.radius),
                  border: Border.all(color: p.danger.withValues(alpha: 0.4)),
                ),
                child: Text(
                  '이동 패턴이 러닝으로 보기 어려워 이 경주 기록이 무효 처리됐어요. 계정에는 영향이 없습니다.',
                  style: context.text.bodySmall?.copyWith(color: p.danger),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _rankRow(BuildContext context, RaceResultParticipant participant) {
    final p = context.palette;
    final scheme = context.scheme;

    return Container(
      margin: const EdgeInsets.only(bottom: AppDimens.sm),
      padding:
          const EdgeInsets.symmetric(horizontal: AppDimens.md, vertical: AppDimens.md),
      decoration: BoxDecoration(
        color: participant.isMe
            ? scheme.primary.withValues(alpha: 0.12)
            : Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(AppDimens.radius),
        border: Border.all(color: participant.isMe ? scheme.primary : p.outline),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 22,
            child: Text(
              '${participant.finalRank ?? '-'}',
              textAlign: TextAlign.center,
              style: context.text.titleMedium?.copyWith(color: p.muted),
            ),
          ),
          const SizedBox(width: AppDimens.sm),
          Expanded(
            child: Row(
              children: [
                Flexible(
                  child: Text(participant.nickname,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: context.text.titleMedium),
                ),
                if (participant.isMe) ...[
                  const SizedBox(width: 6),
                  const StatusPill('나', accent: AppColors.coral),
                ],
                // 무효(실격)는 일반 미완주와 구분해 표시한다(CH-62).
                if (participant.voided) ...[
                  const SizedBox(width: 6),
                  StatusPill('무효', accent: p.danger),
                ] else if (!participant.isFinished) ...[
                  const SizedBox(width: 6),
                  StatusPill('미완주', accent: p.muted),
                ],
              ],
            ),
          ),
          Text(_record(participant), style: context.text.labelLarge),
        ],
      ),
    );
  }
}

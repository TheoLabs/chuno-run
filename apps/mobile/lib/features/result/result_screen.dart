import 'package:flutter/material.dart';

import '../../design_system/app_colors.dart';
import '../../design_system/app_dimens.dart';
import '../../design_system/app_palette.dart';
import '../../design_system/widgets.dart';

class _RankRow {
  const _RankRow(this.rank, this.name, this.record, {this.isMe = false, this.dnf = false});
  final int rank;
  final String name;
  final String record;
  final bool isMe;
  final bool dnf;
}

class ResultScreen extends StatelessWidget {
  const ResultScreen({super.key});

  static const List<_RankRow> _ranking = [
    _RankRow(1, '나', "15'42\"", isMe: true),
    _RankRow(2, '러너_김', "16'03\""),
    _RankRow(3, '러너_박', "17'20\""),
    _RankRow(4, '러너_이', '2.4km', dnf: true),
  ];

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Scaffold(
      appBar: AppBar(title: const Text('경기 결과')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppDimens.screenPad),
          children: [
            Text('아침 3km 대결',
                textAlign: TextAlign.center, style: context.text.titleLarge),
            const SizedBox(height: AppDimens.xs),
            Text('목표 3km · 참가 4명 · 종료',
                textAlign: TextAlign.center,
                style: context.text.bodyMedium?.copyWith(color: p.muted)),
            const SizedBox(height: AppDimens.xl),
            _podium(context),
            const SizedBox(height: AppDimens.xl),
            _myRecordCard(context),
            const SizedBox(height: AppDimens.xl),
            Text('전체 순위', style: context.text.titleMedium),
            const SizedBox(height: AppDimens.sm),
            ..._ranking.map((r) => _rankRow(context, r)),
            const SizedBox(height: AppDimens.lg),
            FilledButton(
              onPressed: () => ScaffoldMessenger.of(context)
                ..hideCurrentSnackBar()
                ..showSnackBar(const SnackBar(content: Text('결과 공유 (목업)'))),
              child: const Text('결과 공유'),
            ),
            const SizedBox(height: AppDimens.sm),
            TextButton(
              onPressed: () => Navigator.of(context)
                  .pushNamedAndRemoveUntil('/main', (route) => false),
              child: const Text('홈으로'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _podium(BuildContext context) {
    final p = context.palette;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(child: _podiumCol(context, '러너_김', 2, 64, const Color(0xFFB9BBC6))),
        Expanded(child: _podiumCol(context, '나', 1, 96, p.gold)),
        Expanded(child: _podiumCol(context, '러너_박', 3, 46, AppColors.coralSoft)),
      ],
    );
  }

  Widget _podiumCol(BuildContext context, String name, int rank, double height, Color color) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(name,
            style: context.text.labelMedium?.copyWith(color: context.palette.muted)),
        const SizedBox(height: AppDimens.sm),
        Container(
          height: height,
          margin: const EdgeInsets.symmetric(horizontal: AppDimens.xs),
          alignment: Alignment.topCenter,
          padding: const EdgeInsets.only(top: AppDimens.sm),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.22),
            border: Border.all(color: color.withValues(alpha: 0.6)),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(AppDimens.radius)),
          ),
          child: Text('$rank',
              style: context.text.titleLarge?.copyWith(color: color)),
        ),
      ],
    );
  }

  Widget _myRecordCard(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppDimens.xl),
        child: Column(
          children: [
            Text('내 기록',
                style: context.text.labelMedium?.copyWith(color: context.palette.muted)),
            const SizedBox(height: AppDimens.xs),
            Text('1등 · 3.00km', style: context.text.headlineMedium),
            const SizedBox(height: AppDimens.xs),
            Text('기록 15\'42" · 평균 페이스 5\'14"/km',
                style: context.text.bodyMedium?.copyWith(color: context.palette.muted)),
          ],
        ),
      ),
    );
  }

  Widget _rankRow(BuildContext context, _RankRow r) {
    final p = context.palette;
    final scheme = context.scheme;
    return Container(
      margin: const EdgeInsets.only(bottom: AppDimens.sm),
      padding: const EdgeInsets.symmetric(horizontal: AppDimens.md, vertical: AppDimens.md),
      decoration: BoxDecoration(
        color: r.isMe ? scheme.primary.withValues(alpha: 0.12) : Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(AppDimens.radius),
        border: Border.all(color: r.isMe ? scheme.primary : p.outline),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 22,
            child: Text('${r.rank}',
                textAlign: TextAlign.center,
                style: context.text.titleMedium?.copyWith(color: p.muted)),
          ),
          const SizedBox(width: AppDimens.sm),
          Expanded(
            child: Row(
              children: [
                Flexible(child: Text(r.name, style: context.text.titleMedium)),
                if (r.isMe) ...[
                  const SizedBox(width: 6),
                  const StatusPill('나', accent: AppColors.coral),
                ],
                if (r.dnf) ...[
                  const SizedBox(width: 6),
                  StatusPill('미완주', accent: p.muted),
                ],
              ],
            ),
          ),
          Text(r.record, style: context.text.labelLarge),
        ],
      ),
    );
  }
}

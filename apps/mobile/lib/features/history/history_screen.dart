import 'package:flutter/material.dart';

import '../../design_system/app_dimens.dart';
import '../../design_system/app_palette.dart';
import '../../design_system/widgets.dart';

class _HistoryItem {
  const _HistoryItem(this.title, this.badge, this.meta, this.detail, {this.dnf = false});
  final String title;
  final String badge;
  final String meta;
  final String detail;
  final bool dnf;
}

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  final Set<int> _expanded = {};

  static const List<_HistoryItem> _items = [
    _HistoryItem('아침 3km 대결', '1위', '2026-07-08 07:00 · 목표 3km',
        '1위 · 3.00km · 15\'42" · 평균 5\'14"/km'),
    _HistoryItem('퇴근런 5km', '3위', '2026-07-05 19:30 · 목표 5km',
        '3위 · 5.00km · 28\'05" · 평균 5\'37"/km'),
    _HistoryItem('주말 10km 롱런', '미완주', '2026-07-01 08:00 · 목표 10km',
        '미완주 · 6.4km/10km · 제한시간 만료', dnf: true),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text('경주 이력'),
      ),
      body: SafeArea(
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
      ),
    );
  }

  Widget _card(BuildContext context, int i, _HistoryItem it) {
    final open = _expanded.contains(i);
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(AppDimens.radiusLg),
        onTap: () => setState(() => open ? _expanded.remove(i) : _expanded.add(i)),
        child: Padding(
          padding: const EdgeInsets.all(AppDimens.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(it.title, style: context.text.titleMedium),
                  StatusPill(it.badge,
                      accent: it.dnf ? context.palette.muted : context.palette.gold),
                ],
              ),
              const SizedBox(height: 4),
              Text(it.meta,
                  style: context.text.labelMedium?.copyWith(color: context.palette.muted)),
              if (open) ...[
                const SizedBox(height: AppDimens.md),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(AppDimens.md),
                  decoration: BoxDecoration(
                    color: context.palette.surfaceHigh,
                    borderRadius: BorderRadius.circular(AppDimens.radius),
                  ),
                  child: Text(it.detail, style: context.text.bodyMedium),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

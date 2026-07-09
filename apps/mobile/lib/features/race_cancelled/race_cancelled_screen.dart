import 'package:flutter/material.dart';

import '../../design_system/app_dimens.dart';
import '../../design_system/app_palette.dart';
import '../../design_system/widgets.dart';

class RaceCancelledScreen extends StatelessWidget {
  const RaceCancelledScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(),
        title: const Text('대기실'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppDimens.screenPad),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 84,
                height: 84,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: p.danger.withValues(alpha: 0.16),
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.event_busy, color: p.danger, size: 42),
              ),
              const SizedBox(height: AppDimens.lg),
              Text('경주가 취소되었어요',
                  textAlign: TextAlign.center, style: context.text.titleLarge),
              const SizedBox(height: AppDimens.sm),
              Text(
                '시작 10분 전까지 참가자가 2명 미만이라 자동 취소되었습니다. 다른 방에 참여하거나 새 방을 만들어보세요.',
                textAlign: TextAlign.center,
                style: context.text.bodyMedium?.copyWith(color: p.muted),
              ),
              const SizedBox(height: AppDimens.lg),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(AppDimens.lg),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text('아침 5K 대결', style: context.text.titleMedium),
                      ),
                      const InfoChip('5.0km', icon: Icons.flag_outlined),
                      const SizedBox(width: 6),
                      StatusPill('취소됨', accent: p.danger),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppDimens.xl),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => Navigator.of(context)
                      .pushNamedAndRemoveUntil('/main', (route) => false),
                  child: const Text('확인'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

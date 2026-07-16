import 'package:flutter/material.dart';

import 'app_dimens.dart';
import 'app_palette.dart';

/// 섹션 제목 (+ 우측 보조 위젯).
class SectionLabel extends StatelessWidget {
  const SectionLabel(this.text, {super.key, this.trailing});

  final String text;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(text, style: context.text.titleMedium),
        if (trailing != null) trailing!,
      ],
    );
  }
}

/// 정보 칩 (목표 거리·시간·인원 등).
class InfoChip extends StatelessWidget {
  const InfoChip(this.label, {super.key, this.icon});

  final String label;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: p.surfaceHigh,
        borderRadius: BorderRadius.circular(AppDimens.radiusPill),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: p.muted),
            const SizedBox(width: 4),
          ],
          Text(label, style: context.text.labelMedium),
        ],
      ),
    );
  }
}

/// 상태 배지. [accent] 지정 + [solid]=true면 채움, 아니면 은은한 톤.
class StatusPill extends StatelessWidget {
  const StatusPill(this.label, {super.key, this.accent, this.solid = false});

  final String label;
  final Color? accent;
  final bool solid;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final c = accent ?? p.muted;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: solid ? c : c.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(AppDimens.radiusPill),
      ),
      child: Text(
        label,
        style: context.text.labelMedium?.copyWith(
          color: solid ? Colors.white : c,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

/// 이니셜 아바타.
class AvatarCircle extends StatelessWidget {
  const AvatarCircle(this.label, {super.key, this.size = 40, this.color});

  final String label;
  final double size;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: color ?? p.surfaceHigh,
        shape: BoxShape.circle,
      ),
      child: Text(
        label.characters.first,
        style: TextStyle(
          fontWeight: FontWeight.w700,
          fontSize: size * 0.4,
          color: color != null ? Colors.white : p.muted,
        ),
      ),
    );
  }
}

/// 지표 타일 (숫자 + 라벨).
class StatTile extends StatelessWidget {
  const StatTile({super.key, required this.value, required this.label, this.valueSuffix});

  final String value;
  final String label;

  /// 값 뒤에 붙는 접미사(예: '%'). 지정하면 값보다 한 단계 작은 폰트로 표시한다.
  final String? valueSuffix;

  @override
  Widget build(BuildContext context) {
    final valueStyle = context.text.titleLarge;
    final suffix = valueSuffix;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: AppDimens.md),
      decoration: BoxDecoration(
        border: Border.all(color: context.palette.outline),
        borderRadius: BorderRadius.circular(AppDimens.radius),
      ),
      child: Column(
        children: [
          if (suffix == null)
            Text(value, style: valueStyle)
          else
            Text.rich(
              TextSpan(
                text: value,
                style: valueStyle,
                // 접미사만 한 단계 작은 스케일(titleMedium)로 — 숫자 크기는 그대로.
                children: [TextSpan(text: suffix, style: context.text.titleMedium)],
              ),
            ),
          const SizedBox(height: 2),
          Text(
            label,
            style: context.text.labelMedium?.copyWith(color: context.palette.muted),
          ),
        ],
      ),
    );
  }
}

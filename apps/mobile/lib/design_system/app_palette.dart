import 'package:flutter/material.dart';

import 'app_colors.dart';

/// ColorScheme에 없는 브랜드 확장 토큰. `Theme.of(context).extension<AppPalette>()!`로 읽는다.
@immutable
class AppPalette extends ThemeExtension<AppPalette> {
  const AppPalette({
    required this.surfaceHigh,
    required this.muted,
    required this.gold,
    required this.success,
    required this.danger,
    required this.outline,
  });

  final Color surfaceHigh; // 카드보다 한 단계 위(칩·인풋 배경)
  final Color muted; // 보조 텍스트
  final Color gold; // 우승·메달
  final Color success;
  final Color danger;
  final Color outline;

  static const AppPalette dark = AppPalette(
    surfaceHigh: AppColors.dSurfaceHigh,
    muted: AppColors.dMuted,
    gold: AppColors.gold,
    success: AppColors.success,
    danger: AppColors.danger,
    outline: AppColors.dOutline,
  );

  static const AppPalette light = AppPalette(
    surfaceHigh: AppColors.lSurfaceHigh,
    muted: AppColors.lMuted,
    gold: AppColors.gold,
    success: AppColors.success,
    danger: AppColors.danger,
    outline: AppColors.lOutline,
  );

  @override
  AppPalette copyWith({
    Color? surfaceHigh,
    Color? muted,
    Color? gold,
    Color? success,
    Color? danger,
    Color? outline,
  }) {
    return AppPalette(
      surfaceHigh: surfaceHigh ?? this.surfaceHigh,
      muted: muted ?? this.muted,
      gold: gold ?? this.gold,
      success: success ?? this.success,
      danger: danger ?? this.danger,
      outline: outline ?? this.outline,
    );
  }

  @override
  AppPalette lerp(ThemeExtension<AppPalette>? other, double t) {
    if (other is! AppPalette) return this;
    return AppPalette(
      surfaceHigh: Color.lerp(surfaceHigh, other.surfaceHigh, t)!,
      muted: Color.lerp(muted, other.muted, t)!,
      gold: Color.lerp(gold, other.gold, t)!,
      success: Color.lerp(success, other.success, t)!,
      danger: Color.lerp(danger, other.danger, t)!,
      outline: Color.lerp(outline, other.outline, t)!,
    );
  }
}

/// 편의 확장: `context.palette`
extension PaletteX on BuildContext {
  AppPalette get palette => Theme.of(this).extension<AppPalette>()!;
  ColorScheme get scheme => Theme.of(this).colorScheme;
  TextTheme get text => Theme.of(this).textTheme;
}

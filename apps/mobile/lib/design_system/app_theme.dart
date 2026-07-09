import 'package:flutter/material.dart';

import 'app_colors.dart';
import 'app_dimens.dart';
import 'app_palette.dart';

/// 추노 앱 테마. Material 3 + Pretendard + 커스텀 토큰. 다크 우선, 라이트 지원.
class AppTheme {
  AppTheme._();

  static const String _font = 'Pretendard';

  static ThemeData get dark => _build(
        brightness: Brightness.dark,
        scheme: ColorScheme.fromSeed(
          seedColor: AppColors.coral,
          brightness: Brightness.dark,
        ).copyWith(
          primary: AppColors.coral,
          onPrimary: const Color(0xFF2A1206),
          secondary: AppColors.coralSoft,
          surface: AppColors.dBg,
          onSurface: AppColors.dOnSurface,
          onSurfaceVariant: AppColors.dMuted,
          outline: AppColors.dOutline,
          error: AppColors.danger,
        ),
        bg: AppColors.dBg,
        card: AppColors.dSurface,
        palette: AppPalette.dark,
      );

  static ThemeData get light => _build(
        brightness: Brightness.light,
        scheme: ColorScheme.fromSeed(
          seedColor: AppColors.coralDeep,
          brightness: Brightness.light,
        ).copyWith(
          primary: AppColors.coralDeep,
          onPrimary: Colors.white,
          surface: AppColors.lBg,
          onSurface: AppColors.lOnSurface,
          onSurfaceVariant: AppColors.lMuted,
          outline: AppColors.lOutline,
          error: AppColors.danger,
        ),
        bg: AppColors.lBg,
        card: AppColors.lSurface,
        palette: AppPalette.light,
      );

  static ThemeData _build({
    required Brightness brightness,
    required ColorScheme scheme,
    required Color bg,
    required Color card,
    required AppPalette palette,
  }) {
    final onSurface = scheme.onSurface;
    final textTheme = _textTheme(onSurface);

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      fontFamily: _font,
      scaffoldBackgroundColor: bg,
      textTheme: textTheme,
      extensions: [palette],
      dividerTheme: DividerThemeData(color: palette.outline, thickness: 1),
      appBarTheme: AppBarTheme(
        backgroundColor: bg,
        surfaceTintColor: Colors.transparent,
        foregroundColor: onSurface,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: textTheme.titleLarge,
      ),
      cardTheme: CardThemeData(
        color: card,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppDimens.radiusLg),
          side: BorderSide(color: palette.outline),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: scheme.primary,
          foregroundColor: scheme.onPrimary,
          minimumSize: const Size(64, 54),
          padding: const EdgeInsets.symmetric(horizontal: AppDimens.lg),
          textStyle: textTheme.labelLarge,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppDimens.radius),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: onSurface,
          minimumSize: const Size(64, 54),
          side: BorderSide(color: palette.outline),
          textStyle: textTheme.labelLarge,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppDimens.radius),
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: scheme.primary,
          textStyle: textTheme.labelLarge,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: palette.surfaceHigh,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppDimens.lg,
          vertical: AppDimens.md,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppDimens.radius),
          borderSide: BorderSide(color: palette.outline),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppDimens.radius),
          borderSide: BorderSide(color: palette.outline),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppDimens.radius),
          borderSide: BorderSide(color: scheme.primary, width: 1.5),
        ),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: card,
        surfaceTintColor: Colors.transparent,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(AppDimens.radiusLg)),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: bg,
        surfaceTintColor: Colors.transparent,
        indicatorColor: scheme.primary.withValues(alpha: 0.2),
        height: 64,
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => textTheme.labelMedium?.copyWith(
            color: states.contains(WidgetState.selected) ? scheme.primary : palette.muted,
            fontWeight: FontWeight.w600,
          ),
        ),
        iconTheme: WidgetStateProperty.resolveWith(
          (states) => IconThemeData(
            color: states.contains(WidgetState.selected) ? scheme.primary : palette.muted,
          ),
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: card,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppDimens.radiusLg),
        ),
      ),
    );
  }

  static TextTheme _textTheme(Color color) {
    TextStyle s(double size, FontWeight w, {double? height, double? spacing}) =>
        TextStyle(
          fontSize: size,
          fontWeight: w,
          color: color,
          height: height,
          letterSpacing: spacing,
        );
    return TextTheme(
      displaySmall: s(34, FontWeight.w800, height: 1.1),
      headlineMedium: s(26, FontWeight.w700, height: 1.15),
      titleLarge: s(20, FontWeight.w700),
      titleMedium: s(16, FontWeight.w600),
      bodyLarge: s(15, FontWeight.w400, height: 1.5),
      bodyMedium: s(14, FontWeight.w400, height: 1.5),
      labelLarge: s(15, FontWeight.w600),
      labelMedium: s(12, FontWeight.w500),
    );
  }
}

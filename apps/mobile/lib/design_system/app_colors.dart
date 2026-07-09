import 'package:flutter/material.dart';

/// 추노 브랜드 색 토큰. 볼드 오렌지/코랄 + 다크 우선 중립.
class AppColors {
  AppColors._();

  // Brand
  static const Color coral = Color(0xFFFF6A3D); // primary accent (dark)
  static const Color coralDeep = Color(0xFFF0532A); // primary (light 대비 강화)
  static const Color coralSoft = Color(0xFFFFB27A); // secondary tint
  static const Color gold = Color(0xFFF5B14C); // 우승·메달
  static const Color success = Color(0xFF57C88B);
  static const Color danger = Color(0xFFFF6B6B);

  // Dark neutrals
  static const Color dBg = Color(0xFF131316);
  static const Color dSurface = Color(0xFF1D1D21);
  static const Color dSurfaceHigh = Color(0xFF26262B);
  static const Color dOutline = Color(0xFF34343B);
  static const Color dOnSurface = Color(0xFFF2F2F4);
  static const Color dMuted = Color(0xFF9B9BA3);

  // Light neutrals
  static const Color lBg = Color(0xFFF6F5F4);
  static const Color lSurface = Color(0xFFFFFFFF);
  static const Color lSurfaceHigh = Color(0xFFF0EEEC);
  static const Color lOutline = Color(0xFFE5E2DF);
  static const Color lOnSurface = Color(0xFF201C1A);
  static const Color lMuted = Color(0xFF7A756F);
}

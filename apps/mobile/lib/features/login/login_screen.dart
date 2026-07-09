import 'package:flutter/material.dart';

import '../../design_system/app_dimens.dart';
import '../../design_system/app_palette.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  void _login(BuildContext context, String provider) {
    // 약관·개인정보 동의는 로그인이 아니라 온보딩에서 받는다.
    Navigator.of(context).pushReplacementNamed('/onboarding');
  }

  @override
  Widget build(BuildContext context) {
    final scheme = context.scheme;
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppDimens.screenPad),
          child: Column(
            children: [
              const Spacer(),
              Container(
                width: 88,
                height: 88,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: scheme.primary.withValues(alpha: 0.16),
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.directions_run, color: scheme.primary, size: 46),
              ),
              const SizedBox(height: AppDimens.lg),
              Text('추노', style: context.text.displaySmall),
              const SizedBox(height: AppDimens.sm),
              Text(
                '같은 목표, 다른 장소\n실시간으로 함께 달린다',
                textAlign: TextAlign.center,
                style: context.text.bodyLarge?.copyWith(color: context.palette.muted),
              ),
              const Spacer(),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () => _login(context, '카카오'),
                  icon: const Icon(Icons.chat_bubble_rounded, size: 20),
                  label: const Text('카카오로 시작하기'),
                ),
              ),
              const SizedBox(height: AppDimens.sm),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => _login(context, '구글'),
                  icon: const Icon(Icons.g_mobiledata, size: 26),
                  label: const Text('구글로 시작하기'),
                ),
              ),
              const SizedBox(height: AppDimens.sm),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => _login(context, '애플'),
                  icon: const Icon(Icons.apple, size: 22),
                  label: const Text('Apple로 시작하기'),
                ),
              ),
              const SizedBox(height: AppDimens.lg),
            ],
          ),
        ),
      ),
    );
  }
}

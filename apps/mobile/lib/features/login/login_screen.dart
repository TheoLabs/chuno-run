import 'package:flutter/material.dart';

import '../../core/auth/auth_service.dart';
import '../../core/device/device_registrar.dart';
import '../../core/location/location_service.dart';
import '../../design_system/app_dimens.dart';
import '../../design_system/app_palette.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  String? _loadingProvider; // 로그인 진행 중인 provider (버튼 비활성/스피너)

  Future<void> _login(String provider) async {
    if (_loadingProvider != null) return;
    setState(() => _loadingProvider = provider);
    try {
      // dev 로그인: 첫 로그인이면 onboarding 계정 생성, 아니면 기존 상태를 받는다.
      // status로 진입 화면 분기: active면 홈, 그 외(onboarding)는 온보딩으로 이어서 진행.
      // (약관·개인정보 동의는 로그인이 아니라 온보딩에서 받는다.)
      final status = await AuthService.instance.login(provider);
      if (!mounted) return;

      // 이 기기를 서버에 등록한다(멀티기기·푸시). 실패해도 로그인은 계속된다.
      await DeviceRegistrar.instance.registerAfterLogin();
      if (!mounted) return;

      // 위치는 서비스의 전제라 로그인 직후 한 번 확보한다. 거부되면 안내 화면에서 막는다(CH-18).
      final access = await LocationService.instance.request();
      if (!mounted) return;

      if (access != LocationAccess.granted) {
        Navigator.of(context).pushReplacementNamed('/location-denied', arguments: access);
        return;
      }

      final route = status == UserStatus.active ? '/main' : '/onboarding';
      Navigator.of(context).pushReplacementNamed(route);
    } catch (e) {
      if (!mounted) return;
      setState(() => _loadingProvider = null);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('로그인에 실패했어요. 서버가 켜져 있는지 확인해 주세요.\n$e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = context.scheme;
    final busy = _loadingProvider != null;
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
                  onPressed: busy ? null : () => _login('kakao'),
                  icon: _loadingProvider == 'kakao'
                      ? _spinner(scheme.onPrimary)
                      : const Icon(Icons.chat_bubble_rounded, size: 20),
                  label: const Text('카카오로 시작하기'),
                ),
              ),
              const SizedBox(height: AppDimens.sm),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: busy ? null : () => _login('google'),
                  icon: _loadingProvider == 'google'
                      ? _spinner(scheme.onSurface)
                      : const Icon(Icons.g_mobiledata, size: 26),
                  label: const Text('구글로 시작하기'),
                ),
              ),
              const SizedBox(height: AppDimens.sm),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: busy ? null : () => _login('apple'),
                  icon: _loadingProvider == 'apple'
                      ? _spinner(scheme.onSurface)
                      : const Icon(Icons.apple, size: 22),
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

  Widget _spinner(Color color) => SizedBox(
        width: 20,
        height: 20,
        child: CircularProgressIndicator(strokeWidth: 2, color: color),
      );
}

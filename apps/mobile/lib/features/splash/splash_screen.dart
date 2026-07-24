import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/api/race_api.dart';
import '../../core/auth/auth_service.dart';
import '../../core/device/device_registrar.dart';
import '../../core/location/location_service.dart';
import '../../core/race/local_race_progress.dart';
import '../../design_system/app_dimens.dart';
import '../../design_system/app_palette.dart';

/// 앱 진입점 — 저장된 토큰으로 세션을 복구하고(자동 로그인), 상태에 맞는 화면으로 보낸다. (CH-5)
///
/// 분기 기준은 `User.status` 다.
/// - 토큰 없음·만료 → 로그인
/// - onboarding → 온보딩을 이어서 진행
/// - active → 홈 (위치 권한이 없으면 안내 화면)
/// - suspended → 이용 정지 안내
/// - exited → 로그인(재가입·복귀 흐름은 운영 정책 확정 후)
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    // 첫 프레임 이후에 라우팅해야 Navigator 가 준비된 상태를 보장할 수 있다.
    WidgetsBinding.instance.addPostFrameCallback((_) => _restore());
  }

  Future<void> _restore() async {
    final status = await AuthService.instance.restore();

    if (!mounted) return;

    if (status == null) {
      Navigator.of(context).pushReplacementNamed('/login');
      return;
    }

    if (status == UserStatus.suspended) {
      _showSuspended();
      return;
    }

    if (status == UserStatus.exited) {
      // 탈퇴 계정은 세션을 끊고 로그인부터 다시 — 복귀 절차는 운영 정책 확정 후.
      await AuthService.instance.logout();
      if (!mounted) return;
      Navigator.of(context).pushReplacementNamed('/login');
      return;
    }

    // 자동 로그인으로 세션이 살아났으니 이 기기도 재등록해 토큰·마지막 사용 시각을 갱신한다.
    unawaited(DeviceRegistrar.instance.registerAfterLogin());

    // 위치는 서비스의 전제라 진입 전에 확인한다.
    final access = await LocationService.instance.check();
    if (!mounted) return;

    if (access != LocationAccess.granted) {
      Navigator.of(context).pushReplacementNamed('/location-denied', arguments: access);
      return;
    }

    // [2차] 진행 중이던 경주가 있으면 복귀 화면으로 보낸다(앱 강제 종료 후 재실행).
    if (status == UserStatus.active && await _hasResumableRace()) {
      return;
    }
    if (!mounted) return;

    Navigator.of(context)
        .pushReplacementNamed(status == UserStatus.active ? '/main' : '/onboarding');
  }

  /// 로컬에 진행 기록이 남아 있고 서버에도 진행 중 경주가 있으면 복귀 화면으로 이동한다.
  Future<bool> _hasResumableRace() async {
    final local = await LocalRaceProgressStore.instance.read();
    if (local == null) return false;

    final token = AuthService.instance.accessToken;
    if (token == null) return false;

    try {
      final active = await HttpRaceApi().activeRace(accessToken: token);
      if (!mounted) return false;

      if (active.resumable && active.roomId != null) {
        Navigator.of(context).pushReplacementNamed('/race-resume', arguments: active.roomId);
        return true;
      }

      // 시한이 지났거나 이미 끝난 경주 — 로컬 기록을 정리한다.
      await LocalRaceProgressStore.instance.clear();
      return false;
    } catch (_) {
      return false;
    }
  }

  Future<void> _showSuspended() async {
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Text('이용이 정지된 계정입니다'),
        content: const Text('문의가 필요하면 고객센터로 연락해 주세요.'),
        actions: [
          FilledButton(onPressed: () => Navigator.pop(ctx), child: const Text('확인')),
        ],
      ),
    );

    await AuthService.instance.logout();
    if (!mounted) return;
    Navigator.of(context).pushReplacementNamed('/login');
  }

  @override
  Widget build(BuildContext context) {
    final scheme = context.scheme;

    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
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
            const SizedBox(height: AppDimens.xl),
            const SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          ],
        ),
      ),
    );
  }
}

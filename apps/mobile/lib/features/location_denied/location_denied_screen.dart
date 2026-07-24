import 'package:flutter/material.dart';

import '../../core/auth/auth_service.dart';
import '../../core/location/location_service.dart';
import '../../design_system/app_dimens.dart';
import '../../design_system/app_palette.dart';

/// 위치 권한이 없을 때 앱 사용을 막는 안내 화면. (CH-18)
///
/// 추노는 GPS 로 거리를 재는 서비스라 권한이 없으면 경주가 성립하지 않는다.
/// 여기서 권한을 다시 요청하거나 시스템 설정으로 보내고, 허용되면 원래 목적지로 넘긴다.
class LocationDeniedScreen extends StatefulWidget {
  const LocationDeniedScreen({super.key, this.access, this.nextRoute});

  /// 진입 시점에 확인된 상태. 없으면 화면에서 직접 확인한다.
  final LocationAccess? access;

  /// 권한이 허용된 뒤 이동할 경로. 생략하면 로그인 상태(온보딩 여부)로 정한다.
  final String? nextRoute;

  @override
  State<LocationDeniedScreen> createState() => _LocationDeniedScreenState();
}

class _LocationDeniedScreenState extends State<LocationDeniedScreen> with WidgetsBindingObserver {
  LocationAccess? _access;
  bool _checking = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _access = widget.access;
    if (_access == null) {
      _recheck();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // 설정 화면에서 권한을 켜고 돌아오면 즉시 반영한다.
    if (state == AppLifecycleState.resumed) {
      _recheck();
    }
  }

  Future<void> _recheck() async {
    if (_checking) return;
    setState(() => _checking = true);

    final access = await LocationService.instance.check();

    if (!mounted) return;
    setState(() {
      _access = access;
      _checking = false;
    });

    if (access == LocationAccess.granted) {
      _goNext();
    }
  }

  Future<void> _request() async {
    setState(() => _checking = true);

    final access = await LocationService.instance.request();

    if (!mounted) return;
    setState(() {
      _access = access;
      _checking = false;
    });

    if (access == LocationAccess.granted) {
      _goNext();
    }
  }

  void _goNext() {
    if (!mounted) return;

    // 온보딩을 아직 안 끝낸 계정은 홈이 아니라 온보딩을 이어서 진행해야 한다.
    final fallback =
        AuthService.instance.status == UserStatus.active ? '/main' : '/onboarding';

    Navigator.of(context)
        .pushNamedAndRemoveUntil(widget.nextRoute ?? fallback, (route) => false);
  }

  bool get _granted => _access == LocationAccess.granted;
  bool get _serviceDisabled => _access == LocationAccess.serviceDisabled;
  bool get _deniedForever => _access == LocationAccess.deniedForever;

  String get _statusLabel => switch (_access) {
        LocationAccess.granted => '허용됨 ✓ (앱 진입 가능)',
        LocationAccess.deniedForever => '영구 거부됨 — 설정에서 직접 허용해야 해요',
        LocationAccess.serviceDisabled => '기기 위치 서비스(GPS)가 꺼져 있어요',
        LocationAccess.denied => '거부됨',
        null => '확인 중…',
      };

  String get _description => _serviceDisabled
      ? '기기의 위치 서비스가 꺼져 있어 거리를 측정할 수 없어요. 위치 서비스를 켠 뒤 다시 확인해 주세요.'
      : '추노는 실시간 경주 거리 측정을 위해 위치 권한(백그라운드 포함)이 필수입니다. 권한 없이는 경주에 참여할 수 없어요.';

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final scheme = context.scheme;

    return Scaffold(
      appBar: AppBar(title: const Text('위치 권한 필요')),
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
                  color: (_granted ? p.success : scheme.primary).withValues(alpha: 0.16),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  _granted ? Icons.location_on : Icons.location_off,
                  color: _granted ? p.success : scheme.primary,
                  size: 42,
                ),
              ),
              const SizedBox(height: AppDimens.lg),
              Text(
                _serviceDisabled ? '위치 서비스를 켜주세요' : '위치 권한이 필요해요',
                textAlign: TextAlign.center,
                style: context.text.titleLarge,
              ),
              const SizedBox(height: AppDimens.sm),
              Text(
                _description,
                textAlign: TextAlign.center,
                style: context.text.bodyMedium?.copyWith(color: p.muted),
              ),
              const SizedBox(height: AppDimens.lg),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppDimens.lg),
                decoration: BoxDecoration(
                  color: p.surfaceHigh,
                  borderRadius: BorderRadius.circular(AppDimens.radius),
                ),
                child: Text.rich(
                  TextSpan(
                    text: '현재 상태: ',
                    style: context.text.bodyMedium?.copyWith(color: p.muted),
                    children: [
                      TextSpan(
                        text: _statusLabel,
                        style: context.text.bodyMedium?.copyWith(
                          color: _granted ? p.success : scheme.onSurface,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppDimens.xl),
              if (_granted)
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: _goNext,
                    child: const Text('계속하기'),
                  ),
                )
              else ...[
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    // 영구 거부·서비스 꺼짐은 앱에서 물어볼 수 없어 설정 화면으로 보낸다.
                    onPressed: _checking
                        ? null
                        : _serviceDisabled
                            ? LocationService.instance.openLocationSettings
                            : _deniedForever
                                ? LocationService.instance.openSettings
                                : _request,
                    child: Text(
                      _serviceDisabled
                          ? '위치 서비스 설정 열기'
                          : _deniedForever
                              ? '설정에서 권한 허용'
                              : '위치 권한 허용하기',
                    ),
                  ),
                ),
                const SizedBox(height: AppDimens.sm),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: _checking ? null : _recheck,
                    child: Text(_checking ? '확인 중…' : '권한 다시 확인'),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

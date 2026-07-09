import 'package:flutter/material.dart';

import '../../design_system/app_dimens.dart';
import '../../design_system/app_palette.dart';

class LocationDeniedScreen extends StatefulWidget {
  const LocationDeniedScreen({super.key});

  @override
  State<LocationDeniedScreen> createState() => _LocationDeniedScreenState();
}

class _LocationDeniedScreenState extends State<LocationDeniedScreen> {
  int _tries = 0;
  bool get _allowed => _tries >= 2;

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
                  color: (_allowed ? p.success : scheme.primary).withValues(alpha: 0.16),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  _allowed ? Icons.location_on : Icons.location_off,
                  color: _allowed ? p.success : scheme.primary,
                  size: 42,
                ),
              ),
              const SizedBox(height: AppDimens.lg),
              Text('위치 권한이 필요해요',
                  textAlign: TextAlign.center, style: context.text.titleLarge),
              const SizedBox(height: AppDimens.sm),
              Text(
                '추노는 실시간 경주 거리 측정을 위해 위치 권한(백그라운드 포함)이 필수입니다. 권한 없이는 경주에 참여할 수 없어요.',
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
                        text: _allowed
                            ? '허용됨 ✓ (앱 진입 가능)'
                            : _tries == 1
                                ? '여전히 거부됨 — 설정에서 허용 후 다시 시도'
                                : '거부됨',
                        style: context.text.bodyMedium?.copyWith(
                          color: _allowed ? p.success : scheme.onSurface,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppDimens.xl),
              if (_allowed)
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () =>
                        Navigator.of(context).pushReplacementNamed('/main'),
                    child: const Text('계속하기'),
                  ),
                )
              else ...[
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () => ScaffoldMessenger.of(context)
                      ..hideCurrentSnackBar()
                      ..showSnackBar(const SnackBar(content: Text('설정 화면 이동 (목업)'))),
                    child: const Text('설정에서 권한 허용'),
                  ),
                ),
                const SizedBox(height: AppDimens.sm),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () => setState(() => _tries++),
                    child: const Text('권한 다시 확인'),
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

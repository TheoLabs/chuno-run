import 'package:flutter/material.dart';

import '../../core/auth/auth_service.dart';
import '../../design_system/app_dimens.dart';
import '../../design_system/app_palette.dart';

class _Agreement {
  _Agreement(this.title, this.required, this.body);
  final String title;
  final bool required;
  final String body;
  bool agreed = false;
  bool expanded = false;
}

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final TextEditingController _nick = TextEditingController();
  bool _submitting = false;

  final List<_Agreement> _items = [
    _Agreement('서비스 이용약관', true, '서비스 이용에 관한 기본 약관입니다. (목업 본문)'),
    _Agreement('개인정보 수집·이용 동의', true, '닉네임·소셜 식별자·위치·경주 기록을 수집·이용합니다. (목업)'),
    _Agreement('위치기반서비스 이용약관', true, '경주 중 실시간 위치·거리 수집에 대한 동의입니다. (목업)'),
    _Agreement('마케팅 정보 수신', false, '이벤트·소식 알림 수신 동의(선택). (목업)'),
  ];

  bool get _allAgreed => _items.every((e) => e.agreed);
  bool get _requiredOk => _items.where((e) => e.required).every((e) => e.agreed);
  bool get _canStart => _requiredOk && _nick.text.trim().isNotEmpty;

  @override
  void initState() {
    super.initState();
    _nick.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _nick.dispose();
    super.dispose();
  }

  Future<void> _finish() async {
    if (!_canStart || _submitting) return;
    setState(() => _submitting = true);
    try {
      // 온보딩 완료 → 닉네임 저장 + status onboarding→active 전이 후 홈 진입.
      await AuthService.instance.completeOnboarding(_nick.text.trim());
      if (!mounted) return;
      Navigator.of(context).pushReplacementNamed('/main');
    } catch (e) {
      if (!mounted) return;
      setState(() => _submitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('저장에 실패했어요. 잠시 후 다시 시도해 주세요.\n$e')),
      );
    }
  }

  void _toggleAll() {
    final v = !_allAgreed;
    setState(() {
      for (final e in _items) {
        e.agreed = v;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Scaffold(
      appBar: AppBar(title: const Text('환영합니다 👋')),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(AppDimens.screenPad),
                children: [
                  Text('시작하기 전에', style: context.text.titleLarge),
                  const SizedBox(height: AppDimens.xs),
                  Text('닉네임을 정하고 약관에 동의해 주세요.',
                      style: context.text.bodyMedium?.copyWith(color: p.muted)),
                  const SizedBox(height: AppDimens.xl),
                  Text('닉네임', style: context.text.titleMedium),
                  const SizedBox(height: AppDimens.sm),
                  TextField(
                    controller: _nick,
                    maxLength: 16,
                    decoration: const InputDecoration(hintText: '예: 달리는너구리'),
                  ),
                  const SizedBox(height: AppDimens.sm),
                  _allAgreeCard(context),
                  const SizedBox(height: AppDimens.md),
                  for (final a in _items) _agreementTile(context, a),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(AppDimens.screenPad),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (!_canStart)
                    Padding(
                      padding: const EdgeInsets.only(bottom: AppDimens.sm),
                      child: Text(
                        '필수 약관 동의와 닉네임을 입력해야 시작할 수 있어요.',
                        textAlign: TextAlign.center,
                        style: context.text.labelMedium?.copyWith(color: p.muted),
                      ),
                    ),
                  FilledButton(
                    onPressed: (_canStart && !_submitting) ? _finish : null,
                    child: _submitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Text('시작하기'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _allAgreeCard(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(AppDimens.radiusLg),
      onTap: _toggleAll,
      child: Container(
        padding: const EdgeInsets.all(AppDimens.lg),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(AppDimens.radiusLg),
          border: Border.all(color: context.palette.outline),
        ),
        child: Row(
          children: [
            _CheckDot(selected: _allAgreed),
            const SizedBox(width: AppDimens.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('약관 전체 동의', style: context.text.titleMedium),
                  const SizedBox(height: 2),
                  Text('필수·선택 약관에 모두 동의합니다.',
                      style: context.text.labelMedium?.copyWith(color: context.palette.muted)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _agreementTile(BuildContext context, _Agreement a) {
    final p = context.palette;
    return Column(
      children: [
        Row(
          children: [
            InkWell(
              customBorder: const CircleBorder(),
              onTap: () => setState(() => a.agreed = !a.agreed),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: AppDimens.sm),
                child: _CheckDot(selected: a.agreed, size: 22),
              ),
            ),
            const SizedBox(width: AppDimens.md),
            Text(a.required ? '[필수] ' : '[선택] ',
                style: context.text.labelMedium?.copyWith(
                  color: a.required ? context.scheme.primary : p.muted,
                  fontWeight: FontWeight.w700,
                )),
            Expanded(child: Text(a.title, style: context.text.bodyLarge)),
            TextButton(
              onPressed: () => setState(() => a.expanded = !a.expanded),
              child: Text(a.expanded ? '접기' : '보기'),
            ),
          ],
        ),
        if (a.expanded)
          Container(
            width: double.infinity,
            margin: const EdgeInsets.only(left: 34, bottom: AppDimens.sm),
            padding: const EdgeInsets.all(AppDimens.md),
            decoration: BoxDecoration(
              color: p.surfaceHigh,
              borderRadius: BorderRadius.circular(AppDimens.radius),
            ),
            child: Text(a.body,
                style: context.text.labelMedium?.copyWith(color: p.muted)),
          ),
      ],
    );
  }
}

class _CheckDot extends StatelessWidget {
  const _CheckDot({required this.selected, this.size = 26});
  final bool selected;
  final double size;

  @override
  Widget build(BuildContext context) {
    final scheme = context.scheme;
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: selected ? scheme.primary : Colors.transparent,
        border: Border.all(
          color: selected ? scheme.primary : context.palette.outline,
          width: 2,
        ),
      ),
      child: selected
          ? Icon(Icons.check, size: size * 0.6, color: scheme.onPrimary)
          : null,
    );
  }
}

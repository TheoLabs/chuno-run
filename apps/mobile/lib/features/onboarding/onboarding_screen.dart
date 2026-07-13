import 'package:flutter/material.dart';

import '../../core/api/agreement_api.dart';
import '../../core/api/api_client.dart';
import '../../core/auth/auth_service.dart';
import '../../design_system/app_dimens.dart';
import '../../design_system/app_palette.dart';

/// 화면 상태로 쓰는 약관 항목 — 서버 약관 + 사용자 동의/펼침 상태.
class _AgreementState {
  _AgreementState(this.agreement);
  final Agreement agreement;
  bool agreed = false;
  bool expanded = false;

  int get id => agreement.id;
  String get title => agreement.title;
  String get body => agreement.content;
  bool get required => agreement.required;
}

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key, this.agreementApi});

  /// 테스트에서 가짜 구현을 주입할 수 있다. 기본값은 HTTP 구현.
  final AgreementApi? agreementApi;

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final TextEditingController _nick = TextEditingController();
  late final AgreementApi _agreementApi;

  bool _loading = true;
  String? _loadError;
  bool _submitting = false;
  List<_AgreementState> _items = const [];

  bool get _allAgreed =>
      _items.isNotEmpty && _items.every((e) => e.agreed);
  bool get _requiredOk => _items.where((e) => e.required).every((e) => e.agreed);
  bool get _canStart =>
      !_loading && _loadError == null && _requiredOk && _nick.text.trim().isNotEmpty;

  @override
  void initState() {
    super.initState();
    _agreementApi = widget.agreementApi ?? HttpAgreementApi();
    _nick.addListener(() => setState(() {}));
    _loadAgreements();
  }

  @override
  void dispose() {
    _nick.dispose();
    super.dispose();
  }

  Future<void> _loadAgreements() async {
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      final token = AuthService.instance.accessToken;
      if (token == null) {
        throw StateError('로그인 후에 약관을 불러올 수 있습니다.');
      }
      final agreements = await _agreementApi.activeAgreements(accessToken: token);
      if (!mounted) return;
      setState(() {
        _items = agreements.map(_AgreementState.new).toList();
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _loadError = '$e';
      });
    }
  }

  Future<void> _finish() async {
    if (!_canStart || _submitting) return;
    setState(() => _submitting = true);
    try {
      // 표시된 모든 약관에 대해 동의 여부를 전송한다.
      final consents = _items
          .map((e) => Consent(agreementId: e.id, isAgreed: e.agreed))
          .toList();
      // 온보딩 완료 → 서버에 저장 후 GET /auth/me로 세션(status/nickname) 갱신.
      await AuthService.instance.completeOnboarding(_nick.text.trim(), consents);
      if (!mounted) return;
      Navigator.of(context).pushReplacementNamed('/main');
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _submitting = false);
      final msg = e.statusCode == 400
          ? '필수 약관에 모두 동의해야 시작할 수 있어요.'
          : '저장에 실패했어요. 잠시 후 다시 시도해 주세요.';
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(msg)));
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
                  ..._buildAgreements(context),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(AppDimens.screenPad),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (!_canStart && _loadError == null && !_loading)
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
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white),
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

  List<Widget> _buildAgreements(BuildContext context) {
    if (_loading) {
      return const [
        Padding(
          padding: EdgeInsets.symmetric(vertical: AppDimens.xxl),
          child: Center(child: CircularProgressIndicator()),
        ),
      ];
    }
    if (_loadError != null) {
      return [_errorCard(context)];
    }
    return [
      _allAgreeCard(context),
      const SizedBox(height: AppDimens.md),
      for (final a in _items) _agreementTile(context, a),
    ];
  }

  Widget _errorCard(BuildContext context) {
    final p = context.palette;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppDimens.lg),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(AppDimens.radiusLg),
        border: Border.all(color: p.outline),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('약관을 불러오지 못했어요.', style: context.text.titleMedium),
          const SizedBox(height: AppDimens.xs),
          Text('네트워크와 서버 상태를 확인해 주세요.',
              style: context.text.labelMedium?.copyWith(color: p.muted)),
          const SizedBox(height: AppDimens.md),
          Align(
            alignment: Alignment.centerLeft,
            child: OutlinedButton(
              onPressed: _loading ? null : _loadAgreements,
              child: const Text('다시 시도'),
            ),
          ),
        ],
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
                      style: context.text.labelMedium
                          ?.copyWith(color: context.palette.muted)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _agreementTile(BuildContext context, _AgreementState a) {
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

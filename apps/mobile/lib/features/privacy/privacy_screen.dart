import 'package:flutter/material.dart';

import '../../core/api/agreement_api.dart';
import '../../core/api/api_client.dart';
import '../../core/auth/auth_service.dart';
import '../../design_system/app_dimens.dart';
import '../../design_system/app_palette.dart';
import '../../design_system/widgets.dart';

/// 개인정보 관리 — 선택 약관 동의 철회 + 계정 탈퇴. (CH-66)
///
/// 활성 약관 전체와 '재동의 필요(미동의)' 목록을 겹쳐 각 약관의 동의 상태를 계산한다.
/// 필수 약관은 철회 불가(탈퇴로 안내), 선택 약관만 철회/재동의할 수 있다.
class PrivacyScreen extends StatefulWidget {
  const PrivacyScreen({super.key, this.agreementApi});

  final AgreementApi? agreementApi;

  @override
  State<PrivacyScreen> createState() => _PrivacyScreenState();
}

class _PrivacyScreenState extends State<PrivacyScreen> {
  late final AgreementApi _agreementApi = widget.agreementApi ?? HttpAgreementApi();

  List<Agreement> _agreements = const [];
  // 아직 동의하지 않은(=철회했거나 미동의) 약관 id 집합.
  Set<int> _notAgreed = {};
  bool _loading = true;
  bool _failed = false;
  final Set<int> _busy = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final token = AuthService.instance.accessToken;
    if (token == null) {
      setState(() {
        _loading = false;
        _failed = true;
      });
      return;
    }

    setState(() {
      _loading = true;
      _failed = false;
    });

    try {
      final active = await _agreementApi.activeAgreements(accessToken: token);
      final pending = await _agreementApi.pendingConsents(accessToken: token);
      if (!mounted) return;
      setState(() {
        _agreements = active;
        _notAgreed = pending.items.map((a) => a.id).toSet();
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _failed = true;
      });
    }
  }

  Future<void> _setConsent(Agreement agreement, bool isAgreed) async {
    final token = AuthService.instance.accessToken;
    if (token == null || _busy.contains(agreement.id)) return;

    setState(() => _busy.add(agreement.id));
    try {
      await _agreementApi.consent(
        accessToken: token,
        consents: [(agreementId: agreement.id, isAgreed: isAgreed)],
      );
      if (!mounted) return;
      setState(() {
        _busy.remove(agreement.id);
        if (isAgreed) {
          _notAgreed.remove(agreement.id);
        } else {
          _notAgreed.add(agreement.id);
        }
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _busy.remove(agreement.id));
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      if (!mounted) return;
      setState(() => _busy.remove(agreement.id));
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('처리하지 못했어요')));
    }
  }

  Future<void> _confirmWithdraw() async {
    var agreed = false;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          title: const Text('정말 탈퇴할까요?'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('진행 중인 경주가 있으면 미완주로 처리됩니다. 30일 이내 다시 로그인하면 계정이 복구돼요.'),
              const SizedBox(height: AppDimens.sm),
              Row(
                children: [
                  Checkbox(value: agreed, onChanged: (v) => setLocal(() => agreed = v ?? false)),
                  const Flexible(child: Text('위 내용을 확인했고 탈퇴에 동의합니다')),
                ],
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('취소')),
            FilledButton(
              onPressed: agreed ? () => Navigator.pop(ctx, true) : null,
              style: FilledButton.styleFrom(backgroundColor: context.palette.danger),
              child: const Text('탈퇴'),
            ),
          ],
        ),
      ),
    );

    if (ok != true || !mounted) return;

    try {
      await AuthService.instance.withdraw();
      if (!mounted) return;
      Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('탈퇴하지 못했어요')));
    }
  }

  String _typeLabel(String type) => switch (type) {
        'service' => '서비스 이용약관',
        'privacy' => '개인정보 수집·이용',
        'location' => '위치기반서비스',
        'marketing' => '마케팅 정보 수신',
        _ => type,
      };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('개인정보 관리')),
      body: SafeArea(child: _body(context)),
    );
  }

  Widget _body(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());

    final p = context.palette;
    if (_failed) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('불러오지 못했어요', style: context.text.bodyMedium?.copyWith(color: p.muted)),
            const SizedBox(height: AppDimens.sm),
            OutlinedButton(onPressed: _load, child: const Text('다시 시도')),
          ],
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(AppDimens.screenPad),
      children: [
        Text('약관 동의 관리', style: context.text.titleLarge),
        const SizedBox(height: AppDimens.xs),
        Text('필수 약관은 서비스 이용의 전제라 철회할 수 없어요. 철회를 원하면 탈퇴해 주세요.',
            style: context.text.bodyMedium?.copyWith(color: p.muted)),
        const SizedBox(height: AppDimens.md),
        Card(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppDimens.lg),
            child: Column(
              children: [for (final a in _agreements) _agreementRow(context, a)],
            ),
          ),
        ),
        const SizedBox(height: AppDimens.xl),
        Text('계정', style: context.text.titleLarge),
        const SizedBox(height: AppDimens.sm),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(AppDimens.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('탈퇴하기', style: context.text.titleMedium),
                const SizedBox(height: 4),
                Text(
                  '탈퇴하면 경주 참가·방 생성이 중단되고 계정이 이탈 상태가 됩니다. 30일 이내 재로그인하면 복구할 수 있어요.',
                  style: context.text.bodyMedium?.copyWith(color: p.muted),
                ),
                const SizedBox(height: AppDimens.md),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: _confirmWithdraw,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: p.danger,
                      side: BorderSide(color: p.danger.withValues(alpha: 0.5)),
                    ),
                    child: const Text('탈퇴 요청'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _agreementRow(BuildContext context, Agreement a) {
    final p = context.palette;
    final agreed = !_notAgreed.contains(a.id);
    final busy = _busy.contains(a.id);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppDimens.md),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text('${_typeLabel(a.type)} (v${a.version})',
                          maxLines: 1, overflow: TextOverflow.ellipsis, style: context.text.titleMedium),
                    ),
                    const SizedBox(width: 6),
                    StatusPill(a.required ? '필수' : '선택', accent: a.required ? p.muted : p.success),
                  ],
                ),
                Text(agreed ? '동의함' : '철회됨',
                    style: context.text.labelMedium?.copyWith(color: p.muted)),
              ],
            ),
          ),
          if (a.required)
            Text('철회 불가', style: context.text.labelMedium?.copyWith(color: p.muted))
          else
            OutlinedButton(
              onPressed: busy ? null : () => _setConsent(a, !agreed),
              style: OutlinedButton.styleFrom(minimumSize: const Size(0, 32)),
              child: Text(agreed ? '철회' : '동의'),
            ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';

import '../../design_system/app_dimens.dart';
import '../../design_system/app_palette.dart';
import '../../design_system/widgets.dart';
import '../../mock/mock_data.dart';

class _RecentRace {
  const _RecentRace(this.title, this.meta, this.badge, {this.dnf = false});
  final String title;
  final String meta;
  final String badge;
  final bool dnf;
}

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final TextEditingController _nick = TextEditingController(text: MockData.myNick);
  bool _editing = false;
  bool _notif = true;
  bool _reconsentDone = false;
  bool _hasPhoto = false; // 프로필 사진 설정 여부 (목업)

  static const List<_RecentRace> _recent = [
    _RecentRace('아침 3km 대결', '07-08 · 목표 3km', '1위'),
    _RecentRace('퇴근런 5km', '07-05 · 목표 5km', '3위'),
    _RecentRace('주말 10km 롱런', '07-01 · 목표 10km', '미완주', dnf: true),
  ];

  @override
  void dispose() {
    _nick.dispose();
    super.dispose();
  }

  void _snack(String m) => ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(m)));

  void _toggleEdit() {
    setState(() => _editing = !_editing);
    if (!_editing) _snack('닉네임 저장됨');
  }

  Future<void> _reconsent() async {
    bool agree = false;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          title: const Text('위치기반서비스 이용약관 (v2)'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(AppDimens.md),
                decoration: BoxDecoration(
                  color: context.palette.surfaceHigh,
                  borderRadius: BorderRadius.circular(AppDimens.radius),
                ),
                child: Text(
                  '개정 요지: 위치정보 보관 기간 및 제3자 제공 범위 조항이 변경되었습니다. (본문 목업)',
                  style: context.text.labelMedium?.copyWith(color: context.palette.muted),
                ),
              ),
              const SizedBox(height: AppDimens.sm),
              Row(
                children: [
                  Checkbox(
                    value: agree,
                    onChanged: (v) => setLocal(() => agree = v ?? false),
                    activeColor: context.scheme.primary,
                  ),
                  const Flexible(child: Text('위 변경 약관에 동의합니다 (필수)')),
                ],
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('나중에')),
            FilledButton(
              onPressed: agree ? () => Navigator.pop(ctx, true) : null,
              child: const Text('재동의'),
            ),
          ],
        ),
      ),
    );
    if (ok == true && mounted) {
      setState(() => _reconsentDone = true);
      _snack('재동의 완료');
    }
  }

  Future<void> _logout() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('로그아웃 할까요?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('취소')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('로그아웃')),
        ],
      ),
    );
    if (ok == true && mounted) {
      Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text('프로필'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => _snack('설정 (준비중)'),
          ),
          const SizedBox(width: AppDimens.xs),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppDimens.screenPad),
          children: [
            _header(context),
            const SizedBox(height: AppDimens.lg),
            _statsRow(context),
            const SizedBox(height: AppDimens.lg),
            _sectionLabel(context, '최근 경주',
                trailing: TextButton(
                  onPressed: () => _snack('경주 이력 (이력 탭)'),
                  child: const Text('전체 보기'),
                )),
            const SizedBox(height: AppDimens.sm),
            _card(context, [for (final r in _recent) _recentRow(context, r)]),
            const SizedBox(height: AppDimens.lg),
            _sectionLabel(context, '설정'),
            const SizedBox(height: AppDimens.sm),
            _card(context, [
              _row(
                left: Text('경주 알림', style: context.text.bodyLarge),
                right: Transform.scale(
                  scale: 0.8,
                  alignment: Alignment.centerRight,
                  child: Switch(
                    value: _notif,
                    onChanged: (v) => setState(() => _notif = v),
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                ),
              ),
              _row(
                left: Text('위치 권한', style: context.text.bodyLarge),
                right: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    StatusPill('허용됨', accent: context.palette.success),
                    const SizedBox(width: 6),
                    Icon(Icons.chevron_right, size: 18, color: context.palette.muted),
                  ],
                ),
                onTap: () => Navigator.of(context).pushNamed('/location-denied'),
              ),
              _row(
                left: Text('연결 계정', style: context.text.bodyLarge),
                right: Text('카카오',
                    style: context.text.bodyMedium?.copyWith(color: context.palette.muted)),
              ),
              _row(
                left: Text('약관 · 개인정보 처리방침', style: context.text.bodyLarge),
                right: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (!_reconsentDone) ...[
                      StatusPill('재동의 필요', accent: context.palette.gold),
                      const SizedBox(width: 6),
                    ],
                    Icon(Icons.chevron_right, size: 18, color: context.palette.muted),
                  ],
                ),
                onTap: _reconsent,
              ),
            ]),
            const SizedBox(height: AppDimens.xl),
            OutlinedButton(
              onPressed: _logout,
              style: OutlinedButton.styleFrom(foregroundColor: context.palette.muted),
              child: const Text('로그아웃'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _header(BuildContext context) {
    return Column(
      children: [
        GestureDetector(
          onTap: _changePhoto,
          child: SizedBox(
            width: 84,
            height: 84,
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                _avatar(context),
                Positioned(
                  right: -2,
                  bottom: -2,
                  child: Container(
                    width: 28,
                    height: 28,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: context.scheme.primary,
                      shape: BoxShape.circle,
                      border: Border.all(
                          color: Theme.of(context).scaffoldBackgroundColor, width: 2),
                    ),
                    child: Icon(Icons.photo_camera, size: 14, color: context.scheme.onPrimary),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: AppDimens.md),
        SizedBox(
          height: 40,
          child: _editing
              ? Row(
                  children: [
                    const Expanded(child: SizedBox()),
                    SizedBox(
                      width: 160,
                      child: TextField(
                        controller: _nick,
                        textAlign: TextAlign.center,
                        style: context.text.titleLarge,
                        decoration: const InputDecoration(
                          isDense: true,
                          filled: false,
                          contentPadding: EdgeInsets.symmetric(vertical: 4),
                          border: UnderlineInputBorder(),
                          enabledBorder: UnderlineInputBorder(),
                          focusedBorder: UnderlineInputBorder(),
                        ),
                      ),
                    ),
                    Expanded(
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: InkWell(
                          onTap: _toggleEdit,
                          customBorder: const CircleBorder(),
                          child: Padding(
                            padding: const EdgeInsets.all(4),
                            child: Icon(Icons.check, size: 18, color: context.scheme.primary),
                          ),
                        ),
                      ),
                    ),
                  ],
                )
              : Row(
                  children: [
                    const Expanded(child: SizedBox()),
                    Text(_nick.text, style: context.text.titleLarge),
                    Expanded(
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: InkWell(
                          onTap: _toggleEdit,
                          customBorder: const CircleBorder(),
                          child: Padding(
                            padding: const EdgeInsets.all(4),
                            child: Icon(Icons.edit, size: 16, color: context.palette.muted),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
        ),
        const SizedBox(height: 2),
        Text('카카오 로그인 · 2026년 6월 가입',
            style: context.text.labelMedium?.copyWith(color: context.palette.muted)),
      ],
    );
  }

  Widget _avatar(BuildContext context) {
    if (_hasPhoto) {
      return Container(
        width: 84,
        height: 84,
        alignment: Alignment.center,
        decoration: BoxDecoration(shape: BoxShape.circle, color: context.palette.surfaceHigh),
        child: Icon(Icons.person, size: 46, color: context.palette.muted),
      );
    }
    return AvatarCircle(MockData.myNick, size: 84);
  }

  void _changePhoto() {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(
                  AppDimens.screenPad, 0, AppDimens.screenPad, AppDimens.sm),
              child: Text('프로필 사진',
                  style: context.text.labelMedium?.copyWith(color: context.palette.muted)),
            ),
            _photoTile(Icons.photo_library_outlined, '앨범에서 선택', () => _setPhoto(ctx, true)),
            _photoTile(Icons.photo_camera_outlined, '카메라로 촬영', () => _setPhoto(ctx, true)),
            if (_hasPhoto)
              _photoTile(Icons.person_outline, '기본 이미지로', () => _setPhoto(ctx, false)),
            const SizedBox(height: AppDimens.sm),
          ],
        ),
      ),
    );
  }

  void _setPhoto(BuildContext ctx, bool has) {
    Navigator.pop(ctx);
    setState(() => _hasPhoto = has);
    _snack(has ? '사진이 변경되었습니다 (목업)' : '기본 이미지로 변경');
  }

  Widget _photoTile(IconData icon, String label, VoidCallback onTap) {
    final accent = context.scheme.primary;
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(
            horizontal: AppDimens.screenPad, vertical: AppDimens.md),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: accent.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 20, color: accent),
            ),
            const SizedBox(width: AppDimens.md),
            Text(label, style: context.text.titleMedium),
          ],
        ),
      ),
    );
  }

  Widget _statsRow(BuildContext context) {
    return Row(
      children: const [
        Expanded(child: StatTile(value: '${MockData.totalRaces}', label: '경쟁')),
        SizedBox(width: AppDimens.sm),
        Expanded(child: StatTile(value: '${MockData.totalWins}', label: '우승')),
        SizedBox(width: AppDimens.sm),
        Expanded(child: StatTile(value: '${MockData.totalDistanceKm}', label: '총 km')),
        SizedBox(width: AppDimens.sm),
        Expanded(child: StatTile(value: '83%', label: '완주율')),
      ],
    );
  }

  Widget _sectionLabel(BuildContext context, String text, {Widget? trailing}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(text, style: context.text.titleMedium),
        if (trailing != null) trailing,
      ],
    );
  }

  Widget _card(BuildContext context, List<Widget> rows) {
    final children = <Widget>[];
    for (var i = 0; i < rows.length; i++) {
      children.add(rows[i]);
      if (i < rows.length - 1) {
        children.add(Divider(height: 1, color: context.palette.outline));
      }
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppDimens.lg),
      decoration: BoxDecoration(
        border: Border.all(color: context.palette.outline),
        borderRadius: BorderRadius.circular(AppDimens.radiusLg),
      ),
      child: Column(children: children),
    );
  }

  Widget _row({required Widget left, required Widget right, VoidCallback? onTap}) {
    final content = SizedBox(
      height: 52,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [Flexible(child: left), right],
      ),
    );
    return onTap == null ? content : InkWell(onTap: onTap, child: content);
  }

  Widget _recentRow(BuildContext context, _RecentRace r) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppDimens.md),
      child: Row(
        children: [
          AvatarCircle(r.title, size: 32),
          const SizedBox(width: AppDimens.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(r.title,
                    maxLines: 1, overflow: TextOverflow.ellipsis, style: context.text.titleMedium),
                Text(r.meta,
                    style: context.text.labelMedium?.copyWith(color: context.palette.muted)),
              ],
            ),
          ),
          const SizedBox(width: AppDimens.sm),
          StatusPill(r.badge, accent: r.dnf ? context.palette.muted : context.palette.gold),
        ],
      ),
    );
  }
}

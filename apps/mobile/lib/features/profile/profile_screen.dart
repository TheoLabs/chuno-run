import 'package:flutter/material.dart';

import '../../design_system/app_dimens.dart';
import '../../design_system/app_palette.dart';
import '../../design_system/widgets.dart';
import '../../core/api/agreement_api.dart';
import '../../core/api/api_client.dart';
import '../../core/api/race_api.dart';
import '../../core/api/user_stats_api.dart';
import '../../core/auth/auth_service.dart';
import '../../mock/mock_data.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key, this.statsApi, this.agreementApi, this.raceApi});

  /// 러닝 통계 API. 테스트에서 가짜 구현을 주입한다. null이면 실제 HTTP 구현을 쓴다.
  final UserStatsApi? statsApi;

  /// 약관 API. 재동의 흐름에 쓴다.
  final AgreementApi? agreementApi;

  /// 경주 API. 최근 경주 목록에 쓴다.
  final RaceApi? raceApi;

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final TextEditingController _nick = TextEditingController();
  late final UserStatsApi _statsApi = widget.statsApi ?? HttpUserStatsApi();
  late final AgreementApi _agreementApi = widget.agreementApi ?? HttpAgreementApi();
  late final RaceApi _raceApi = widget.raceApi ?? HttpRaceApi();
  bool _editing = false;
  bool _saving = false;

  /// 재동의가 필요한 약관. 없으면 설정 행의 '재동의 필요' 배지를 감춘다.
  PendingConsents? _pending;
  bool _hasPhoto = false; // 프로필 사진 설정 여부 (목업)

  /// GET /users/me/stats 로 불러온 러닝 통계. 로딩 전/실패 시 null.
  UserStats? _stats;
  bool _statsFailed = false;

  /// 최근 경주 — 이력 API 에서 앞 3건만 보여준다.
  List<RaceHistoryItem> _recent = const [];

  @override
  void initState() {
    super.initState();
    _nick.text = _currentNick;
    _refresh();
    _loadStats();
    _loadPendingConsents();
    _loadRecent();
  }

  /// 최근 경주 3건을 이력 API 로 불러온다. 실패해도 화면은 막지 않는다.
  Future<void> _loadRecent() async {
    final token = AuthService.instance.accessToken;
    if (token == null) return;

    try {
      final items = await _raceApi.history(accessToken: token, page: 1, limit: 3);
      if (!mounted) return;
      setState(() => _recent = items);
    } catch (_) {
      // 최근 경주는 부가 정보라 실패를 조용히 넘긴다.
    }
  }

  /// 약관이 개정되면 시행 중인 새 버전에 대한 동의 이력이 없어 여기에 잡힌다(CH-9).
  Future<void> _loadPendingConsents() async {
    final token = AuthService.instance.accessToken;
    if (token == null) return;

    try {
      final pending = await _agreementApi.pendingConsents(accessToken: token);
      if (!mounted) return;
      setState(() => _pending = pending);
    } catch (_) {
      // 조회 실패는 화면을 막지 않는다 — 배지만 뜨지 않는다.
    }
  }

  /// 화면 진입 시 GET /users/me/stats 로 러닝 통계를 불러온다.
  /// 미로그인(테스트·비정상 진입)이면 조용히 건너뛴다.
  Future<void> _loadStats() async {
    final token = AuthService.instance.accessToken;
    if (token == null) return;
    if (mounted) setState(() => _statsFailed = false);
    try {
      final stats = await _statsApi.me(accessToken: token);
      if (!mounted) return;
      setState(() => _stats = stats);
    } catch (_) {
      if (!mounted) return;
      setState(() => _statsFailed = true);
    }
  }

  /// 화면 진입 시 GET /auth/me로 세션(닉네임/연결계정 등)을 최신화한다.
  /// 미로그인(테스트·비정상 진입)이면 조용히 건너뛴다.
  Future<void> _refresh() async {
    if (!AuthService.instance.isLoggedIn) return;
    try {
      await AuthService.instance.me();
      if (!mounted) return;
      setState(() {
        if (!_editing) _nick.text = _currentNick;
      });
    } catch (_) {
      // 새로고침 실패는 무시 — 기존 세션 값으로 계속 표시한다.
    }
  }

  /// 표시용 닉네임 — 세션 값이 비어 있으면 목업으로 대체한다.
  String get _currentNick {
    final n = AuthService.instance.user?.nickname;
    return (n != null && n.isNotEmpty) ? n : MockData.myNick;
  }

  /// 연결된 소셜 계정 표시명.
  String get _providerLabel {
    final p = (AuthService.instance.user?.provider ?? '').toLowerCase();
    return switch (p) {
      'kakao' => '카카오',
      'google' => '구글',
      'apple' => 'Apple',
      _ => '카카오',
    };
  }

  /// 계정 요약 — 연결 계정 + (가입일이 있으면) 가입월. createdAt은 GET /auth/me 실데이터.
  String get _accountSummary {
    final createdAt = AuthService.instance.user?.createdAt;
    if (createdAt == null) return '$_providerLabel 로그인';
    return '$_providerLabel 로그인 · ${createdAt.year}년 ${createdAt.month}월 가입';
  }

  @override
  void dispose() {
    _nick.dispose();
    super.dispose();
  }

  void _snack(String m) => ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(m)));

  void _startEdit() {
    _nick.text = _currentNick;
    setState(() => _editing = true);
  }

  /// 편집 저장 — 닉네임이 바뀐 경우에만 PUT /users/me 를 호출한다(변경 없으면 편집만 닫음).
  Future<void> _saveNick() async {
    if (_saving) return;
    setState(() => _saving = true);
    try {
      final changed = await AuthService.instance.changeNickname(_nick.text);
      if (!mounted) return;
      setState(() {
        _editing = false;
        _saving = false;
        _nick.text = _currentNick;
      });
      if (changed) _snack('닉네임 저장됨');
    } catch (_) {
      if (!mounted) return;
      setState(() => _saving = false);
      _snack('닉네임 저장에 실패했어요');
    }
  }

  /// 약관 개정 재동의 (CH-9).
  ///
  /// 서버가 준 "아직 동의하지 않은 시행 중 약관"을 보여주고, 필수 항목을 모두 체크해야 저장된다.
  /// 저장은 POST /users/me/consents 한 번으로 처리하고, 성공하면 목록을 다시 읽어 배지를 갱신한다.
  Future<void> _reconsent() async {
    final token = AuthService.instance.accessToken;
    if (token == null) return;

    final pending = _pending;

    if (pending == null || pending.isEmpty) {
      _snack('재동의가 필요한 약관이 없어요');
      return;
    }

    // 필수 약관은 기본 미동의로 두고 사용자가 직접 체크하게 한다.
    final agreed = {for (final agreement in pending.items) agreement.id: false};

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) {
          // 필수 약관을 전부 체크해야 저장 버튼이 열린다.
          final canSubmit = pending.items
              .where((agreement) => agreement.required)
              .every((agreement) => agreed[agreement.id] == true);

          return AlertDialog(
            title: const Text('변경된 약관에 동의해 주세요'),
            content: SizedBox(
              width: double.maxFinite,
              child: ListView(
                shrinkWrap: true,
                children: [
                  for (final agreement in pending.items) ...[
                    Container(
                      padding: const EdgeInsets.all(AppDimens.md),
                      decoration: BoxDecoration(
                        color: context.palette.surfaceHigh,
                        borderRadius: BorderRadius.circular(AppDimens.radius),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${agreement.title} (v${agreement.version})',
                              style: context.text.labelLarge),
                          const SizedBox(height: 4),
                          Text(
                            agreement.content,
                            maxLines: 4,
                            overflow: TextOverflow.ellipsis,
                            style: context.text.labelMedium
                                ?.copyWith(color: context.palette.muted),
                          ),
                        ],
                      ),
                    ),
                    Row(
                      children: [
                        Checkbox(
                          value: agreed[agreement.id] ?? false,
                          onChanged: (v) =>
                              setLocal(() => agreed[agreement.id] = v ?? false),
                          activeColor: context.scheme.primary,
                        ),
                        Flexible(
                          child: Text(
                            '위 약관에 동의합니다 ${agreement.required ? '(필수)' : '(선택)'}',
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppDimens.sm),
                  ],
                ],
              ),
            ),
            actions: [
              TextButton(
                  onPressed: () => Navigator.pop(ctx, false), child: const Text('나중에')),
              FilledButton(
                onPressed: canSubmit ? () => Navigator.pop(ctx, true) : null,
                child: const Text('재동의'),
              ),
            ],
          );
        },
      ),
    );

    if (ok != true || !mounted) return;

    try {
      await _agreementApi.consent(
        accessToken: token,
        consents: [
          for (final entry in agreed.entries)
            (agreementId: entry.key, isAgreed: entry.value),
        ],
      );
      if (!mounted) return;
      _snack('재동의 완료');
      await _loadPendingConsents();
    } on ApiException catch (e) {
      if (!mounted) return;
      _snack(e.message);
    } catch (_) {
      if (!mounted) return;
      _snack('재동의를 저장하지 못했어요');
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
      // 세션만 해제 — 계정 상태(onboarding/active)는 유지되어 재로그인 시 분기가 재현된다.
      await AuthService.instance.logout();
      if (!mounted) return;
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
            _sectionLabel(context, '최근 경주'),
            const SizedBox(height: AppDimens.sm),
            if (_recent.isEmpty)
              _card(context, [
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: AppDimens.lg),
                  child: Center(
                    child: Text('아직 완료한 경주가 없어요',
                        style: context.text.bodyMedium
                            ?.copyWith(color: context.palette.muted)),
                  ),
                ),
              ])
            else
              _card(context, [for (final r in _recent) _recentRow(context, r)]),
            const SizedBox(height: AppDimens.lg),
            _sectionLabel(context, '설정'),
            const SizedBox(height: AppDimens.sm),
            _card(context, [
              _row(
                left: Text('알림 설정', style: context.text.bodyLarge),
                right: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('시작·종료 알림',
                        style: context.text.bodyMedium?.copyWith(color: context.palette.muted)),
                    const SizedBox(width: 6),
                    Icon(Icons.chevron_right, size: 18, color: context.palette.muted),
                  ],
                ),
                onTap: () => Navigator.of(context).pushNamed('/notification-settings'),
              ),
              _row(
                left: Text('기기 관리', style: context.text.bodyLarge),
                right: Icon(Icons.chevron_right, size: 18, color: context.palette.muted),
                onTap: () => Navigator.of(context).pushNamed('/device-list'),
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
                right: Text(_providerLabel,
                    style: context.text.bodyMedium?.copyWith(color: context.palette.muted)),
              ),
              _row(
                left: Text('약관 · 개인정보 처리방침', style: context.text.bodyLarge),
                right: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_pending?.isEmpty == false) ...[
                      StatusPill(
                        _pending!.hasRequired ? '재동의 필요' : '새 약관',
                        accent: context.palette.gold,
                      ),
                      const SizedBox(width: 6),
                    ],
                    Icon(Icons.chevron_right, size: 18, color: context.palette.muted),
                  ],
                ),
                onTap: _reconsent,
              ),
              _row(
                left: Text('개인정보 관리', style: context.text.bodyLarge),
                right: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('동의 철회 · 탈퇴',
                        style: context.text.bodyMedium?.copyWith(color: context.palette.muted)),
                    const SizedBox(width: 6),
                    Icon(Icons.chevron_right, size: 18, color: context.palette.muted),
                  ],
                ),
                onTap: () => Navigator.of(context).pushNamed('/privacy'),
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
                          onTap: _saving ? null : _saveNick,
                          customBorder: const CircleBorder(),
                          child: Padding(
                            padding: const EdgeInsets.all(4),
                            child: _saving
                                ? SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: context.scheme.primary,
                                    ),
                                  )
                                : Icon(Icons.check, size: 18, color: context.scheme.primary),
                          ),
                        ),
                      ),
                    ),
                  ],
                )
              : Row(
                  children: [
                    const Expanded(child: SizedBox()),
                    Text(_currentNick, style: context.text.titleLarge),
                    Expanded(
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: InkWell(
                          onTap: _startEdit,
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
        // 연결 계정(provider)·가입일(createdAt) 모두 GET /auth/me 실데이터.
        Text(_accountSummary,
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
    return AvatarCircle(_currentNick, size: 84);
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
    final s = _stats;
    // 로딩 전/실패 시에는 '-' 자리표시자로 채운다(레이아웃 흔들림·오버플로우 방지).
    const dash = '-';
    final races = s != null ? '${s.participatedRoomCount}' : dash;
    final wins = s != null ? '${s.winCount}' : dash;
    // 서버는 미터(m)로 주므로 km로 변환해 표시한다.
    final km = s != null ? (s.totalRunningDistanceMeter / 1000).toStringAsFixed(1) : dash;
    // completedRate는 0~100 정수 퍼센트 — 숫자는 그대로, '%'는 접미사로 더 작게 표시한다.
    final rate = s != null ? '${s.completedRate}' : dash;
    final rateSuffix = s != null ? '%' : null;
    return Column(
      children: [
        Row(
          children: [
            Expanded(child: StatTile(value: races, label: '경쟁')),
            const SizedBox(width: AppDimens.sm),
            Expanded(child: StatTile(value: wins, label: '우승')),
            const SizedBox(width: AppDimens.sm),
            Expanded(child: StatTile(value: km, label: '총 km')),
            const SizedBox(width: AppDimens.sm),
            Expanded(child: StatTile(value: rate, valueSuffix: rateSuffix, label: '완주율')),
          ],
        ),
        if (_statsFailed) ...[
          const SizedBox(height: AppDimens.sm),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('통계를 불러오지 못했어요',
                  style: context.text.labelMedium?.copyWith(color: context.palette.muted)),
              const SizedBox(width: AppDimens.xs),
              TextButton(
                onPressed: _loadStats,
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: AppDimens.sm),
                  minimumSize: const Size(0, 32),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: const Text('다시 시도'),
              ),
            ],
          ),
        ],
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

  Widget _recentRow(BuildContext context, RaceHistoryItem item) {
    final dimmed = item.isCancelled || !item.didFinish;
    final badge = item.isCancelled
        ? '취소됨'
        : !item.didFinish
            ? '미완주'
            : '${item.myFinalRank ?? '-'}위';

    String two(int n) => n.toString().padLeft(2, '0');
    final goalKm = (item.goalDistanceMeter / 1000)
        .toStringAsFixed(item.goalDistanceMeter % 1000 == 0 ? 0 : 1);
    final meta =
        '${two(item.startOn.month)}-${two(item.startOn.day)} · 목표 ${goalKm}km';

    return InkWell(
      onTap: () => Navigator.of(context).pushNamed('/result', arguments: item.id),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppDimens.md),
        child: Row(
          children: [
            AvatarCircle(item.title, size: 32),
            const SizedBox(width: AppDimens.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: context.text.titleMedium),
                  Text(meta,
                      style: context.text.labelMedium
                          ?.copyWith(color: context.palette.muted)),
                ],
              ),
            ),
            const SizedBox(width: AppDimens.sm),
            StatusPill(badge,
                accent: dimmed ? context.palette.muted : context.palette.gold),
          ],
        ),
      ),
    );
  }
}

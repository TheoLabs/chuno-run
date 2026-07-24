import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/api/room_api.dart';
import '../../core/auth/auth_service.dart';
import '../../core/config/room_limits.dart';
import '../../design_system/app_dimens.dart';
import '../../design_system/app_palette.dart';
import '../../design_system/widgets.dart';
import '../../mock/mock_data.dart';

/// 대기실 — GET /rooms/:id 로 방 상세를 불러와 렌더한다.
///
/// [roomId]는 홈/초대 화면에서 라우트 arguments(int)로 전달된다. 테스트에서는
/// [roomApi]에 가짜 구현을 주입해 네트워크 없이 검증한다.
class WaitingRoomScreen extends StatefulWidget {
  const WaitingRoomScreen({super.key, this.roomId, this.roomApi});

  final int? roomId;
  final RoomApi? roomApi;

  @override
  State<WaitingRoomScreen> createState() => _WaitingRoomScreenState();
}

class _WaitingRoomScreenState extends State<WaitingRoomScreen> {
  late final RoomApi _roomApi = widget.roomApi ?? HttpRoomApi();

  RoomDetail? _detail;

  /// 화면에 보여줄 참가자 목록. 서버 응답을 복사해 두고, 방장 강퇴 성공 시
  /// 해당 참가자를 로컬에서 제거해 반영한다.
  List<RoomParticipant> _participants = const [];

  bool _loading = true;
  bool _failed = false;

  /// 방 나가기 요청 진행 중 — 중복 탭 방지.
  bool _exiting = false;

  /// 방 삭제(취소) 요청 진행 중 — 중복 탭 방지.
  bool _cancelling = false;

  /// 강퇴 요청 진행 중인 참가자의 userId 집합 — 같은 참가자 중복 탭 방지.
  final Set<int> _kicking = {};
  Timer? _ticker;

  /// 서버 상태를 다시 읽는 주기 — 자동 모집 마감·출발·취소를 감지한다.
  Timer? _poller;

  /// 자동 전이로 화면을 이미 넘겼는지 — 중복 네비게이션 방지.
  bool _navigated = false;

  /// 로그인 사용자가 방장(hostUserId)과 같은지.
  bool get _isHost {
    final me = AuthService.instance.user?.id;
    final host = _detail?.hostUserId;
    return me != null && host != null && me == host;
  }

  @override
  void initState() {
    super.initState();
    _load();
    // 카운트다운 갱신용 1초 틱.
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && _detail != null) setState(() {});
    });
    // 시작 10분 전 모집 마감·시작 시각 출발·인원 미달 취소는 모두 서버가 자동 전이시킨다(CH-13).
    // 대기실은 그 결과를 짧은 주기로 확인해 화면을 넘긴다.
    _poller = Timer.periodic(const Duration(seconds: 3), (_) => _load(silent: true));
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _poller?.cancel();
    super.dispose();
  }

  /// 방 상세를 다시 읽는다. [silent] 면 로딩 스피너·에러 화면을 띄우지 않는다(주기 폴링용).
  Future<void> _load({bool silent = false}) async {
    final id = widget.roomId;
    final token = AuthService.instance.accessToken;
    if (id == null || token == null) {
      if (mounted && !silent) {
        setState(() {
          _loading = false;
          _failed = true;
        });
      }
      return;
    }
    if (mounted && !silent) {
      setState(() {
        _loading = true;
        _failed = false;
      });
    }
    try {
      final detail = await _roomApi.retrieve(accessToken: token, id: id);
      if (!mounted) return;
      setState(() {
        _detail = detail;
        _participants = List.of(detail.participants);
        _loading = false;
      });
      _handleStatus(detail);
    } catch (_) {
      if (!mounted || silent) return;
      setState(() {
        _loading = false;
        _failed = true;
      });
    }
  }

  /// 서버가 방을 전이시켰으면 그에 맞는 화면으로 넘긴다.
  /// - live  → 경주 화면 (전원 동시 출발)
  /// - cancelled → 자동 취소 안내 (모집 마감 시점에 2명 미만)
  /// - finished  → 결과 화면 (돌아왔더니 이미 끝난 경우)
  void _handleStatus(RoomDetail detail) {
    if (_navigated || !mounted) return;

    final route = switch (detail.status) {
      'live' => '/race',
      'cancelled' => '/race-cancelled',
      'finished' => '/result',
      _ => null,
    };

    if (route == null) return;

    _navigated = true;
    _poller?.cancel();
    Navigator.of(context).pushReplacementNamed(route, arguments: detail.id);
  }

  Future<void> _confirmKick(RoomParticipant pl) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('강퇴하시겠습니까?'),
        content: Text('${pl.nickname} 님을 방에서 제거합니다.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('취소')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: context.palette.danger),
            child: const Text('강퇴'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    await _kick(pl);
  }

  /// 강퇴 API 호출 → 성공 시 로컬 목록에서 제거(깜빡임 없이 즉시 반영).
  Future<void> _kick(RoomParticipant pl) async {
    if (_kicking.contains(pl.userId)) return;
    final id = widget.roomId;
    final token = AuthService.instance.accessToken;
    if (id == null || token == null) return;
    setState(() => _kicking.add(pl.userId));
    try {
      // 경로의 participantId 자리에는 참가자 row id(RoomParticipant.id)를 넘긴다.
      await _roomApi.kick(accessToken: token, roomId: id, participantId: pl.id);
      if (!mounted) return;
      setState(() {
        _kicking.remove(pl.userId);
        _participants.remove(pl);
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _kicking.remove(pl.userId));
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      if (!mounted) return;
      setState(() => _kicking.remove(pl.userId));
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('강퇴하지 못했어요')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(),
        title: const Text('대기실'),
        actions: [
          if (_detail != null) ...[
            Center(child: _statusPill(context, _detail!.status)),
            const SizedBox(width: AppDimens.xs),
          ],
          if (_detail != null && _isHost)
            IconButton(
              icon: const Icon(Icons.more_vert),
              onPressed: _openRoomMenu,
            ),
          const SizedBox(width: AppDimens.xs),
        ],
      ),
      body: SafeArea(child: _body(context)),
    );
  }

  Widget _body(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_failed || _detail == null) {
      return _errorState(context);
    }
    final detail = _detail!;
    final p = context.palette;
    return ListView(
      padding: const EdgeInsets.all(AppDimens.screenPad),
      children: [
        Text(detail.title, style: context.text.titleLarge),
        const SizedBox(height: AppDimens.md),
        _countdownCard(context, detail.startOn),
        const SizedBox(height: AppDimens.md),
        _statsRow(context, detail),
        const SizedBox(height: AppDimens.lg),
        SectionLabel(
          '참가자',
          trailing: Text('${_participants.length} / ${detail.capacity}',
              style: context.text.labelMedium?.copyWith(color: p.muted)),
        ),
        const SizedBox(height: AppDimens.md),
        _playerGrid(context, detail),
        const SizedBox(height: AppDimens.xl),
        // 출발은 서버가 시작 시각에 전원을 동시에 내보낸다(수동 시작 없음).
        // 방장은 방 취소를, 참가자는 방 나가기를 할 수 있다.
        _autoStartNotice(context, detail),
        const SizedBox(height: AppDimens.md),
        if (!_isHost)
          OutlinedButton(
            onPressed: _exiting ? null : _confirmExit,
            style: OutlinedButton.styleFrom(
              foregroundColor: p.danger,
              side: BorderSide(color: p.danger.withValues(alpha: 0.5)),
            ),
            child: const Text('방 나가기'),
          ),
      ],
    );
  }

  /// 자동 진행 안내 — 지금 방이 어느 단계인지, 다음에 무슨 일이 일어나는지 알려준다.
  Widget _autoStartNotice(BuildContext context, RoomDetail detail) {
    final p = context.palette;
    final isReady = detail.status == 'ready';

    final message = isReady
        ? '모집이 마감됐어요. 시작 시각이 되면 참가자 전원이 동시에 출발합니다. 앱을 켜둔 채로 기다려 주세요.'
        : '시작 10분 전에 모집이 자동 마감되고, 그때 참가자가 2명 미만이면 경주가 취소돼요.';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppDimens.lg),
      decoration: BoxDecoration(
        color: p.surfaceHigh,
        borderRadius: BorderRadius.circular(AppDimens.radius),
        border: Border.all(color: isReady ? p.success.withValues(alpha: 0.5) : p.outline),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            isReady ? Icons.flag_outlined : Icons.info_outline,
            size: 18,
            color: isReady ? p.success : p.muted,
          ),
          const SizedBox(width: AppDimens.sm),
          Expanded(
            child: Text(message, style: context.text.bodyMedium?.copyWith(color: p.muted)),
          ),
        ],
      ),
    );
  }

  /// 방 나가기 확인 다이얼로그 → 확인 시 exit API 호출.
  Future<void> _confirmExit() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('방에서 나가시겠습니까?'),
        content: const Text(
            '나가면 참가자 목록에서 제외됩니다. 다시 참가하려면 방 목록에서 재입장해야 합니다.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('취소')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: context.palette.danger),
            child: const Text('나가기'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    await _exit();
  }

  Future<void> _exit() async {
    if (_exiting) return;
    final id = widget.roomId;
    final token = AuthService.instance.accessToken;
    if (id == null || token == null) return;
    setState(() => _exiting = true);
    try {
      await _roomApi.exit(accessToken: token, id: id);
      if (!mounted) return;
      Navigator.of(context).pop(); // 홈으로 복귀 — 목록 자동 갱신.
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _exiting = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      if (!mounted) return;
      setState(() => _exiting = false);
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('나가지 못했어요')));
    }
  }

  Widget _errorState(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('방 정보를 불러오지 못했어요',
              style: context.text.bodyMedium?.copyWith(color: context.palette.muted)),
          const SizedBox(height: AppDimens.sm),
          OutlinedButton(onPressed: _load, child: const Text('다시 시도')),
        ],
      ),
    );
  }

  Widget _statusPill(BuildContext context, String status) {
    final s = roomStatusFromString(status);
    return StatusPill(s.label, accent: s.color, solid: s == RoomStatus.live);
  }

  Widget _countdownCard(BuildContext context, DateTime startOn) {
    final diff = startOn.difference(DateTime.now());
    final value = diff.inSeconds <= 0 ? '곧 시작' : _countdown(diff);
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppDimens.xl),
        child: Column(
          children: [
            Text('시작까지',
                style: context.text.labelMedium?.copyWith(color: context.palette.muted)),
            const SizedBox(height: 2),
            Text(value, style: context.text.displaySmall),
          ],
        ),
      ),
    );
  }

  /// 남은 시간 포맷 — 1시간 이상이면 H:MM:SS, 이내면 MM:SS.
  String _countdown(Duration d) {
    String two(int n) => n.toString().padLeft(2, '0');
    final h = d.inHours;
    final m = d.inMinutes % 60;
    final s = d.inSeconds % 60;
    return h > 0 ? '$h:${two(m)}:${two(s)}' : '${two(m)}:${two(s)}';
  }

  Widget _statsRow(BuildContext context, RoomDetail detail) {
    final km = detail.goalDistanceMeter / 1000;
    final goalLabel =
        '${km.toStringAsFixed(detail.goalDistanceMeter % 1000 == 0 ? 0 : 1)}km';
    return Row(
      children: [
        Expanded(child: StatTile(value: goalLabel, label: '목표 거리')),
        const SizedBox(width: AppDimens.sm),
        Expanded(child: StatTile(value: '${detail.goalLimitMinutes}분', label: '제한 시간')),
        const SizedBox(width: AppDimens.sm),
        Expanded(
          child: StatTile(
            value: _paceLabel(detail.goalDistanceMeter, detail.goalLimitMinutes),
            label: '완주 기준 페이스',
          ),
        ),
      ],
    );
  }

  /// 완주 기준 페이스(분'초"/km) — 제한시간·거리로 계산.
  String _paceLabel(int goalMeter, int limitMinutes) {
    final km = goalMeter / 1000;
    if (km <= 0 || limitMinutes <= 0) return "--'--\"";
    final sec = (limitMinutes * 60 / km).round();
    String two(int n) => n < 10 ? '0$n' : '$n';
    return "${sec ~/ 60}'${two(sec % 60)}\"";
  }

  // 참가자 그리드 — border 없는 타일, 폭에 맞춰 열 자동 확장
  Widget _playerGrid(BuildContext context, RoomDetail detail) {
    final capacity = detail.capacity;
    final tiles = <Widget>[
      ..._participants.map((pl) => _playerTile(context, pl, detail.hostUserId)),
      for (var i = _participants.length; i < capacity; i++) _emptyTile(context),
    ];
    return GridView(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: EdgeInsets.zero,
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 120,
        mainAxisSpacing: AppDimens.lg,
        crossAxisSpacing: AppDimens.sm,
        childAspectRatio: 0.82,
      ),
      children: tiles,
    );
  }

  Widget _playerTile(BuildContext context, RoomParticipant pl, int hostUserId) {
    final isPlayerHost = pl.userId == hostUserId;
    final avatarLabel = pl.nickname.isNotEmpty ? pl.nickname : '?';
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        AvatarCircle(avatarLabel, size: 48),
        const SizedBox(height: AppDimens.sm),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Text(pl.nickname,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: context.text.labelLarge),
        ),
        const SizedBox(height: AppDimens.sm),
        if (isPlayerHost)
          StatusPill('방장', accent: context.palette.gold)
        else if (_isHost)
          OutlinedButton(
            onPressed: _kicking.contains(pl.userId) ? null : () => _confirmKick(pl),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(0, 28),
              padding: const EdgeInsets.symmetric(horizontal: AppDimens.md),
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              visualDensity: VisualDensity.compact,
              textStyle: context.text.labelMedium,
              foregroundColor: context.palette.danger,
              side: BorderSide(color: context.palette.danger.withValues(alpha: 0.4)),
            ),
            child: const Text('강퇴'),
          )
        else
          const SizedBox.shrink(),
      ],
    );
  }

  Widget _emptyTile(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 48,
          height: 48,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: context.palette.outline, width: 1.5),
          ),
          child: Icon(Icons.person_add_alt_1, size: 20, color: context.palette.muted),
        ),
        const SizedBox(height: AppDimens.sm),
        Text('빈 자리',
            style: context.text.labelMedium?.copyWith(color: context.palette.muted)),
      ],
    );
  }

  // 방 관리 메뉴 — 트렌디한 바텀 액션 시트 (방장 전용, 서버 연동은 범위 밖)
  void _openRoomMenu() {
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
              child: Text('방 관리',
                  style: context.text.labelMedium?.copyWith(color: context.palette.muted)),
            ),
            _menuTile(
              icon: Icons.tune,
              label: '방 조건 변경',
              onTap: () {
                Navigator.pop(ctx);
                _openEditSheet();
              },
            ),
            _menuTile(
              icon: Icons.delete_outline,
              label: '방 삭제',
              danger: true,
              onTap: () {
                Navigator.pop(ctx);
                _confirmDelete();
              },
            ),
            const SizedBox(height: AppDimens.sm),
          ],
        ),
      ),
    );
  }

  Widget _menuTile({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    bool danger = false,
  }) {
    final accent = danger ? context.palette.danger : context.scheme.primary;
    final labelColor = danger ? context.palette.danger : context.scheme.onSurface;
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
            Text(label, style: context.text.titleMedium?.copyWith(color: labelColor)),
          ],
        ),
      ),
    );
  }

  // 방 조건 변경 — 하단 시트 (방장 전용). 현재 값으로 프리필하고, '적용' 시 변경된
  // 필드만 diff로 PUT /rooms/:id 에 보낸다(모집 중에만 가능). 성공 시 상세를 새로고침한다.
  Future<void> _openEditSheet() async {
    final detail = _detail;
    final token = AuthService.instance.accessToken;
    final id = widget.roomId;
    if (detail == null || token == null || id == null) return;

    final changed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _EditRoomSheet(
        detail: detail,
        currentParticipants: _participants.length,
        roomApi: _roomApi,
        accessToken: token,
        roomId: id,
      ),
    );
    if (changed != true || !mounted) return;
    await _load(); // 상세 새로고침 — 페이스·정원 즉시 반영.
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('방 조건을 변경했어요')));
  }

  Future<void> _confirmDelete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('방을 삭제하시겠습니까?'),
        content: const Text('삭제하면 참가자에게 취소가 안내되고 방이 사라집니다.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('취소')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: context.palette.danger),
            child: const Text('삭제'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    await _cancel();
  }

  /// 방 취소 API 호출 → 성공 시 홈(방 목록)으로 복귀. 방장이 자기 방을 삭제한
  /// 것이므로 대기실을 pop 해 목록이 자동 갱신되게 한다.
  Future<void> _cancel() async {
    if (_cancelling) return;
    final id = widget.roomId;
    final token = AuthService.instance.accessToken;
    if (id == null || token == null) return;
    setState(() => _cancelling = true);
    try {
      await _roomApi.cancel(accessToken: token, id: id);
      if (!mounted) return;
      Navigator.of(context).pop(); // 홈으로 복귀 — 목록 자동 갱신.
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _cancelling = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      if (!mounted) return;
      setState(() => _cancelling = false);
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('방을 삭제하지 못했어요')));
    }
  }
}

/// 방 조건 변경 하단 시트 (방장 전용). 컨트롤러를 자체 State가 소유해 dispose까지
/// 안전하게 관리하고, '적용' 시 변경된 필드만 diff로 PUT 한다.
///
/// 성공 시 `Navigator.pop(context, true)`로 닫혀 호출부가 상세를 새로고침한다.
/// 실패/검증 위반은 시트 안에서 SnackBar로 안내하고 열린 채로 둔다.
class _EditRoomSheet extends StatefulWidget {
  const _EditRoomSheet({
    required this.detail,
    required this.currentParticipants,
    required this.roomApi,
    required this.accessToken,
    required this.roomId,
  });

  final RoomDetail detail;
  final int currentParticipants;
  final RoomApi roomApi;
  final String accessToken;
  final int roomId;

  @override
  State<_EditRoomSheet> createState() => _EditRoomSheetState();
}

class _EditRoomSheetState extends State<_EditRoomSheet> {
  late final TextEditingController _goalCtrl;
  late final TextEditingController _limitCtrl;
  late final TextEditingController _capCtrl;

  /// 적용 요청 진행 중 — 중복 탭 방지.
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final d = widget.detail;
    _goalCtrl = TextEditingController(
        text: (d.goalDistanceMeter / 1000)
            .toStringAsFixed(d.goalDistanceMeter % 1000 == 0 ? 0 : 1));
    _limitCtrl = TextEditingController(text: '${d.goalLimitMinutes}');
    _capCtrl = TextEditingController(text: '${d.capacity}');
  }

  @override
  void dispose() {
    _goalCtrl.dispose();
    _limitCtrl.dispose();
    _capCtrl.dispose();
    super.dispose();
  }

  String _paceLabel() {
    final g = double.tryParse(_goalCtrl.text) ?? 0;
    final l = double.tryParse(_limitCtrl.text) ?? 0;
    if (g <= 0 || l <= 0) return "--'--\"";
    final sec = (l * 60 / g).round();
    String two(int n) => n < 10 ? '0$n' : '$n';
    return "${sec ~/ 60}'${two(sec % 60)}\"";
  }

  // '적용' — 클라 검증 후 변경된 필드만 diff로 서버에 보낸다.
  Future<void> _apply() async {
    final d = widget.detail;
    void warn(String m) =>
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

    // 입력 파싱 (목표 거리는 km, 소수 허용).
    final km = double.tryParse(_goalCtrl.text.trim());
    final limit = int.tryParse(_limitCtrl.text.trim());
    final cap = int.tryParse(_capCtrl.text.trim());

    // 클라 검증 — 목표 거리(0.1~100km)·제한 시간(5~1,440분) 상·하한 (서버 검증과 중복돼도 OK).
    if (km == null || !isGoalDistanceKmInRange(km)) {
      warn(kGoalDistanceRangeMessage);
      return;
    }
    if (limit == null || !isGoalLimitMinutesInRange(limit)) {
      warn(kGoalLimitRangeMessage);
      return;
    }
    if (cap == null || cap < 2) {
      warn('최대 인원은 2명 이상이어야 해요');
      return;
    }
    if (cap < widget.currentParticipants) {
      warn('최대 인원은 현재 참가자 수(${widget.currentParticipants}명)보다 적을 수 없어요');
      return;
    }

    // km → m 변환 후 원본 대비 diff (바뀐 필드만 전송).
    final meter = (km * 1000).round();
    final nextGoal = meter != d.goalDistanceMeter ? meter : null;
    final nextLimit = limit != d.goalLimitMinutes ? limit : null;
    final nextCap = cap != d.capacity ? cap : null;
    if (nextGoal == null && nextLimit == null && nextCap == null) {
      Navigator.pop(context, false); // 변경 없음 — 요청 없이 닫기.
      return;
    }

    // BuildContext는 await를 건너 쓰지 않도록 미리 캡처한다.
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _saving = true);
    try {
      await widget.roomApi.changeSetting(
        accessToken: widget.accessToken,
        id: widget.roomId,
        goalDistanceMeter: nextGoal,
        goalLimitMinutes: nextLimit,
        capacity: nextCap,
      );
      if (!mounted) return;
      navigator.pop(true); // 성공 — 호출부가 상세를 새로고침한다.
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      if (!mounted) return;
      setState(() => _saving = false);
      messenger.showSnackBar(const SnackBar(content: Text('방 조건을 변경하지 못했어요')));
    }
  }

  Widget _field(String label, TextEditingController c) => Padding(
        padding: const EdgeInsets.only(bottom: AppDimens.sm),
        child: Row(
          children: [
            Expanded(child: Text(label, style: context.text.bodyMedium)),
            SizedBox(
              width: 96,
              child: TextField(
                controller: c,
                textAlign: TextAlign.center,
                keyboardType: TextInputType.number,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(
                  isDense: true,
                  contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                ),
              ),
            ),
          ],
        ),
      );

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: AppDimens.screenPad,
        right: AppDimens.screenPad,
        top: AppDimens.xl,
        bottom: MediaQuery.of(context).viewInsets.bottom + AppDimens.xl,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('방 조건 변경', style: context.text.titleLarge),
              Text('모집 중에만 가능',
                  style: context.text.labelMedium?.copyWith(color: context.palette.muted)),
            ],
          ),
          const SizedBox(height: AppDimens.lg),
          _field('목표 거리 (km)', _goalCtrl),
          _field('제한 시간 (분)', _limitCtrl),
          _field('최대 인원', _capCtrl),
          const SizedBox(height: AppDimens.xs),
          Text('→ 완주 기준 페이스 ${_paceLabel()}/km',
              style: context.text.labelMedium?.copyWith(color: context.palette.muted)),
          const SizedBox(height: AppDimens.lg),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _saving ? null : () => Navigator.pop(context, false),
                  child: const Text('닫기'),
                ),
              ),
              const SizedBox(width: AppDimens.sm),
              Expanded(
                child: FilledButton(
                  onPressed: _saving ? null : _apply,
                  child: _saving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('적용'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

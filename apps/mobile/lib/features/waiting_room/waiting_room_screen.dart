import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/api/room_api.dart';
import '../../core/auth/auth_service.dart';
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

  /// 화면에 보여줄 참가자 목록. 서버 응답을 복사해 두고, 방장 강퇴 등
  /// 로컬 상호작용을 반영한다(강퇴 서버 연동은 이번 범위 밖).
  List<RoomParticipant> _participants = const [];

  bool _loading = true;
  bool _failed = false;

  /// 방 나가기 요청 진행 중 — 중복 탭 방지.
  bool _exiting = false;
  Timer? _ticker;

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
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    final id = widget.roomId;
    final token = AuthService.instance.accessToken;
    if (id == null || token == null) {
      if (mounted) {
        setState(() {
          _loading = false;
          _failed = true;
        });
      }
      return;
    }
    if (mounted) {
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
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _failed = true;
      });
    }
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
    // 강퇴 서버 엔드포인트는 아직 없어 로컬 목록에서만 제거한다.
    if (ok == true && mounted) setState(() => _participants.remove(pl));
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
        // 방장: 경주 시작 / 비방장 참가자: 방 나가기.
        if (_isHost)
          FilledButton(
            onPressed: () => Navigator.of(context).pushReplacementNamed('/race'),
            child: const Text('경주 시작'),
          )
        else
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
            onPressed: () => _confirmKick(pl),
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

  // 방 조건 변경 — 하단 시트 (방장 전용). 현재 값으로 프리필하되 적용 서버 연동은 범위 밖.
  void _openEditSheet() {
    final detail = _detail;
    final goalCtrl = TextEditingController(
        text: detail != null ? (detail.goalDistanceMeter / 1000).toStringAsFixed(
            detail.goalDistanceMeter % 1000 == 0 ? 0 : 1) : '');
    final limitCtrl =
        TextEditingController(text: detail != null ? '${detail.goalLimitMinutes}' : '');
    final capCtrl = TextEditingController(text: detail != null ? '${detail.capacity}' : '');
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) {
          String paceLabel() {
            final g = double.tryParse(goalCtrl.text) ?? 0;
            final l = double.tryParse(limitCtrl.text) ?? 0;
            if (g <= 0 || l <= 0) return "--'--\"";
            final sec = (l * 60 / g).round();
            String two(int n) => n < 10 ? '0$n' : '$n';
            return "${sec ~/ 60}'${two(sec % 60)}\"";
          }

          Widget field(String label, TextEditingController c) => Padding(
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
                        onChanged: (_) => setSheet(() {}),
                        decoration: const InputDecoration(
                          isDense: true,
                          contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                        ),
                      ),
                    ),
                  ],
                ),
              );

          return Padding(
            padding: EdgeInsets.only(
              left: AppDimens.screenPad,
              right: AppDimens.screenPad,
              top: AppDimens.xl,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + AppDimens.xl,
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
                field('목표 거리 (km)', goalCtrl),
                field('제한 시간 (분)', limitCtrl),
                field('최대 인원', capCtrl),
                const SizedBox(height: AppDimens.xs),
                Text('→ 완주 기준 페이스 ${paceLabel()}/km',
                    style: context.text.labelMedium?.copyWith(color: context.palette.muted)),
                const SizedBox(height: AppDimens.lg),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(ctx),
                        child: const Text('닫기'),
                      ),
                    ),
                    const SizedBox(width: AppDimens.sm),
                    Expanded(
                      child: FilledButton(
                        onPressed: () => Navigator.pop(ctx),
                        child: const Text('적용'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    ).whenComplete(() {
      goalCtrl.dispose();
      limitCtrl.dispose();
      capCtrl.dispose();
    });
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
    if (ok == true && mounted) {
      Navigator.of(context).pushReplacementNamed('/race-cancelled');
    }
  }
}

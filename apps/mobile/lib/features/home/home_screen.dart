import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/api/room_api.dart';
import '../../core/auth/auth_service.dart';
import '../../design_system/app_dimens.dart';
import '../../design_system/app_palette.dart';
import '../../design_system/widgets.dart';
import '../../mock/mock_data.dart';

enum _Filter { all, recruiting, live }

extension on _Filter {
  String get label => switch (this) {
        _Filter.all => '전체',
        _Filter.recruiting => '모집중',
        _Filter.live => '진행중',
      };
}

String _two(int n) => n.toString().padLeft(2, '0');

/// 예: 오전 7:00 / 오후 8:30 (12시간제).
String _clockLabel(DateTime dt) {
  final ampm = dt.hour < 12 ? '오전' : '오후';
  final h12 = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
  return '$ampm $h12:${_two(dt.minute)}';
}

/// 시작까지 남은 시간. 1시간 초과면 '시간(+분)', 이내면 '분', 지났으면 '곧 시작'.
String _startsInLabel(DateTime start) {
  final diff = start.difference(DateTime.now());
  if (diff.inSeconds <= 0) return '곧 시작';
  if (diff.inMinutes < 60) return '${diff.inMinutes}분 후';
  final h = diff.inHours;
  final m = diff.inMinutes % 60;
  return m == 0 ? '$h시간 후' : '$h시간 $m분 후';
}

/// 진행중 방의 시작 이후 경과 시간 (MM:SS).
String _elapsedLabel(DateTime start) {
  final s = DateTime.now().difference(start).inSeconds;
  final clamped = s < 0 ? 0 : s;
  return '${_two(clamped ~/ 60)}:${_two(clamped % 60)}';
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final RoomApi _roomApi = HttpRoomApi();

  _Filter _filter = _Filter.all;

  static const double _distMax = 12; // km
  static const double _limitMax = 120; // 분
  RangeValues _dist = const RangeValues(0, _distMax);
  RangeValues _limit = const RangeValues(0, _limitMax);

  List<RoomSummary> _rooms = const [];
  bool _loading = true;
  bool _failed = false;

  /// 참가 요청 진행 중인 방 id (중복 탭 방지). null이면 진행 중 아님.
  int? _joiningRoomId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  /// GET /rooms 로 참여 가능한 방 목록을 불러와 카드용 [RoomSummary]로 변환한다.
  Future<void> _load() async {
    final token = AuthService.instance.accessToken;
    if (token == null) {
      // 미로그인(테스트·비정상 진입) — 빈 목록으로 둔다.
      if (mounted) setState(() => _loading = false);
      return;
    }
    if (mounted) setState(() => _failed = false);
    try {
      final items = await _roomApi.list(accessToken: token);
      if (!mounted) return;
      setState(() {
        _rooms = items.map(_summaryOf).toList();
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

  /// '참가' 버튼 → POST /rooms/:id/join 후 대기실로 진입한다.
  ///
  /// '이미 참가한 유저'는 오류가 아니라 정상 흐름으로 보고 그대로 대기실로 넘긴다.
  /// 그 외 서버 오류(모집 마감·정원 초과 등)는 서버 메시지를 스낵바로 노출하고 목록을 갱신한다.
  Future<void> _joinAndEnter(RoomSummary room) async {
    final id = room.id;
    final token = AuthService.instance.accessToken;
    if (id == null || token == null) return;
    if (_joiningRoomId != null) return; // 이미 참가 진행 중
    setState(() => _joiningRoomId = id);
    try {
      await _roomApi.join(accessToken: token, id: id);
      if (!mounted) return;
      await Navigator.of(context).pushNamed('/waiting-room', arguments: id);
      if (mounted) _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.message.contains('이미 참가')) {
        // 이미 참가한 유저 — 오류로 취급하지 않고 그대로 대기실로 진입한다.
        await Navigator.of(context).pushNamed('/waiting-room', arguments: id);
        if (mounted) _load();
      } else {
        // 모집 마감·정원 초과 등 — 서버 메시지를 그대로 노출하고 목록을 갱신한다.
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
        _load();
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('참가하지 못했어요')));
    } finally {
      if (mounted) setState(() => _joiningRoomId = null);
    }
  }

  /// '입장' 버튼 → 이미 참가한 방이므로 join 호출 없이 바로 대기실로 진입한다.
  /// 복귀 시 목록을 갱신해 참가 인원·상태 변화를 반영한다.
  Future<void> _enterRoom(RoomSummary room) async {
    final id = room.id;
    if (id == null) return;
    await Navigator.of(context).pushNamed('/waiting-room', arguments: id);
    if (mounted) _load();
  }

  /// 서버 항목 → 홈 카드 뷰모델. 시작 시각/경과 라벨은 여기(표현 계층)에서 파생한다.
  RoomSummary _summaryOf(RoomListItem r) {
    final status = roomStatusFromString(r.status);
    final isLive = status == RoomStatus.live;
    final isJoinable = status == RoomStatus.recruiting || status == RoomStatus.ready;
    final myId = AuthService.instance.user?.id;
    return RoomSummary(
      id: r.id,
      isMine: myId != null && r.hostUserId == myId,
      isJoined: r.isJoined,
      title: r.title,
      goalMeter: r.goalDistanceMeter,
      limitMinutes: r.goalLimitMinutes,
      joined: r.currentParticipantCount,
      capacity: r.capacity,
      status: status,
      liveElapsed: isLive ? _elapsedLabel(r.startOn) : null,
      startTimeLabel: isLive ? null : _clockLabel(r.startOn),
      startsInLabel: isJoinable ? _startsInLabel(r.startOn) : null,
    );
  }

  bool get _filterActive =>
      _filter != _Filter.all ||
      _dist.start > 0 ||
      _dist.end < _distMax ||
      _limit.start > 0 ||
      _limit.end < _limitMax;

  List<RoomSummary> get _visible => _rooms.where((r) {
        final statusOk = switch (_filter) {
          _Filter.all => true,
          _Filter.recruiting => r.status == RoomStatus.recruiting,
          _Filter.live => r.status == RoomStatus.live,
        };
        final km = r.goalMeter / 1000;
        final distOk = km >= _dist.start && km <= _dist.end;
        final timeOk = r.limitMinutes >= _limit.start && r.limitMinutes <= _limit.end;
        return statusOk && distOk && timeOk;
      }).toList();

  void _openInvite() {
    final controller = TextEditingController();
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
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
            Text('초대 코드로 참가', style: context.text.titleLarge),
            const SizedBox(height: AppDimens.xs),
            Text('방장에게 받은 6자리 코드를 입력하세요',
                style: context.text.bodyMedium?.copyWith(color: context.palette.muted)),
            const SizedBox(height: AppDimens.lg),
            TextField(
              controller: controller,
              textAlign: TextAlign.center,
              textCapitalization: TextCapitalization.characters,
              style: context.text.titleLarge?.copyWith(letterSpacing: 4),
              decoration: const InputDecoration(hintText: 'RUN421'),
            ),
            const SizedBox(height: AppDimens.lg),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(ctx),
                    child: const Text('취소'),
                  ),
                ),
                const SizedBox(width: AppDimens.sm),
                Expanded(
                  child: FilledButton(
                    onPressed: () {
                      Navigator.pop(ctx);
                      Navigator.of(context).pushNamed('/waiting-room');
                    },
                    child: const Text('입장하기'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final visible = _visible;
    final nick = AuthService.instance.user?.nickname;
    final displayNick = (nick != null && nick.isNotEmpty) ? nick : MockData.myNick;
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text('추노'),
      ),
      floatingActionButton: FloatingActionButton(
        // 방 생성 화면에서 돌아오면 목록을 다시 불러와 새로 만든 방을 반영한다.
        onPressed: () async {
          await Navigator.of(context).pushNamed('/room-create');
          if (mounted) _load();
        },
        child: const Icon(Icons.add),
      ),
      body: Stack(
        children: [
          RefreshIndicator(
            onRefresh: _load,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(
                  AppDimens.screenPad, AppDimens.sm, AppDimens.screenPad, 96),
              children: [
                Text.rich(
                  TextSpan(
                    text: '안녕하세요, ',
                    style: context.text.bodyLarge?.copyWith(color: context.palette.muted),
                    children: [
                      TextSpan(
                        text: displayNick,
                        style: context.text.bodyLarge?.copyWith(
                          color: context.scheme.onSurface,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const TextSpan(text: ' 님 👋'),
                    ],
                  ),
                ),
                const SizedBox(height: AppDimens.lg),
                SectionLabel(
                  '경쟁 방',
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (!_loading && !_failed)
                        Text('${visible.length}개',
                            style: context.text.labelMedium?.copyWith(color: context.palette.muted)),
                      const SizedBox(width: AppDimens.sm),
                      InkWell(
                        borderRadius: BorderRadius.circular(AppDimens.radius),
                        onTap: _openFilter,
                        child: Padding(
                          padding: const EdgeInsets.all(4),
                          child: Badge(
                            isLabelVisible: _filterActive,
                            smallSize: 7,
                            backgroundColor: context.scheme.primary,
                            child: Icon(Icons.tune, size: 20, color: context.scheme.onSurface),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppDimens.md),
                if (_loading)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: AppDimens.xxl),
                    child: Center(child: CircularProgressIndicator()),
                  )
                else if (_failed)
                  _errorState(context)
                else if (visible.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: AppDimens.xxl),
                    child: Center(
                      child: Text(
                        _rooms.isEmpty ? '아직 열린 방이 없어요' : '조건에 맞는 방이 없어요',
                        style: context.text.bodyMedium?.copyWith(color: context.palette.muted),
                      ),
                    ),
                  )
                else
                  for (final room in visible) ...[
                    _RoomCard(
                      room: room,
                      onAction: () => room.status == RoomStatus.live
                          ? Navigator.of(context).pushNamed('/race')
                          : _joinAndEnter(room),
                      onEnter: () => _enterRoom(room),
                    ),
                    const SizedBox(height: AppDimens.md),
                  ],
              ],
            ),
          ),
          Positioned(
            left: AppDimens.screenPad,
            bottom: 20,
            child: _InviteButton(onTap: _openInvite),
          ),
        ],
      ),
    );
  }

  Widget _errorState(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppDimens.xxl),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('방 목록을 불러오지 못했어요',
                style: context.text.bodyMedium?.copyWith(color: context.palette.muted)),
            const SizedBox(height: AppDimens.sm),
            OutlinedButton(onPressed: _load, child: const Text('다시 시도')),
          ],
        ),
      ),
    );
  }

  void _openFilter() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) {
          // 시트 슬라이더와 뒤 목록을 동시에 갱신
          void update(VoidCallback fn) {
            setSheet(fn);
            setState(() {});
          }
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
                    Text('필터', style: context.text.titleLarge),
                    TextButton(
                      onPressed: () => update(() {
                        _filter = _Filter.all;
                        _dist = const RangeValues(0, _distMax);
                        _limit = const RangeValues(0, _limitMax);
                      }),
                      child: const Text('초기화'),
                    ),
                  ],
                ),
                const SizedBox(height: AppDimens.sm),
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: context.palette.surfaceHigh,
                    borderRadius: BorderRadius.circular(AppDimens.radius),
                  ),
                  child: Row(
                    children: _Filter.values.map((f) {
                      final selected = f == _filter;
                      return Expanded(
                        child: GestureDetector(
                          onTap: () => update(() => _filter = f),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 9),
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: selected ? context.scheme.primary : Colors.transparent,
                              borderRadius: BorderRadius.circular(AppDimens.radius - 4),
                            ),
                            child: Text(
                              f.label,
                              style: context.text.labelMedium?.copyWith(
                                color: selected ? context.scheme.onPrimary : context.palette.muted,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: AppDimens.lg),
                _rangeHeader(context, '거리',
                    '${_dist.start.round()} ~ ${_dist.end.round()} km'),
                RangeSlider(
                  values: _dist,
                  min: 0,
                  max: _distMax,
                  divisions: _distMax.toInt(),
                  labels: RangeLabels(
                      '${_dist.start.round()}km', '${_dist.end.round()}km'),
                  onChanged: (v) => update(() => _dist = v),
                ),
                const SizedBox(height: AppDimens.sm),
                _rangeHeader(context, '제한 시간',
                    '${_limit.start.round()} ~ ${_limit.end.round()} 분'),
                RangeSlider(
                  values: _limit,
                  min: 0,
                  max: _limitMax,
                  divisions: (_limitMax / 5).round(),
                  labels: RangeLabels(
                      '${_limit.start.round()}분', '${_limit.end.round()}분'),
                  onChanged: (v) => update(() => _limit = v),
                ),
                const SizedBox(height: AppDimens.md),
                FilledButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: Text('${_visible.length}개 방 보기'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _rangeHeader(BuildContext context, String label, String value) => Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: context.text.titleMedium),
          Text(value,
              style: context.text.labelMedium?.copyWith(color: context.palette.muted)),
        ],
      );
}

class _RoomCard extends StatelessWidget {
  const _RoomCard({required this.room, required this.onAction, required this.onEnter});

  final RoomSummary room;

  /// 미참여 방의 '참가'(join 후 대기실) 콜백. live 방에서는 '관전'(/race)로도 쓰인다.
  final VoidCallback onAction;

  /// 이미 참가한 방의 '입장'(join 없이 대기실) 콜백.
  final VoidCallback onEnter;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppDimens.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      if (room.isMine) ...[
                        const _MyRoomBadge(),
                        const SizedBox(width: AppDimens.xs),
                      ] else if (room.isJoined) ...[
                        const _JoinedBadge(),
                        const SizedBox(width: AppDimens.xs),
                      ],
                      Flexible(
                        child: Text(
                          room.title,
                          style: context.text.titleMedium,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: AppDimens.sm),
                _statusPill(),
              ],
            ),
            if (room.startTimeLabel != null) ...[
              const SizedBox(height: AppDimens.sm),
              Row(
                children: [
                  Icon(Icons.schedule, size: 14, color: context.palette.muted),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text.rich(
                      TextSpan(
                        children: [
                          TextSpan(
                            text: '${room.startTimeLabel} 시작',
                            style: context.text.labelMedium?.copyWith(
                              color: context.scheme.onSurface,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          if (room.startsInLabel != null)
                            TextSpan(
                              text: '  ·  ${room.startsInLabel}',
                              style: context.text.labelMedium?.copyWith(color: context.palette.muted),
                            ),
                        ],
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: AppDimens.md),
            Row(
              children: [
                Expanded(
                  child: Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      InfoChip(room.goalLabel, icon: Icons.flag_outlined),
                      InfoChip(room.limitLabel, icon: Icons.timer_outlined),
                      InfoChip(room.peopleLabel, icon: Icons.group_outlined),
                    ],
                  ),
                ),
                const SizedBox(width: AppDimens.sm),
                _actionButton(context),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _statusPill() {
    final elapsed = room.liveElapsed;
    final label = room.status == RoomStatus.live && elapsed != null
        ? '진행중 · $elapsed'
        : room.status.label;
    return StatusPill(
      label,
      accent: room.status.color,
      solid: room.status == RoomStatus.live,
    );
  }

  Widget _actionButton(BuildContext context) {
    final textStyle = context.text.labelMedium?.copyWith(fontWeight: FontWeight.w600);
    final filled = FilledButton.styleFrom(
      minimumSize: const Size(0, 32),
      padding: const EdgeInsets.symmetric(horizontal: AppDimens.md),
      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      visualDensity: VisualDensity.compact,
      textStyle: textStyle,
    );
    final outlined = OutlinedButton.styleFrom(
      minimumSize: const Size(0, 32),
      padding: const EdgeInsets.symmetric(horizontal: AppDimens.md),
      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      visualDensity: VisualDensity.compact,
      textStyle: textStyle,
    );
    // live 방은 참여 여부와 무관하게 '관전'이 우선.
    if (room.status == RoomStatus.live) {
      return OutlinedButton(onPressed: onAction, style: outlined, child: const Text('관전'));
    }
    // 이미 참가한 방(방장 포함) — join 없이 바로 '입장'.
    if (room.isJoined) {
      return FilledButton(onPressed: onEnter, style: filled, child: const Text('입장'));
    }
    // 미참여 모집중 — join 후 대기실.
    if (room.status == RoomStatus.recruiting) {
      return FilledButton(onPressed: onAction, style: filled, child: const Text('참가'));
    }
    // 그 외(ready 미참여 등) — 비활성 '마감'.
    return OutlinedButton(onPressed: null, style: outlined, child: const Text('마감'));
  }
}

/// 내가 만든 방(방장) 표시 배지. 상태 배지와 구분되도록 primary 아웃라인 톤을 쓴다.
class _MyRoomBadge extends StatelessWidget {
  const _MyRoomBadge();

  @override
  Widget build(BuildContext context) {
    final c = context.scheme.primary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(AppDimens.radiusPill),
        border: Border.all(color: c.withValues(alpha: 0.5)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.person_outline, size: 12, color: c),
          const SizedBox(width: 3),
          Text(
            '내 방',
            style: context.text.labelSmall?.copyWith(
              color: c,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

/// 내가 참가한(방장 아님) 방 표시 배지. '내 방'(primary 코랄)과 구분되도록 success 톤을 쓴다.
class _JoinedBadge extends StatelessWidget {
  const _JoinedBadge();

  @override
  Widget build(BuildContext context) {
    final c = context.palette.success;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(AppDimens.radiusPill),
        border: Border.all(color: c.withValues(alpha: 0.5)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.check_circle_outline, size: 12, color: c),
          const SizedBox(width: 3),
          Text(
            '참여중',
            style: context.text.labelSmall?.copyWith(
              color: c,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _InviteButton extends StatelessWidget {
  const _InviteButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Theme.of(context).cardColor,
      elevation: 3,
      shadowColor: Colors.black.withValues(alpha: 0.3),
      borderRadius: BorderRadius.circular(AppDimens.radiusPill),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppDimens.radiusPill),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: AppDimens.lg, vertical: AppDimens.md),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppDimens.radiusPill),
            border: Border.all(color: context.palette.outline),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.vpn_key_outlined, size: 18, color: context.scheme.onSurface),
              const SizedBox(width: 6),
              Text('초대 코드', style: context.text.labelLarge),
            ],
          ),
        ),
      ),
    );
  }
}

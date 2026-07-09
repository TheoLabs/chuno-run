import 'package:flutter/material.dart';

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

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  _Filter _filter = _Filter.all;

  static const double _distMax = 12; // km
  static const double _limitMax = 120; // 분
  RangeValues _dist = const RangeValues(0, _distMax);
  RangeValues _limit = const RangeValues(0, _limitMax);

  bool get _filterActive =>
      _filter != _Filter.all ||
      _dist.start > 0 ||
      _dist.end < _distMax ||
      _limit.start > 0 ||
      _limit.end < _limitMax;

  List<RoomSummary> get _visible => MockData.rooms.where((r) {
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
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text('추노'),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => Navigator.of(context).pushNamed('/room-create'),
        child: const Icon(Icons.add),
      ),
      body: Stack(
        children: [
          ListView(
            padding: const EdgeInsets.fromLTRB(
                AppDimens.screenPad, AppDimens.sm, AppDimens.screenPad, 96),
            children: [
              Text.rich(
                TextSpan(
                  text: '안녕하세요, ',
                  style: context.text.bodyLarge?.copyWith(color: context.palette.muted),
                  children: [
                    TextSpan(
                      text: MockData.myNick,
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
              if (visible.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: AppDimens.xxl),
                  child: Center(
                    child: Text('조건에 맞는 방이 없어요',
                        style: context.text.bodyMedium?.copyWith(color: context.palette.muted)),
                  ),
                )
              else
                for (final room in visible) ...[
                  _RoomCard(
                    room: room,
                    onAction: () => Navigator.of(context).pushNamed(
                      room.status == RoomStatus.live ? '/race' : '/waiting-room',
                    ),
                  ),
                  const SizedBox(height: AppDimens.md),
                ],
            ],
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
  const _RoomCard({required this.room, required this.onAction});

  final RoomSummary room;
  final VoidCallback onAction;

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
                Flexible(child: Text(room.title, style: context.text.titleMedium)),
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
    switch (room.status) {
      case RoomStatus.recruiting:
        return FilledButton(onPressed: onAction, style: filled, child: const Text('참가'));
      case RoomStatus.live:
        return OutlinedButton(onPressed: onAction, style: outlined, child: const Text('관전'));
      default:
        return OutlinedButton(onPressed: null, style: outlined, child: const Text('마감'));
    }
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

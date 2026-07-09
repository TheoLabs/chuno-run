import 'package:flutter/material.dart';

import '../../design_system/app_colors.dart';
import '../../design_system/app_dimens.dart';
import '../../design_system/app_palette.dart';
import '../../design_system/widgets.dart';

class _Player {
  const _Player(this.name, {this.isHost = false});
  final String name;
  final bool isHost;
}

class WaitingRoomScreen extends StatefulWidget {
  const WaitingRoomScreen({super.key});

  @override
  State<WaitingRoomScreen> createState() => _WaitingRoomScreenState();
}

class _WaitingRoomScreenState extends State<WaitingRoomScreen> {
  final bool _isHost = true; // 방장 여부 (목업)

  final List<_Player> _players = [
    const _Player('나', isHost: true),
    const _Player('러너_김'),
    const _Player('러너_이'),
  ];

  Future<void> _confirmKick(_Player pl) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('강퇴하시겠습니까?'),
        content: Text('${pl.name} 님을 방에서 제거합니다.'),
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
    if (ok == true && mounted) setState(() => _players.remove(pl));
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(),
        title: const Text('대기실'),
        actions: [
          Center(child: StatusPill('모집 중', accent: AppColors.coral)),
          if (_isHost)
            IconButton(
              icon: const Icon(Icons.more_vert),
              onPressed: _openRoomMenu,
            ),
          const SizedBox(width: AppDimens.xs),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppDimens.screenPad),
          children: [
            Text('아침 3km 대결', style: context.text.titleLarge),
            const SizedBox(height: AppDimens.md),
            _countdownCard(context),
            const SizedBox(height: AppDimens.md),
            _statsRow(context),
            const SizedBox(height: AppDimens.lg),
            SectionLabel(
              '참가자',
              trailing: Text('${_players.length} / 6',
                  style: context.text.labelMedium?.copyWith(color: p.muted)),
            ),
            const SizedBox(height: AppDimens.md),
            _playerGrid(context),
            const SizedBox(height: AppDimens.xl),
            FilledButton(
              onPressed: () => Navigator.of(context).pushReplacementNamed('/race'),
              child: const Text('경주 시작'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _countdownCard(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppDimens.xl),
        child: Column(
          children: [
            Text('시작까지',
                style: context.text.labelMedium?.copyWith(color: context.palette.muted)),
            const SizedBox(height: 2),
            Text('09:58', style: context.text.displaySmall),
          ],
        ),
      ),
    );
  }

  Widget _statsRow(BuildContext context) {
    return Row(
      children: [
        Expanded(child: StatTile(value: '3.0km', label: '목표 거리')),
        const SizedBox(width: AppDimens.sm),
        Expanded(child: StatTile(value: '30분', label: '제한 시간')),
        const SizedBox(width: AppDimens.sm),
        Expanded(child: StatTile(value: "10'00\"", label: '완주 기준 페이스')),
      ],
    );
  }

  // 참가자 그리드 — border 없는 타일, 폭에 맞춰 열 자동 확장(Wrap)
  Widget _playerGrid(BuildContext context) {
    const capacity = 6;
    final tiles = <Widget>[
      ..._players.map((pl) => _playerTile(context, pl)),
      for (var i = _players.length; i < capacity; i++) _emptyTile(context),
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

  Widget _playerTile(BuildContext context, _Player pl) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        AvatarCircle(pl.name, size: 48),
        const SizedBox(height: AppDimens.sm),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Text(pl.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: context.text.labelLarge),
        ),
        const SizedBox(height: AppDimens.sm),
        if (pl.isHost)
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

  // 방 관리 메뉴 — 트렌디한 바텀 액션 시트
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

  // 방 조건 변경 — 하단 시트 (방장 전용)
  void _openEditSheet() {
    final goalCtrl = TextEditingController(text: '3');
    final limitCtrl = TextEditingController(text: '30');
    final capCtrl = TextEditingController(text: '6');
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

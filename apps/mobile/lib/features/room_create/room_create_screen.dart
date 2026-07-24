import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/api/room_api.dart';
import '../../core/auth/auth_service.dart';
import '../../core/config/room_limits.dart';
import '../../design_system/app_dimens.dart';
import '../../design_system/app_palette.dart';

class RoomCreateScreen extends StatefulWidget {
  const RoomCreateScreen({super.key, this.roomApi});

  /// 테스트에서 가짜 구현을 주입하기 위한 훅. 기본은 [HttpRoomApi].
  final RoomApi? roomApi;

  @override
  State<RoomCreateScreen> createState() => _RoomCreateScreenState();
}

class _RoomCreateScreenState extends State<RoomCreateScreen> {
  static const List<int> _distances = [2, 3, 5, 10];

  late final RoomApi _roomApi = widget.roomApi ?? HttpRoomApi();

  final TextEditingController _titleCtrl = TextEditingController();

  double _distanceKm = 3;
  bool _distCustom = false;
  final TextEditingController _distCustomCtrl = TextEditingController();

  double _limit = 30; // 분
  late final TextEditingController _limitCtrl = TextEditingController(text: '30');

  DateTime? _startAt;
  int _capacity = 6;
  bool _submitting = false;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _distCustomCtrl.dispose();
    _limitCtrl.dispose();
    super.dispose();
  }

  void _snack(String m) => ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(m)));

  /// 서버 형식(YYYY-MM-DD HH:mm:ss)으로 시작 시각을 포맷한다.
  String _serverStartOn(DateTime d) {
    String two(int n) => n < 10 ? '0$n' : '$n';
    return '${d.year}-${two(d.month)}-${two(d.day)} ${two(d.hour)}:${two(d.minute)}:00';
  }

  /// 입력을 검증해 POST /rooms 를 호출하고, 성공하면 대기실로 이동한다.
  Future<void> _submit() async {
    if (_submitting) return;

    final title = _titleCtrl.text.trim();
    if (title.isEmpty) {
      _snack('방 제목을 입력하세요');
      return;
    }
    // 목표 거리(0.1~100km)·제한 시간(5~1,440분) 상·하한 검증 — 서버도 강제하지만
    // 사용자에게 즉시 안내하기 위해 클라에서 먼저 막는다.
    if (!isGoalDistanceKmInRange(_distanceKm)) {
      _snack(kGoalDistanceRangeMessage);
      return;
    }
    final goalDistanceMeter = (_distanceKm * 1000).round(); // km → m 환산.
    final goalLimitMinutes = _limit.round();
    if (!isGoalLimitMinutesInRange(goalLimitMinutes)) {
      _snack(kGoalLimitRangeMessage);
      return;
    }
    if (_startAt == null) {
      _snack('시작 시간을 선택하세요');
      return;
    }

    final token = AuthService.instance.accessToken;
    if (token == null) {
      _snack('로그인이 필요합니다');
      return;
    }

    setState(() => _submitting = true);
    try {
      final roomId = await _roomApi.create(
        accessToken: token,
        title: title,
        goalDistanceMeter: goalDistanceMeter,
        goalLimitMinutes: goalLimitMinutes,
        startOn: _serverStartOn(_startAt!),
        capacity: _capacity,
      );
      if (!mounted) return;
      // 만든 사람은 방장으로 자동 참가되므로 곧바로 그 방 대기실로 들어간다.
      Navigator.of(context).pushReplacementNamed('/waiting-room', arguments: roomId);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _submitting = false);
      _snack(e.message); // 서버 검증 메시지(미래 시각·정원·진행중 방 1개 등)
    } catch (_) {
      if (!mounted) return;
      setState(() => _submitting = false);
      _snack('방 개설에 실패했어요');
    }
  }

  String get _distLabel =>
      _distanceKm % 1 == 0 ? '${_distanceKm.toInt()}' : '$_distanceKm';

  void _setLimitFromSlider(double v) {
    setState(() {
      _limit = v;
      _limitCtrl.text = '${v.round()}';
    });
  }

  void _setLimitFromField(String t) {
    // 슬라이더(5~120)는 흔한 범위를 위한 편의일 뿐 — 직접 입력은 정책 상한(1,440분)까지
    // 허용하고, 범위 밖 값은 '방 개설' 시 검증에서 막는다. 슬라이더 위젯은 value의
    // clamp로 별도 보호된다.
    final v = double.tryParse(t);
    if (v != null) setState(() => _limit = v);
  }

  Future<void> _pickStart() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: _startAt ?? now.add(const Duration(hours: 1)),
      firstDate: DateTime(now.year, now.month, now.day),
      lastDate: now.add(const Duration(days: 365)),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_startAt ?? now.add(const Duration(hours: 1))),
    );
    if (time == null || !mounted) return;
    setState(() =>
        _startAt = DateTime(date.year, date.month, date.day, time.hour, time.minute));
  }

  String _fmt(DateTime d) {
    const dow = ['월', '화', '수', '목', '금', '토', '일'];
    String two(int n) => n < 10 ? '0$n' : '$n';
    return '${d.year}-${two(d.month)}-${two(d.day)} (${dow[d.weekday - 1]}) ${two(d.hour)}:${two(d.minute)}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(),
        title: const Text('방 만들기'),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(AppDimens.screenPad),
                children: [
                  _label(context, '방 제목'),
                  TextField(
                    controller: _titleCtrl,
                    textInputAction: TextInputAction.next,
                    decoration: const InputDecoration(hintText: '예: 아침 3km 대결'),
                  ),
                  const SizedBox(height: AppDimens.lg),

                  // 목표 거리 (프리셋 + 직접 입력)
                  _label(context, '목표 거리'),
                  Wrap(
                    spacing: AppDimens.sm,
                    runSpacing: AppDimens.sm,
                    children: [
                      ..._distances.map((d) => _ChoiceChipBox(
                            label: '${d}km',
                            selected: !_distCustom && _distanceKm == d,
                            onTap: () => setState(() {
                              _distCustom = false;
                              _distanceKm = d.toDouble();
                            }),
                          )),
                      _ChoiceChipBox(
                        label: '직접 입력',
                        selected: _distCustom,
                        onTap: () => setState(() => _distCustom = true),
                      ),
                    ],
                  ),
                  if (_distCustom) ...[
                    const SizedBox(height: AppDimens.sm),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _distCustomCtrl,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            decoration: const InputDecoration(hintText: '예: 7'),
                            onChanged: (t) {
                              final v = double.tryParse(t);
                              if (v != null && v > 0) setState(() => _distanceKm = v);
                            },
                          ),
                        ),
                        const SizedBox(width: AppDimens.sm),
                        Text('km', style: context.text.titleMedium),
                      ],
                    ),
                  ],
                  const SizedBox(height: AppDimens.xs),
                  Text('목표 거리: $_distLabel km',
                      style: context.text.labelMedium?.copyWith(color: context.palette.muted)),
                  const SizedBox(height: AppDimens.lg),

                  // 제한 시간 (슬라이더 + 직접 입력)
                  _label(context, '제한 시간 (분)'),
                  Row(
                    children: [
                      Expanded(
                        child: Slider(
                          value: _limit.clamp(5.0, 120.0),
                          min: 5,
                          max: 120,
                          divisions: 23,
                          padding: EdgeInsets.zero,
                          label: '${_limit.round()}분',
                          onChanged: _setLimitFromSlider,
                        ),
                      ),
                      const SizedBox(width: AppDimens.md),
                      SizedBox(
                        width: 62,
                        child: TextField(
                          controller: _limitCtrl,
                          textAlign: TextAlign.center,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            isDense: true,
                            contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                          ),
                          onChanged: _setLimitFromField,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppDimens.lg),

                  // 시작 시간 (네이티브 날짜·시간 피커)
                  _label(context, '시작 시간'),
                  InkWell(
                    borderRadius: BorderRadius.circular(AppDimens.radius),
                    onTap: _pickStart,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: AppDimens.lg, vertical: AppDimens.md),
                      decoration: BoxDecoration(
                        color: context.palette.surfaceHigh,
                        borderRadius: BorderRadius.circular(AppDimens.radius),
                        border: Border.all(color: context.palette.outline),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            _startAt == null ? '날짜·시간을 선택하세요' : _fmt(_startAt!),
                            style: _startAt == null
                                ? context.text.bodyMedium?.copyWith(color: context.palette.muted)
                                : context.text.titleMedium,
                          ),
                          Icon(Icons.calendar_today_outlined,
                              size: 18, color: context.palette.muted),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: AppDimens.lg),

                  // 최대 인원
                  _label(context, '최대 인원'),
                  Row(
                    children: [
                      _StepBtn(
                        icon: Icons.remove,
                        onTap: () {
                          if (_capacity > 2) setState(() => _capacity--);
                        },
                      ),
                      SizedBox(
                        width: 56,
                        child: Text('$_capacity',
                            textAlign: TextAlign.center, style: context.text.titleLarge),
                      ),
                      _StepBtn(
                        icon: Icons.add,
                        onTap: () {
                          if (_capacity < 20) setState(() => _capacity++);
                        },
                      ),
                      const SizedBox(width: AppDimens.md),
                      Text('명', style: context.text.bodyMedium?.copyWith(color: context.palette.muted)),
                    ],
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(AppDimens.screenPad),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _submitting ? null : _submit,
                  child: _submitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('방 개설'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _label(BuildContext context, String text) => Padding(
        padding: const EdgeInsets.only(bottom: AppDimens.sm, top: AppDimens.xs),
        child: Text(text, style: context.text.titleMedium),
      );
}

class _ChoiceChipBox extends StatelessWidget {
  const _ChoiceChipBox({
    required this.label,
    required this.selected,
    required this.onTap,
  });
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = context.scheme;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: AppDimens.md, vertical: AppDimens.sm),
        decoration: BoxDecoration(
          color: selected ? scheme.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(AppDimens.radius),
          border: Border.all(
            color: selected ? scheme.primary : context.palette.outline,
          ),
        ),
        child: Text(
          label,
          style: context.text.labelMedium?.copyWith(
            color: selected ? scheme.onPrimary : context.palette.muted,
          ),
        ),
      ),
    );
  }
}

class _StepBtn extends StatelessWidget {
  const _StepBtn({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(AppDimens.radius),
      onTap: onTap,
      child: Container(
        width: 44,
        height: 44,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(AppDimens.radius),
          border: Border.all(color: context.palette.outline),
        ),
        child: Icon(icon, size: 20),
      ),
    );
  }
}

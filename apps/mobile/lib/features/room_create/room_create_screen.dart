import 'package:flutter/material.dart';

import '../../design_system/app_dimens.dart';
import '../../design_system/app_palette.dart';

class RoomCreateScreen extends StatefulWidget {
  const RoomCreateScreen({super.key});

  @override
  State<RoomCreateScreen> createState() => _RoomCreateScreenState();
}

class _RoomCreateScreenState extends State<RoomCreateScreen> {
  static const List<int> _distances = [2, 3, 5, 10];

  double _distanceKm = 3;
  bool _distCustom = false;
  final TextEditingController _distCustomCtrl = TextEditingController();

  double _limit = 30; // 분
  late final TextEditingController _limitCtrl = TextEditingController(text: '30');

  DateTime? _startAt;
  int _capacity = 6;

  @override
  void dispose() {
    _distCustomCtrl.dispose();
    _limitCtrl.dispose();
    super.dispose();
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
    final v = double.tryParse(t);
    if (v != null) setState(() => _limit = v.clamp(5.0, 120.0));
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
                  const TextField(
                    decoration: InputDecoration(hintText: '예: 아침 3km 대결'),
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
                  onPressed: () =>
                      Navigator.of(context).pushReplacementNamed('/waiting-room'),
                  child: const Text('방 개설'),
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

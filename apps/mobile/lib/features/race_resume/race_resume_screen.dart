import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/api/race_api.dart';
import '../../core/auth/auth_service.dart';
import '../../core/race/local_race_progress.dart';
import '../../design_system/app_dimens.dart';
import '../../design_system/app_palette.dart';

/// 진행 중 경주 복귀 — 앱 재실행 시 이어 달릴지/포기할지 고른다. (CH-58)
///
/// 스플래시가 GET /races/active 로 복귀 가능을 확인해 이 화면으로 보낸다.
/// [roomId]는 복귀할 방. 기기 보관 거리가 있으면 이어 달리기 시 서버에 재동기화한다.
class RaceResumeScreen extends StatefulWidget {
  const RaceResumeScreen({super.key, this.roomId, this.raceApi});

  final int? roomId;
  final RaceApi? raceApi;

  @override
  State<RaceResumeScreen> createState() => _RaceResumeScreenState();
}

class _RaceResumeScreenState extends State<RaceResumeScreen> {
  late final RaceApi _raceApi = widget.raceApi ?? HttpRaceApi();

  bool _busy = false;
  LocalRaceProgress? _local;
  final String _title = '진행 중인 경주';

  @override
  void initState() {
    super.initState();
    _loadLocal();
  }

  Future<void> _loadLocal() async {
    final local = await LocalRaceProgressStore.instance.read();
    if (!mounted) return;
    if (local != null && local.roomId == widget.roomId) {
      setState(() => _local = local);
    }
  }

  Future<void> _resume() async {
    final token = AuthService.instance.accessToken;
    final roomId = widget.roomId;
    if (token == null || roomId == null || _busy) return;

    setState(() => _busy = true);
    try {
      // 끊긴 동안 기기가 보관한 거리를 재동기화한다(서버가 정합성 검사로 거른다).
      if (_local != null) {
        await _raceApi.resync(accessToken: token, roomId: roomId, distanceMeter: _local!.distanceMeter);
      }
      if (!mounted) return;
      Navigator.of(context).pushReplacementNamed('/race', arguments: roomId);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _busy = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      if (!mounted) return;
      setState(() => _busy = false);
      // 재동기화 실패해도 경주 화면으로는 들어가게 한다(서버 값 기준으로 이어짐).
      Navigator.of(context).pushReplacementNamed('/race', arguments: roomId);
    }
  }

  Future<void> _giveUp() async {
    await LocalRaceProgressStore.instance.clear();
    if (!mounted) return;
    Navigator.of(context).pushReplacementNamed('/result', arguments: widget.roomId);
  }

  void _skip() {
    Navigator.of(context).pushNamedAndRemoveUntil('/main', (route) => false);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Scaffold(
      appBar: AppBar(title: const Text('경주 복귀')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppDimens.screenPad),
          child: Column(
            children: [
              const SizedBox(height: AppDimens.lg),
              Icon(Icons.directions_run, size: 44, color: context.scheme.primary),
              const SizedBox(height: AppDimens.md),
              Text('진행 중인 경주가 있어요', style: context.text.titleLarge, textAlign: TextAlign.center),
              const SizedBox(height: AppDimens.xs),
              Text(
                '앱이 꺼져 있던 동안의 기록은 기기에 보관돼 있어요. 이어 달리면 서버와 다시 맞춥니다.',
                textAlign: TextAlign.center,
                style: context.text.bodyMedium?.copyWith(color: p.muted),
              ),
              const SizedBox(height: AppDimens.lg),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(AppDimens.lg),
                  child: Column(
                    children: [
                      Text(_title, style: context.text.titleMedium),
                      if (_local != null) ...[
                        const SizedBox(height: AppDimens.sm),
                        Text('기기 보관 거리 ${(_local!.distanceMeter / 1000).toStringAsFixed(2)}km',
                            style: context.text.bodyMedium?.copyWith(color: p.muted)),
                      ],
                    ],
                  ),
                ),
              ),
              const Spacer(),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _busy ? null : _resume,
                  child: Text(_busy ? '재동기화 중…' : '이어서 달리기'),
                ),
              ),
              const SizedBox(height: AppDimens.sm),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: _busy ? null : _giveUp,
                  style: OutlinedButton.styleFrom(foregroundColor: p.danger),
                  child: const Text('포기하고 결과 보기'),
                ),
              ),
              TextButton(onPressed: _busy ? null : _skip, child: const Text('나중에')),
            ],
          ),
        ),
      ),
    );
  }
}

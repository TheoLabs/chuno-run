import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/api/device_api.dart';
import '../../core/auth/auth_service.dart';
import '../../core/device/device_registrar.dart';
import '../../design_system/app_dimens.dart';
import '../../design_system/app_palette.dart';

/// 알림 설정 — 이 기기의 알림 권한 상태와 3종(시작 임박·시작·종료) 개별 on/off. (CH-54)
///
/// 현재 기기를 GET /devices 의 isCurrent 로 찾아, 그 기기의 알림 설정을 PUT 으로 저장한다.
class NotificationSettingsScreen extends StatefulWidget {
  const NotificationSettingsScreen({super.key, this.deviceApi});

  final DeviceApi? deviceApi;

  @override
  State<NotificationSettingsScreen> createState() => _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState extends State<NotificationSettingsScreen> {
  late final DeviceApi _deviceApi = widget.deviceApi ?? HttpDeviceApi();

  DeviceItem? _current;
  bool _loading = true;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final token = AuthService.instance.accessToken;
    if (token == null) {
      setState(() {
        _loading = false;
        _failed = true;
      });
      return;
    }

    setState(() {
      _loading = true;
      _failed = false;
    });

    try {
      final installationId = await DeviceRegistrar.instance.installationId();
      final devices = await _deviceApi.list(accessToken: token, installationId: installationId);
      final current = devices.where((d) => d.isCurrent).cast<DeviceItem?>().firstWhere((_) => true, orElse: () => null);
      if (!mounted) return;
      setState(() {
        _current = current;
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

  Future<void> _toggle({bool? startingSoon, bool? started, bool? finished}) async {
    final token = AuthService.instance.accessToken;
    final device = _current;
    if (token == null || device == null) return;

    // 낙관적 반영 — 실패 시 되돌린다.
    final previous = device;
    setState(() {
      _current = DeviceItem(
        id: device.id,
        platform: device.platform,
        status: device.status,
        notificationPermission: device.notificationPermission,
        raceStartingSoonEnabled: startingSoon ?? device.raceStartingSoonEnabled,
        raceStartedEnabled: started ?? device.raceStartedEnabled,
        raceFinishedEnabled: finished ?? device.raceFinishedEnabled,
        isCurrent: true,
        deviceName: device.deviceName,
        lastActiveOn: device.lastActiveOn,
      );
    });

    try {
      await _deviceApi.changeNotifications(
        accessToken: token,
        id: device.id,
        raceStartingSoon: startingSoon,
        raceStarted: started,
        raceFinished: finished,
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _current = previous);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      if (!mounted) return;
      setState(() => _current = previous);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('설정을 저장하지 못했어요')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('알림 설정')),
      body: SafeArea(child: _body(context)),
    );
  }

  Widget _body(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());

    final p = context.palette;
    final device = _current;

    if (_failed || device == null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('알림 설정을 불러오지 못했어요',
                style: context.text.bodyMedium?.copyWith(color: p.muted)),
            const SizedBox(height: AppDimens.sm),
            OutlinedButton(onPressed: _load, child: const Text('다시 시도')),
          ],
        ),
      );
    }

    final granted = device.notificationsGranted;

    return ListView(
      padding: const EdgeInsets.all(AppDimens.screenPad),
      children: [
        // 권한 상태
        Container(
          padding: const EdgeInsets.all(AppDimens.lg),
          decoration: BoxDecoration(
            color: p.surfaceHigh,
            borderRadius: BorderRadius.circular(AppDimens.radius),
            border: Border.all(color: granted ? p.success.withValues(alpha: 0.5) : p.outline),
          ),
          child: Row(
            children: [
              Icon(granted ? Icons.notifications_active : Icons.notifications_off,
                  color: granted ? p.success : p.muted),
              const SizedBox(width: AppDimens.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('기기 알림 권한', style: context.text.titleMedium),
                    Text(
                      granted ? '허용됨 — 이 기기로 알림이 옵니다' : '꺼짐 — 설정에서 켜야 알림을 받아요',
                      style: context.text.bodyMedium?.copyWith(color: p.muted),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppDimens.lg),
        Text('받을 알림', style: context.text.titleMedium),
        const SizedBox(height: AppDimens.sm),
        Opacity(
          opacity: granted ? 1 : 0.5,
          child: Column(
            children: [
              _switchTile(
                context,
                title: '시작 임박',
                subtitle: '시작 10분 전 · 모집이 마감될 때',
                value: device.raceStartingSoonEnabled,
                enabled: granted,
                onChanged: (v) => _toggle(startingSoon: v),
              ),
              _switchTile(
                context,
                title: '경주 시작',
                subtitle: '참가자 전원이 동시에 출발할 때',
                value: device.raceStartedEnabled,
                enabled: granted,
                onChanged: (v) => _toggle(started: v),
              ),
              _switchTile(
                context,
                title: '경주 종료',
                subtitle: '최종 순위가 확정됐을 때',
                value: device.raceFinishedEnabled,
                enabled: granted,
                onChanged: (v) => _toggle(finished: v),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppDimens.lg),
        Text(
          '알림을 못 받아도 앱을 열면 방 상태가 자동으로 동기화됩니다. 알림은 놓치지 않도록 돕는 보조 수단이에요.',
          style: context.text.bodyMedium?.copyWith(color: p.muted),
        ),
      ],
    );
  }

  Widget _switchTile(
    BuildContext context, {
    required String title,
    required String subtitle,
    required bool value,
    required bool enabled,
    required ValueChanged<bool> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppDimens.xs),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: context.text.titleMedium),
                Text(subtitle, style: context.text.labelMedium?.copyWith(color: context.palette.muted)),
              ],
            ),
          ),
          Switch(value: value, onChanged: enabled ? onChanged : null),
        ],
      ),
    );
  }
}

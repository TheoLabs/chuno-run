import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/api/device_api.dart';
import '../../core/auth/auth_service.dart';
import '../../core/device/device_registrar.dart';
import '../../design_system/app_dimens.dart';
import '../../design_system/app_palette.dart';
import '../../design_system/widgets.dart';

/// 기기 관리 — 로그인된 기기 목록. 현재 기기는 '이 기기' 배지, 다른 기기는 해지 가능. (CH-56)
class DeviceListScreen extends StatefulWidget {
  const DeviceListScreen({super.key, this.deviceApi});

  final DeviceApi? deviceApi;

  @override
  State<DeviceListScreen> createState() => _DeviceListScreenState();
}

class _DeviceListScreenState extends State<DeviceListScreen> {
  late final DeviceApi _deviceApi = widget.deviceApi ?? HttpDeviceApi();

  List<DeviceItem> _devices = const [];
  bool _loading = true;
  bool _failed = false;
  final Set<int> _revoking = {};

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
      if (!mounted) return;
      setState(() {
        _devices = devices;
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

  Future<void> _confirmRevoke(DeviceItem device) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('기기를 해지할까요?'),
        content: Text('${device.deviceName ?? '이 기기'}가 로그아웃되고 알림 발송이 중단됩니다.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('취소')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: context.palette.danger),
            child: const Text('해지'),
          ),
        ],
      ),
    );
    if (ok == true) await _revoke(device);
  }

  Future<void> _revoke(DeviceItem device) async {
    final token = AuthService.instance.accessToken;
    if (token == null || _revoking.contains(device.id)) return;

    setState(() => _revoking.add(device.id));
    try {
      await _deviceApi.revoke(accessToken: token, id: device.id);
      if (!mounted) return;
      setState(() {
        _revoking.remove(device.id);
        _devices = _devices.where((d) => d.id != device.id).toList();
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _revoking.remove(device.id));
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      if (!mounted) return;
      setState(() => _revoking.remove(device.id));
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('해지하지 못했어요')));
    }
  }

  String _notifLabel(DeviceItem d) {
    if (!d.notificationsGranted) return '알림 권한 거부';
    final on = [
      if (d.raceStartingSoonEnabled) '시작 임박',
      if (d.raceStartedEnabled) '시작',
      if (d.raceFinishedEnabled) '종료',
    ];
    return on.isEmpty ? '알림 꺼짐' : '알림 ${on.join(' · ')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('기기 관리')),
      body: SafeArea(child: _body(context)),
    );
  }

  Widget _body(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());

    final p = context.palette;
    if (_failed) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('기기 목록을 불러오지 못했어요', style: context.text.bodyMedium?.copyWith(color: p.muted)),
            const SizedBox(height: AppDimens.sm),
            OutlinedButton(onPressed: _load, child: const Text('다시 시도')),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(AppDimens.screenPad),
        children: [
          Text('로그인된 기기', style: context.text.titleLarge),
          const SizedBox(height: AppDimens.xs),
          Text('같은 계정을 여러 기기에서 쓸 수 있어요. 알림은 각 기기로 따로 갑니다.',
              style: context.text.bodyMedium?.copyWith(color: p.muted)),
          const SizedBox(height: AppDimens.lg),
          for (final device in _devices) _deviceTile(context, device),
        ],
      ),
    );
  }

  Widget _deviceTile(BuildContext context, DeviceItem device) {
    final p = context.palette;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppDimens.lg),
        child: Row(
          children: [
            Icon(device.platform == 'ios' ? Icons.phone_iphone : Icons.phone_android, color: p.muted),
            const SizedBox(width: AppDimens.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(device.deviceName ?? '알 수 없는 기기',
                            maxLines: 1, overflow: TextOverflow.ellipsis, style: context.text.titleMedium),
                      ),
                      if (device.isCurrent) ...[
                        const SizedBox(width: 6),
                        const StatusPill('이 기기'),
                      ],
                    ],
                  ),
                  Text(_notifLabel(device),
                      style: context.text.labelMedium?.copyWith(color: p.muted)),
                ],
              ),
            ),
            if (device.isCurrent)
              Text('현재', style: context.text.labelMedium?.copyWith(color: p.muted))
            else
              OutlinedButton(
                onPressed: _revoking.contains(device.id) ? null : () => _confirmRevoke(device),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(0, 32),
                  foregroundColor: p.danger,
                  side: BorderSide(color: p.danger.withValues(alpha: 0.4)),
                ),
                child: const Text('해지'),
              ),
          ],
        ),
      ),
    );
  }
}

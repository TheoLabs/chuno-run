import 'package:flutter/material.dart';

import 'core/location/location_service.dart';
import 'design_system/app_theme.dart';
import 'features/device_list/device_list_screen.dart';
import 'features/location_denied/location_denied_screen.dart';
import 'features/login/login_screen.dart';
import 'features/notification_settings/notification_settings_screen.dart';
import 'features/onboarding/onboarding_screen.dart';
import 'features/privacy/privacy_screen.dart';
import 'features/race/race_screen.dart';
import 'features/race_cancelled/race_cancelled_screen.dart';
import 'features/race_resume/race_resume_screen.dart';
import 'features/result/result_screen.dart';
import 'features/room_create/room_create_screen.dart';
import 'features/shell/main_shell.dart';
import 'features/splash/splash_screen.dart';
import 'features/waiting_room/waiting_room_screen.dart';

class ChunoApp extends StatelessWidget {
  const ChunoApp({super.key});

  /// 라우트 arguments 에서 방 id(int)를 꺼낸다. 없으면 null.
  static int? _roomIdOf(BuildContext context) {
    final args = ModalRoute.of(context)?.settings.arguments;
    return args is int ? args : null;
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '추노',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.dark,
      // 스플래시가 저장된 토큰으로 세션을 복구한 뒤 상태에 맞는 화면으로 보낸다(자동 로그인).
      initialRoute: '/',
      routes: {
        '/': (_) => const SplashScreen(),
        '/login': (_) => const LoginScreen(),
        '/onboarding': (_) => const OnboardingScreen(),
        '/main': (_) => const MainShell(),
        '/room-create': (_) => const RoomCreateScreen(),
        '/waiting-room': (context) => WaitingRoomScreen(roomId: _roomIdOf(context)),
        '/race': (context) => RaceScreen(roomId: _roomIdOf(context)),
        '/race-resume': (context) => RaceResumeScreen(roomId: _roomIdOf(context)),
        '/result': (context) => ResultScreen(roomId: _roomIdOf(context)),
        '/location-denied': (context) {
          final args = ModalRoute.of(context)?.settings.arguments;
          return LocationDeniedScreen(access: args is LocationAccess ? args : null);
        },
        '/race-cancelled': (_) => const RaceCancelledScreen(),
        '/notification-settings': (_) => const NotificationSettingsScreen(),
        '/device-list': (_) => const DeviceListScreen(),
        '/privacy': (_) => const PrivacyScreen(),
      },
    );
  }
}

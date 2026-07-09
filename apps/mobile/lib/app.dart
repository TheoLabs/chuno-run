import 'package:flutter/material.dart';

import 'design_system/app_theme.dart';
import 'features/location_denied/location_denied_screen.dart';
import 'features/login/login_screen.dart';
import 'features/onboarding/onboarding_screen.dart';
import 'features/race/race_screen.dart';
import 'features/race_cancelled/race_cancelled_screen.dart';
import 'features/result/result_screen.dart';
import 'features/room_create/room_create_screen.dart';
import 'features/shell/main_shell.dart';
import 'features/waiting_room/waiting_room_screen.dart';

class ChunoApp extends StatelessWidget {
  const ChunoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '추노',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.dark,
      initialRoute: '/login',
      routes: {
        '/login': (_) => const LoginScreen(),
        '/onboarding': (_) => const OnboardingScreen(),
        '/main': (_) => const MainShell(),
        '/room-create': (_) => const RoomCreateScreen(),
        '/waiting-room': (_) => const WaitingRoomScreen(),
        '/race': (_) => const RaceScreen(),
        '/result': (_) => const ResultScreen(),
        '/location-denied': (_) => const LocationDeniedScreen(),
        '/race-cancelled': (_) => const RaceCancelledScreen(),
      },
    );
  }
}

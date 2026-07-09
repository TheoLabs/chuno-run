import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/design_system/app_theme.dart';
import 'package:mobile/features/shell/main_shell.dart';
import 'package:mobile/features/waiting_room/waiting_room_screen.dart';
import 'package:mobile/main.dart';

void main() {
  testWidgets('앱이 로그인 화면으로 시작한다 (카카오·구글·애플)', (WidgetTester tester) async {
    await tester.pumpWidget(const ChunoApp());
    expect(find.text('추노'), findsWidgets);
    expect(find.text('카카오로 시작하기'), findsOneWidget);
    expect(find.text('구글로 시작하기'), findsOneWidget);
    expect(find.text('Apple로 시작하기'), findsOneWidget);
  });

  testWidgets('메인 셸 탭 전환이 시맨틱스 오류 없이 동작한다', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2340);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final handle = tester.ensureSemantics();
    await tester.pumpWidget(MaterialApp(theme: AppTheme.dark, home: const MainShell()));
    await tester.pumpAndSettle();

    await tester.tap(find.text('이력'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('내 정보'));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    handle.dispose();
  });

  testWidgets('대기실이 오버플로우 없이 렌더된다 (참가자 그리드)', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2340);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(theme: AppTheme.dark, home: const WaitingRoomScreen()),
    );
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.text('빈 자리'), findsWidgets);
  });
}

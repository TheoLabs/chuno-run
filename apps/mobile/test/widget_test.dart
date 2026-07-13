import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/core/auth/auth_service.dart';
import 'package:mobile/design_system/app_theme.dart';
import 'package:mobile/features/shell/main_shell.dart';
import 'package:mobile/features/waiting_room/waiting_room_screen.dart';
import 'package:mobile/main.dart';

/// 네트워크 없이 dev 로그인 분기를 검증하기 위한 가짜 AuthApi.
/// provider별로 계정 상태를 인메모리로 흉내낸다 (서버의 find-or-create + activate와 동일한 규칙).
class _FakeAuthApi implements AuthApi {
  final Map<String, UserStatus> _accounts = {};

  @override
  Future<AuthResult> devLogin({required String provider}) async {
    final status = _accounts.putIfAbsent(provider, () => UserStatus.onboarding);
    return AuthResult(
      accessToken: 'fake-token-$provider',
      user: AuthUser(id: 1, provider: provider, status: status, nickname: ''),
    );
  }

  @override
  Future<AuthResult> completeOnboarding({
    required String accessToken,
    required String nickname,
  }) async {
    // 토큰의 provider로 계정을 찾아 active로 전이 (서버 온보딩 완료와 동일 규칙).
    final provider = accessToken.replaceFirst('fake-token-', '');
    _accounts[provider] = UserStatus.active;
    return AuthResult(
      accessToken: accessToken,
      user: AuthUser(id: 1, provider: provider, status: UserStatus.active, nickname: nickname),
    );
  }
}

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

  test('로그인 후 User.status 분기 — 첫 로그인 onboarding, 완료 후 재로그인 active', () async {
    final auth = AuthService(api: _FakeAuthApi());
    const provider = 'kakao';

    // 첫 로그인 → 계정이 onboarding 상태로 생성 (시나리오 #1/#5)
    expect(await auth.login(provider), UserStatus.onboarding);
    // 온보딩 미완료 상태로 재로그인 → 여전히 onboarding (중복 계정 없이 이어서 진행, #5)
    expect(await auth.login(provider), UserStatus.onboarding);

    // 온보딩 완료 → active 전이 (#2)
    await auth.completeOnboarding('러너');
    expect(auth.status, UserStatus.active);

    // 로그아웃 후 재로그인 → active (온보딩 스킵, #4)
    auth.logout();
    expect(await auth.login(provider), UserStatus.active);
  });
}

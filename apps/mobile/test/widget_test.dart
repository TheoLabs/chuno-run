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
  final Map<String, String> _nicknames = {};

  /// 마지막 온보딩 호출로 전달된 consents (검증용).
  List<Consent>? lastConsents;

  /// PUT /users/me 호출 횟수와 마지막 닉네임 (변경 규칙 검증용).
  int putCallCount = 0;
  String? lastNickname;

  String _providerOf(String token) => token.replaceFirst('fake-token-', '');

  @override
  Future<AuthResult> devLogin({required String provider}) async {
    final status = _accounts.putIfAbsent(provider, () => UserStatus.onboarding);
    return AuthResult(
      accessToken: 'fake-token-$provider',
      user: AuthUser(id: 1, provider: provider, status: status, nickname: ''),
    );
  }

  @override
  Future<void> completeOnboarding({
    required String accessToken,
    required String nickname,
    required List<Consent> consents,
  }) async {
    // 필수 약관 미동의는 서버 400과 동일하게 거부한다.
    if (consents.any((c) => !c.isAgreed)) {
      throw StateError('required agreement not agreed');
    }
    // 토큰의 provider로 계정을 찾아 active로 전이 (서버 온보딩 완료와 동일 규칙).
    final provider = _providerOf(accessToken);
    _accounts[provider] = UserStatus.active;
    _nicknames[provider] = nickname;
    lastConsents = consents;
  }

  @override
  Future<AuthUser> me({required String accessToken}) async {
    // GET /auth/me — 서버에 저장된 최신 상태/닉네임을 돌려준다 (provider 없음).
    final provider = _providerOf(accessToken);
    return AuthUser(
      id: 1,
      provider: '',
      status: _accounts[provider] ?? UserStatus.onboarding,
      nickname: _nicknames[provider] ?? '',
    );
  }

  @override
  Future<void> changeNickname({
    required String accessToken,
    required String nickname,
  }) async {
    // PUT /users/me — 저장된 닉네임을 갱신한다 (응답은 비어 있음).
    putCallCount++;
    lastNickname = nickname;
    _nicknames[_providerOf(accessToken)] = nickname;
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
    final fake = _FakeAuthApi();
    final auth = AuthService(api: fake);
    const provider = 'kakao';

    // 첫 로그인 → 계정이 onboarding 상태로 생성 (시나리오 #1/#5)
    expect(await auth.login(provider), UserStatus.onboarding);
    // 온보딩 미완료 상태로 재로그인 → 여전히 onboarding (중복 계정 없이 이어서 진행, #5)
    expect(await auth.login(provider), UserStatus.onboarding);

    // 온보딩 완료 → consents 전송 + GET /auth/me로 세션 갱신 → active 전이 (#2)
    const consents = [
      Consent(agreementId: 1, isAgreed: true),
      Consent(agreementId: 2, isAgreed: true),
    ];
    await auth.completeOnboarding('러너', consents);
    expect(auth.status, UserStatus.active);
    expect(auth.user?.nickname, '러너'); // /auth/me로 닉네임까지 갱신됨
    expect(fake.lastConsents, consents); // 표시된 약관 동의가 그대로 전송됨
    // provider는 /auth/me가 주지 않지만 기존 세션 값이 유지된다.
    expect(auth.user?.provider, provider);

    // 로그아웃 후 재로그인 → active (온보딩 스킵, #4)
    auth.logout();
    expect(await auth.login(provider), UserStatus.active);
  });

  test('닉네임 수정 — 변경 없으면 요청 안 감, 변경 시 PUT + me()로 갱신', () async {
    final fake = _FakeAuthApi();
    final auth = AuthService(api: fake);
    await auth.login('kakao');
    await auth.completeOnboarding('러너', const [
      Consent(agreementId: 1, isAgreed: true),
      Consent(agreementId: 2, isAgreed: true),
    ]);
    expect(auth.user?.nickname, '러너');

    // 기존과 동일 → PUT 미발생, false 반환
    expect(await auth.changeNickname('러너'), isFalse);
    expect(fake.putCallCount, 0);

    // 공백뿐인 값 → 서버 400 방지 위해 미발생
    expect(await auth.changeNickname('   '), isFalse);
    expect(fake.putCallCount, 0);

    // 실제 변경 → PUT 1회 + me()로 세션 갱신
    expect(await auth.changeNickname(' 치타 '), isTrue);
    expect(fake.putCallCount, 1);
    expect(fake.lastNickname, '치타'); // 트림된 값 전송
    expect(auth.user?.nickname, '치타'); // me()로 세션 반영
  });

  test('닉네임 수정 — 미로그인 상태에서는 StateError', () async {
    final auth = AuthService(api: _FakeAuthApi());
    await expectLater(auth.changeNickname('치타'), throwsA(isA<StateError>()));
  });

  test('온보딩 — 필수 약관 미동의는 거부된다 (서버 400 상당)', () async {
    final auth = AuthService(api: _FakeAuthApi());
    await auth.login('google');

    await expectLater(
      auth.completeOnboarding('러너', const [
        Consent(agreementId: 1, isAgreed: true),
        Consent(agreementId: 2, isAgreed: false), // 필수 미동의
      ]),
      throwsA(isA<StateError>()),
    );
    // 실패 시 status는 그대로 onboarding 이어야 한다.
    expect(auth.status, UserStatus.onboarding);
  });
}

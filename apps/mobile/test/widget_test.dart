import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/core/api/room_api.dart';
import 'package:mobile/core/auth/auth_service.dart';
import 'package:mobile/core/config/room_limits.dart';
import 'package:mobile/design_system/app_theme.dart';
import 'package:mobile/features/room_create/room_create_screen.dart';
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

/// 네트워크 없이 대기실을 검증하기 위한 가짜 RoomApi.
class _FakeRoomApi implements RoomApi {
  /// kick 호출로 전달된 participantId(=참가자 row id) 기록 — 강퇴 연동 검증용.
  final List<int> kickedParticipantIds = [];

  /// cancel 호출로 전달된 방 id 기록 — 방 삭제 연동 검증용.
  final List<int> cancelledRoomIds = [];

  /// retrieve가 돌려줄 방의 목표 거리(m) — 방 조건 변경 diff 검증을 위해 조절 가능.
  _FakeRoomApi({this.goalDistanceMeter = 3000});
  final int goalDistanceMeter;

  /// changeSetting 호출 기록 — 방 조건 변경 연동 검증용.
  int changeSettingCallCount = 0;
  int? lastChangedGoalDistanceMeter;
  int? lastChangedGoalLimitMinutes;
  int? lastChangedCapacity;

  /// create 호출 기록 — 방 생성 연동/검증용.
  int createCallCount = 0;
  int? lastCreatedGoalDistanceMeter;
  int? lastCreatedGoalLimitMinutes;

  @override
  Future<void> changeSetting({
    required String accessToken,
    required int id,
    String? title,
    int? goalDistanceMeter,
    int? goalLimitMinutes,
    int? capacity,
  }) async {
    changeSettingCallCount++;
    lastChangedGoalDistanceMeter = goalDistanceMeter;
    lastChangedGoalLimitMinutes = goalLimitMinutes;
    lastChangedCapacity = capacity;
  }

  @override
  Future<void> cancel({required String accessToken, required int id}) async {
    cancelledRoomIds.add(id);
  }

  @override
  Future<List<RoomListItem>> list({required String accessToken}) async => const [];

  @override
  Future<void> create({
    required String accessToken,
    required String title,
    required int goalDistanceMeter,
    required int goalLimitMinutes,
    required String startOn,
    required int capacity,
  }) async {
    createCallCount++;
    lastCreatedGoalDistanceMeter = goalDistanceMeter;
    lastCreatedGoalLimitMinutes = goalLimitMinutes;
  }

  @override
  Future<void> join({required String accessToken, required int id}) async {}

  @override
  Future<void> exit({required String accessToken, required int id}) async {}

  @override
  Future<void> kick({
    required String accessToken,
    required int roomId,
    required int participantId,
  }) async {
    kickedParticipantIds.add(participantId);
  }

  @override
  Future<RoomDetail> retrieve({required String accessToken, required int id}) async {
    return RoomDetail(
      id: id,
      hostUserId: 1,
      title: '아침 3km 대결',
      goalDistanceMeter: goalDistanceMeter,
      goalLimitMinutes: 30,
      startOn: DateTime.now().add(const Duration(minutes: 10)),
      capacity: 6,
      status: 'recruiting',
      participants: [
        RoomParticipant(
            id: 1, roomId: id, status: 'joined', currentDistanceMeter: 0, userId: 1, nickname: '나'),
        // row id(2) != userId(20) — 강퇴가 userId가 아닌 participant row id를 전달하는지 검증하려 일부러 다르게 둔다.
        RoomParticipant(
            id: 2, roomId: id, status: 'joined', currentDistanceMeter: 0, userId: 20, nickname: '러너_김'),
      ],
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

  testWidgets('대기실이 서버 데이터로 오버플로우 없이 렌더된다 (참가자 그리드)', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2340);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    // 대기실은 세션 토큰으로 상세를 로드한다 — 가짜 세션을 주입.
    final prevAuth = AuthService.instance;
    addTearDown(() => AuthService.instance = prevAuth);
    AuthService.instance = AuthService(api: _FakeAuthApi())
      ..accessToken = 'fake'
      ..user = const AuthUser(id: 1, provider: 'kakao', status: UserStatus.active, nickname: '나');

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.dark,
        home: WaitingRoomScreen(roomId: 1, roomApi: _FakeRoomApi()),
      ),
    );
    await tester.pump(); // retrieve Future 해소
    await tester.pump(const Duration(milliseconds: 50));

    expect(tester.takeException(), isNull);
    expect(find.text('아침 3km 대결'), findsOneWidget);
    expect(find.text('빈 자리'), findsWidgets); // 정원(6) - 참가자(2) = 빈 자리 4
    expect(find.text('방장'), findsOneWidget); // hostUserId(1) == 참가자 '나'

    // 주기 카운트다운 타이머 정리 — 위젯을 폐기해 dispose에서 취소되게 한다.
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('대기실 하단 액션 — 방장은 경주 시작, 비방장은 방 나가기', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2340);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final prevAuth = AuthService.instance;
    addTearDown(() => AuthService.instance = prevAuth);
    // 로그인 유저 id(2) != hostUserId(1) → 비방장.
    AuthService.instance = AuthService(api: _FakeAuthApi())
      ..accessToken = 'fake'
      ..user = const AuthUser(id: 2, provider: 'kakao', status: UserStatus.active, nickname: '러너_김');

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.dark,
        home: WaitingRoomScreen(roomId: 1, roomApi: _FakeRoomApi()),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(tester.takeException(), isNull);
    expect(find.text('방 나가기'), findsOneWidget); // 비방장 참가자
    expect(find.text('경주 시작'), findsNothing); // 참가자에겐 숨김

    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('방장 강퇴 — 확인 시 kick API가 참가자 row id로 호출된다', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2340);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final prevAuth = AuthService.instance;
    addTearDown(() => AuthService.instance = prevAuth);
    // 로그인 유저 id(1) == hostUserId(1) → 방장.
    AuthService.instance = AuthService(api: _FakeAuthApi())
      ..accessToken = 'fake'
      ..user = const AuthUser(id: 1, provider: 'kakao', status: UserStatus.active, nickname: '나');

    final roomApi = _FakeRoomApi();
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.dark,
        home: WaitingRoomScreen(roomId: 1, roomApi: roomApi),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    // 방장에게는 비방장 참가자(userId 2)에 대해 '강퇴' 버튼이 보인다.
    expect(find.text('강퇴'), findsOneWidget);
    await tester.tap(find.text('강퇴'));
    await tester.pumpAndSettle(); // 확인 다이얼로그 표시

    // 다이얼로그의 강퇴 버튼(FilledButton) 탭 → kick API 호출.
    await tester.tap(find.widgetWithText(FilledButton, '강퇴'));
    await tester.pumpAndSettle();

    // participantId 자리에는 userId(20)가 아니라 참가자 row id(2)가 전달돼야 한다.
    expect(roomApi.kickedParticipantIds, [2]);
    expect(tester.takeException(), isNull);

    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('방장 방 조건 변경 — 적용 시 changeSetting이 km→m 변환된 값으로 호출된다',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2340);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final prevAuth = AuthService.instance;
    addTearDown(() => AuthService.instance = prevAuth);
    // 로그인 유저 id(1) == hostUserId(1) → 방장.
    AuthService.instance = AuthService(api: _FakeAuthApi())
      ..accessToken = 'fake'
      ..user = const AuthUser(id: 1, provider: 'kakao', status: UserStatus.active, nickname: '나');

    // 원본 목표 거리 5km — 적용에서 3km 입력 시 값이 바뀌어 요청이 나가도록.
    final roomApi = _FakeRoomApi(goalDistanceMeter: 5000);
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.dark,
        home: WaitingRoomScreen(roomId: 1, roomApi: roomApi),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    // 방 관리 메뉴 → 방 조건 변경 시트 열기.
    await tester.tap(find.byIcon(Icons.more_vert));
    await tester.pumpAndSettle();
    await tester.tap(find.text('방 조건 변경'));
    await tester.pumpAndSettle();

    // 목표 거리 필드(첫 번째 TextField)에 3km 입력 → 3000m 로 전송돼야 한다.
    await tester.enterText(find.byType(TextField).first, '3');
    await tester.pump();
    await tester.tap(find.widgetWithText(FilledButton, '적용'));
    await tester.pumpAndSettle();

    expect(roomApi.changeSettingCallCount, 1);
    expect(roomApi.lastChangedGoalDistanceMeter, 3000); // km→m 변환
    expect(roomApi.lastChangedGoalLimitMinutes, isNull); // 미변경 필드는 전송 안 함
    expect(roomApi.lastChangedCapacity, isNull);
    expect(find.text('방 조건을 변경했어요'), findsOneWidget); // 성공 SnackBar
    expect(tester.takeException(), isNull);

    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('방장 방 삭제 — 확인 시 cancel API가 방 id로 호출된다', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2340);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final prevAuth = AuthService.instance;
    addTearDown(() => AuthService.instance = prevAuth);
    // 로그인 유저 id(1) == hostUserId(1) → 방장.
    AuthService.instance = AuthService(api: _FakeAuthApi())
      ..accessToken = 'fake'
      ..user = const AuthUser(id: 1, provider: 'kakao', status: UserStatus.active, nickname: '나');

    final roomApi = _FakeRoomApi();
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.dark,
        home: WaitingRoomScreen(roomId: 1, roomApi: roomApi),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    // 방 관리 메뉴 → 방 삭제 → 확인 다이얼로그.
    await tester.tap(find.byIcon(Icons.more_vert));
    await tester.pumpAndSettle();
    await tester.tap(find.text('방 삭제'));
    await tester.pumpAndSettle();

    // 다이얼로그의 삭제 버튼(FilledButton) 탭 → cancel API 호출.
    await tester.tap(find.widgetWithText(FilledButton, '삭제'));
    await tester.pumpAndSettle();

    expect(roomApi.cancelledRoomIds, [1]);
    expect(tester.takeException(), isNull);

    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('방 생성 — 목표 거리 범위 밖(직접 입력 200km)이면 create 미호출 + 안내',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2340);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final prevAuth = AuthService.instance;
    addTearDown(() => AuthService.instance = prevAuth);
    AuthService.instance = AuthService(api: _FakeAuthApi())
      ..accessToken = 'fake'
      ..user = const AuthUser(id: 1, provider: 'kakao', status: UserStatus.active, nickname: '나');

    final roomApi = _FakeRoomApi();
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.dark,
        home: RoomCreateScreen(roomApi: roomApi),
      ),
    );
    await tester.pumpAndSettle();

    // 제목 입력.
    await tester.enterText(find.byType(TextField).first, '아침 대결');
    // 직접 입력으로 200km(상한 100km 초과) 입력.
    await tester.tap(find.text('직접 입력'));
    await tester.pump();
    await tester.enterText(find.byType(TextField).at(1), '200');
    await tester.pump();

    await tester.tap(find.text('방 개설'));
    await tester.pump();

    expect(roomApi.createCallCount, 0); // 범위 밖 → 서버 호출 안 함
    expect(find.text(kGoalDistanceRangeMessage), findsOneWidget); // 안내 SnackBar
    expect(tester.takeException(), isNull);
  });

  testWidgets('방 생성 — 정상 범위(3km)면 create가 km→m 변환값(3000m)으로 호출된다',
      (WidgetTester tester) async {
    // 날짜·시간 피커가 좁은 폭에서 오버플로우하지 않도록 넉넉한 논리 크기를 준다.
    tester.view.physicalSize = const Size(1400, 2600);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final prevAuth = AuthService.instance;
    addTearDown(() => AuthService.instance = prevAuth);
    AuthService.instance = AuthService(api: _FakeAuthApi())
      ..accessToken = 'fake'
      ..user = const AuthUser(id: 1, provider: 'kakao', status: UserStatus.active, nickname: '나');

    final roomApi = _FakeRoomApi();
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.dark,
        // 성공 시 대기실로 pushReplacement 하므로 목적지 라우트를 제공한다.
        routes: {'/waiting-room': (_) => const Scaffold()},
        home: RoomCreateScreen(roomApi: roomApi),
      ),
    );
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).first, '아침 3km 대결');
    await tester.pump();

    // 시작 시간 선택 — 날짜·시간 피커의 기본값(now+1h)을 그대로 확정.
    await tester.tap(find.text('날짜·시간을 선택하세요'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('OK')); // 날짜 확정
    await tester.pumpAndSettle();
    await tester.tap(find.text('OK')); // 시간 확정
    await tester.pumpAndSettle();

    // 기본 선택 거리 3km → 방 개설.
    await tester.tap(find.text('방 개설'));
    await tester.pumpAndSettle();

    expect(roomApi.createCallCount, 1);
    expect(roomApi.lastCreatedGoalDistanceMeter, 3000); // 3km → 3000m
    expect(roomApi.lastCreatedGoalLimitMinutes, 30); // 기본 제한 시간(범위 내)
    expect(tester.takeException(), isNull);
  });

  testWidgets('방 조건 변경 — 제한 시간 범위 밖(3분)이면 changeSetting 미호출 + 안내',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2340);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final prevAuth = AuthService.instance;
    addTearDown(() => AuthService.instance = prevAuth);
    AuthService.instance = AuthService(api: _FakeAuthApi())
      ..accessToken = 'fake'
      ..user = const AuthUser(id: 1, provider: 'kakao', status: UserStatus.active, nickname: '나');

    final roomApi = _FakeRoomApi(goalDistanceMeter: 5000);
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.dark,
        home: WaitingRoomScreen(roomId: 1, roomApi: roomApi),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    await tester.tap(find.byIcon(Icons.more_vert));
    await tester.pumpAndSettle();
    await tester.tap(find.text('방 조건 변경'));
    await tester.pumpAndSettle();

    // 제한 시간 필드(두 번째 TextField)에 하한(5분) 미만 입력.
    await tester.enterText(find.byType(TextField).at(1), '3');
    await tester.pump();
    await tester.tap(find.widgetWithText(FilledButton, '적용'));
    await tester.pumpAndSettle();

    expect(roomApi.changeSettingCallCount, 0); // 범위 밖 → 서버 호출 안 함
    expect(find.text(kGoalLimitRangeMessage), findsOneWidget); // 안내 SnackBar
    expect(tester.takeException(), isNull);

    await tester.pumpWidget(const SizedBox());
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

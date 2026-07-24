import '../api/api_client.dart';
import 'token_store.dart';

/// 사용자 계정 상태 — core-api User.status 도메인과 동일.
enum UserStatus { onboarding, active, suspended, exited }

UserStatus userStatusFromString(String? value) => switch (value) {
      'active' => UserStatus.active,
      'suspended' => UserStatus.suspended,
      'exited' => UserStatus.exited,
      _ => UserStatus.onboarding,
    };

class AuthUser {
  const AuthUser({
    required this.id,
    required this.provider,
    required this.status,
    required this.nickname,
    this.profileImageUrl,
    this.createdAt,
  });

  final int id;
  final String provider;
  final UserStatus status;
  final String nickname;
  final String? profileImageUrl;

  /// 가입일 — GET /auth/me 의 createdAt(공통 감사 컬럼). 없으면 null.
  final DateTime? createdAt;

  AuthUser copyWith({
    int? id,
    String? provider,
    UserStatus? status,
    String? nickname,
    String? profileImageUrl,
    DateTime? createdAt,
  }) =>
      AuthUser(
        id: id ?? this.id,
        provider: provider ?? this.provider,
        status: status ?? this.status,
        nickname: nickname ?? this.nickname,
        profileImageUrl: profileImageUrl ?? this.profileImageUrl,
        createdAt: createdAt ?? this.createdAt,
      );
}

class AuthResult {
  const AuthResult({required this.accessToken, required this.user});
  final String accessToken;
  final AuthUser user;
}

/// 약관 동의 한 건 — POST /users/me/onboarding 의 consents 항목.
class Consent {
  const Consent({required this.agreementId, required this.isAgreed});
  final int agreementId;
  final bool isAgreed;

  Map<String, dynamic> toJson() => {
        'agreementId': agreementId,
        'isAgreed': isAgreed,
      };
}

/// core-api 인증 API 추상화 — 테스트에서 가짜 구현으로 교체할 수 있다.
abstract class AuthApi {
  /// 로그인 — provider로 계정을 찾거나 생성하고 토큰을 발급받는다.
  Future<AuthResult> devLogin({required String provider});

  /// 온보딩 완료 — 닉네임 + 약관 동의를 저장한다. 로그인 토큰이 필요하다.
  /// 서버 응답은 비어 있으므로 반환값이 없다.
  Future<void> completeOnboarding({
    required String accessToken,
    required String nickname,
    required List<Consent> consents,
  });

  /// 현재 토큰의 사용자 정보(GET /auth/me).
  Future<AuthUser> me({required String accessToken});

  /// [2차] 계정 탈퇴 (POST /users/me/withdrawal). 서버 응답은 비어 있다.
  Future<void> withdraw({required String accessToken});

  /// 닉네임 수정 (PUT /users/me). 서버 응답은 비어 있으므로 반환값이 없다.
  Future<void> changeNickname({
    required String accessToken,
    required String nickname,
  });
}

/// 로컬 개발용 dev 인증 API 구현.
class HttpAuthApi implements AuthApi {
  HttpAuthApi({ApiClient? client}) : _client = client ?? ApiClient();
  final ApiClient _client;

  @override
  Future<AuthResult> devLogin({required String provider}) async {
    final json = await _client.post('/auth/dev/login', body: {
      'provider': provider,
      'providerUserId': 'dev-$provider', // provider당 고정 → 같은 계정으로 재로그인
    });
    final data = json['data'] as Map<String, dynamic>;
    final user = data['user'] as Map<String, dynamic>;
    return AuthResult(
      accessToken: data['accessToken'] as String,
      user: AuthUser(
        id: user['id'] as int,
        provider: (user['provider'] as String?) ?? provider,
        status: userStatusFromString(user['status'] as String?),
        nickname: (user['nickname'] as String?) ?? '',
        createdAt: DateTime.tryParse((user['createdAt'] as String?) ?? ''),
      ),
    );
  }

  @override
  Future<void> completeOnboarding({
    required String accessToken,
    required String nickname,
    required List<Consent> consents,
  }) async {
    await _client.post(
      '/users/me/onboarding',
      token: accessToken,
      body: {
        'nickname': nickname,
        'consents': consents.map((c) => c.toJson()).toList(),
      },
    );
  }

  @override
  Future<AuthUser> me({required String accessToken}) async {
    final json = await _client.get('/auth/me', token: accessToken);
    final data = json['data'] as Map<String, dynamic>;
    return AuthUser(
      id: data['id'] as int,
      provider: (data['provider'] as String?) ?? '',
      status: userStatusFromString(data['status'] as String?),
      nickname: (data['nickname'] as String?) ?? '',
      profileImageUrl: data['profileImageUrl'] as String?,
      createdAt: DateTime.tryParse((data['createdAt'] as String?) ?? ''),
    );
  }

  @override
  Future<void> changeNickname({
    required String accessToken,
    required String nickname,
  }) async {
    // 부분 수정 — 바뀐 필드(nickname)만 담아 보낸다. 빈 값은 호출부에서 이미 걸러진다.
    await _client.put('/users/me', token: accessToken, body: {'nickname': nickname});
  }

  @override
  Future<void> withdraw({required String accessToken}) async {
    await _client.post('/users/me/withdrawal', token: accessToken);
  }
}

/// 앱 인증 세션. 액세스 토큰과 현재 사용자 상태를 보관하고, 화면 분기에 쓴다.
///
/// 아직 실제 소셜 로그인이 없어 core-api의 임시 dev 로그인에 붙는다.
class AuthService {
  AuthService({AuthApi? api, TokenStore? tokenStore})
      : _api = api ?? HttpAuthApi(),
        _tokenStore = tokenStore ?? TokenStore.instance;

  final AuthApi _api;
  final TokenStore _tokenStore;

  /// 전역 세션. 테스트에서는 가짜 AuthApi를 주입한 인스턴스로 교체한다.
  static AuthService instance = AuthService();

  String? accessToken;
  AuthUser? user;

  UserStatus? get status => user?.status;
  bool get isLoggedIn => accessToken != null;

  /// 로그인. [provider]는 'kakao' | 'google' | 'apple'.
  /// 첫 로그인이면 계정이 onboarding 상태로 생성되고, 이미 있으면 기존 상태를 받는다.
  Future<UserStatus> login(String provider) async {
    final result = await _api.devLogin(provider: provider);
    accessToken = result.accessToken;
    user = result.user;
    // 앱을 다시 켰을 때 로그인 화면을 건너뛰도록 토큰을 보관한다.
    await _tokenStore.write(result.accessToken);
    return result.user.status;
  }

  /// 저장된 토큰으로 세션을 복구한다 (자동 로그인).
  ///
  /// 토큰이 없거나 만료·폐기됐으면 보관분을 지우고 null 을 돌려준다 — 호출부는 로그인 화면으로 보낸다.
  /// 성공하면 사용자 상태를 돌려주므로 진입 화면(온보딩/홈/정지 안내)을 그대로 분기할 수 있다.
  Future<UserStatus?> restore() async {
    final stored = await _tokenStore.read();

    if (stored == null || stored.isEmpty) {
      return null;
    }

    accessToken = stored;

    try {
      final fetched = await _api.me(accessToken: stored);
      user = fetched;
      return fetched.status;
    } catch (_) {
      // 만료·폐기된 토큰 — 세션을 비우고 다시 로그인시킨다.
      accessToken = null;
      user = null;
      await _tokenStore.clear();
      return null;
    }
  }

  /// 온보딩 완료 — 로그인 토큰으로 닉네임·약관 동의를 저장한다.
  /// 서버 응답이 비어 있어 [me]로 세션 사용자(status/nickname)를 갱신한다.
  Future<void> completeOnboarding(String nickname, List<Consent> consents) async {
    final token = accessToken;
    if (token == null) {
      throw StateError('로그인 후에 온보딩을 완료할 수 있습니다.');
    }
    await _api.completeOnboarding(
      accessToken: token,
      nickname: nickname,
      consents: consents,
    );
    await me();
  }

  /// 현재 토큰의 사용자 정보를 GET /auth/me로 다시 읽어 세션을 갱신한다.
  /// 응답에 provider가 포함되므로 fetched를 그대로 세션에 반영한다.
  Future<AuthUser> me() async {
    final token = accessToken;
    if (token == null) {
      throw StateError('로그인 후에 사용자 정보를 조회할 수 있습니다.');
    }
    final fetched = await _api.me(accessToken: token);
    user = fetched;
    return fetched;
  }

  /// 닉네임 수정. 기존 값과 **다를 때만** PUT /users/me로 저장하고 [me]로 세션을 갱신한다.
  /// 값이 비었거나 기존과 같으면 요청을 보내지 않고 false를 반환한다(부분 수정 규칙).
  /// 실제로 저장한 경우 true.
  Future<bool> changeNickname(String newNickname) async {
    final token = accessToken;
    if (token == null) {
      throw StateError('로그인 후에 닉네임을 변경할 수 있습니다.');
    }
    final trimmed = newNickname.trim();
    // 빈 값(서버 400 대상) 또는 변경 없음 → 요청하지 않는다.
    if (trimmed.isEmpty || trimmed == user?.nickname) {
      return false;
    }
    await _api.changeNickname(accessToken: token, nickname: trimmed);
    // PUT 응답은 비어 있으므로 me()로 세션/화면을 갱신한다.
    await me();
    return true;
  }

  /// [2차] 계정 탈퇴 — 서버에 탈퇴를 요청한 뒤 세션을 비운다.
  /// 서버가 status=exited 전이·기기 해지를 처리하므로, 이후 앱은 로그인 화면으로 나간다.
  Future<void> withdraw() async {
    final token = accessToken;
    if (token == null) {
      throw StateError('로그인 후에 탈퇴할 수 있습니다.');
    }
    await _api.withdraw(accessToken: token);
    await logout();
  }

  /// 로그아웃 — 세션(토큰)만 비운다. 서버의 계정 상태는 유지된다.
  Future<void> logout() async {
    accessToken = null;
    user = null;
    await _tokenStore.clear();
  }
}

import '../api/api_client.dart';

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
  });

  final int id;
  final String provider;
  final UserStatus status;
  final String nickname;
}

class AuthResult {
  const AuthResult({required this.accessToken, required this.user});
  final String accessToken;
  final AuthUser user;
}

/// core-api 인증 API 추상화 — 테스트에서 가짜 구현으로 교체할 수 있다.
abstract class AuthApi {
  /// 로그인 — provider로 계정을 찾거나 생성하고 토큰을 발급받는다.
  Future<AuthResult> devLogin({required String provider});

  /// 온보딩 완료 — 닉네임 설정 + status onboarding→active. 로그인 토큰이 필요하다.
  Future<AuthResult> completeOnboarding({
    required String accessToken,
    required String nickname,
  });
}

/// 로컬 개발용 dev 인증 API 구현 (POST /auth/dev/*).
class HttpAuthApi implements AuthApi {
  HttpAuthApi({ApiClient? client}) : _client = client ?? ApiClient();
  final ApiClient _client;

  @override
  Future<AuthResult> devLogin({required String provider}) async {
    final json = await _client.post('/auth/dev/login', body: {
      'provider': provider,
      'providerUserId': 'dev-$provider', // provider당 고정 → 같은 계정으로 재로그인
    });
    return _parseAuthResult(json, fallbackProvider: provider);
  }

  @override
  Future<AuthResult> completeOnboarding({
    required String accessToken,
    required String nickname,
  }) async {
    final json = await _client.post(
      '/auth/dev/onboarding',
      token: accessToken,
      body: {'nickname': nickname},
    );
    return _parseAuthResult(json);
  }

  AuthResult _parseAuthResult(Map<String, dynamic> json, {String? fallbackProvider}) {
    final data = json['data'] as Map<String, dynamic>;
    final user = data['user'] as Map<String, dynamic>;

    return AuthResult(
      accessToken: data['accessToken'] as String,
      user: AuthUser(
        id: user['id'] as int,
        provider: (user['provider'] as String?) ?? fallbackProvider ?? '',
        status: userStatusFromString(user['status'] as String?),
        nickname: (user['nickname'] as String?) ?? '',
      ),
    );
  }
}

/// 앱 인증 세션. 액세스 토큰과 현재 사용자 상태를 보관하고, 화면 분기에 쓴다.
///
/// 아직 실제 소셜 로그인이 없어 core-api의 임시 dev 로그인에 붙는다.
class AuthService {
  AuthService({AuthApi? api}) : _api = api ?? HttpAuthApi();
  final AuthApi _api;

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
    _apply(result);
    return result.user.status;
  }

  /// 온보딩 완료 — 로그인 토큰으로 닉네임을 저장하고 status를 active로 전이시킨다.
  Future<void> completeOnboarding(String nickname) async {
    final token = accessToken;
    if (token == null) {
      throw StateError('로그인 후에 온보딩을 완료할 수 있습니다.');
    }
    final result = await _api.completeOnboarding(accessToken: token, nickname: nickname);
    _apply(result);
  }

  /// 로그아웃 — 세션(토큰)만 비운다. 서버의 계정 상태는 유지된다.
  void logout() {
    accessToken = null;
    user = null;
  }

  void _apply(AuthResult result) {
    accessToken = result.accessToken;
    user = result.user;
  }
}

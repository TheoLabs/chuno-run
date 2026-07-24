import 'api_client.dart';

/// 약관 항목 — core-api Agreement 도메인과 동일한 형태.
class Agreement {
  const Agreement({
    required this.id,
    required this.type,
    required this.version,
    required this.required,
    required this.status,
    required this.title,
    required this.content,
  });

  /// consents 전송에 쓰는 서버 식별자.
  final int id;

  /// 'service' | 'privacy' | 'location' | 'marketing'
  final String type;
  final String version;

  /// 필수 약관이면 true — 미동의 시 온보딩이 거부된다.
  final bool required;

  /// 'pending' | 'active' | 'archived'
  final String status;
  final String title;
  final String content;

  bool get isActive => status == 'active';

  factory Agreement.fromJson(Map<String, dynamic> json) => Agreement(
        id: json['id'] as int,
        type: (json['type'] as String?) ?? '',
        version: (json['version'] as String?) ?? '',
        required: (json['required'] as bool?) ?? false,
        status: (json['status'] as String?) ?? '',
        title: (json['title'] as String?) ?? '',
        content: (json['content'] as String?) ?? '',
      );
}

/// 재동의가 필요한 약관 묶음 — GET /users/me/consents/pending 의 `data`.
class PendingConsents {
  const PendingConsents({required this.items, required this.hasRequired});

  /// 시행 중이지만 아직 동의하지 않은 약관들(개정된 새 버전 포함).
  final List<Agreement> items;

  /// 필수 약관이 포함되어 있으면 true — 동의 전에는 서비스 이용을 막아야 한다.
  final bool hasRequired;

  bool get isEmpty => items.isEmpty;

  factory PendingConsents.fromJson(Map<String, dynamic> json) => PendingConsents(
        items: (json['items'] as List<dynamic>? ?? const [])
            .map((e) => Agreement.fromJson(e as Map<String, dynamic>))
            .toList(),
        hasRequired: (json['hasRequired'] as bool?) ?? false,
      );
}

/// 약관 API 추상화 — 테스트에서 가짜 구현으로 교체할 수 있다.
abstract class AgreementApi {
  /// 활성(active) 약관 목록을 반환한다.
  Future<List<Agreement>> activeAgreements({required String accessToken});

  /// 재동의가 필요한 약관을 반환한다 (GET /users/me/consents/pending).
  Future<PendingConsents> pendingConsents({required String accessToken});

  /// 약관 재동의를 저장한다 (POST /users/me/consents).
  /// 시행 중인 필수 약관에 하나라도 동의하지 않으면 서버가 400을 돌려준다.
  Future<void> consent({
    required String accessToken,
    required List<({int agreementId, bool isAgreed})> consents,
  });
}

/// core-api 약관 API 구현 (GET /agreements).
///
/// 서버는 모든 status를 반환하므로 클라이언트에서 active만 필터한다.
class HttpAgreementApi implements AgreementApi {
  HttpAgreementApi({ApiClient? client}) : _client = client ?? ApiClient();
  final ApiClient _client;

  @override
  Future<List<Agreement>> activeAgreements({required String accessToken}) async {
    final json = await _client.get('/agreements', token: accessToken);
    final data = json['data'] as Map<String, dynamic>;
    final items = (data['items'] as List<dynamic>? ?? const [])
        .map((e) => Agreement.fromJson(e as Map<String, dynamic>))
        .where((a) => a.isActive)
        .toList();
    return items;
  }

  @override
  Future<PendingConsents> pendingConsents({required String accessToken}) async {
    final json = await _client.get('/users/me/consents/pending', token: accessToken);
    return PendingConsents.fromJson(json['data'] as Map<String, dynamic>);
  }

  @override
  Future<void> consent({
    required String accessToken,
    required List<({int agreementId, bool isAgreed})> consents,
  }) async {
    await _client.post('/users/me/consents', token: accessToken, body: {
      'consents': consents
          .map((c) => {'agreementId': c.agreementId, 'isAgreed': c.isAgreed})
          .toList(),
    });
  }
}

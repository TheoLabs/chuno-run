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

/// 약관 API 추상화 — 테스트에서 가짜 구현으로 교체할 수 있다.
abstract class AgreementApi {
  /// 활성(active) 약관 목록을 반환한다.
  Future<List<Agreement>> activeAgreements({required String accessToken});
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
}

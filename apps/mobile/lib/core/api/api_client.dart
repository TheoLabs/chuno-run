import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';

/// API 오류. 서버가 보낸 상태코드·메시지를 담는다.
class ApiException implements Exception {
  ApiException(this.statusCode, this.message);
  final int statusCode;
  final String message;

  @override
  String toString() => 'ApiException($statusCode): $message';
}

/// 얇은 HTTP 래퍼. JSON 요청/응답을 처리하고 core-api의 `{ data }` 응답을 그대로 돌려준다.
class ApiClient {
  ApiClient({http.Client? client, String? baseUrl})
      : _client = client ?? http.Client(),
        _baseUrl = baseUrl ?? AppConfig.apiBaseUrl;

  final http.Client _client;
  final String _baseUrl;

  Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? body,
    String? token,
  }) async {
    final res = await _client.post(
      Uri.parse('$_baseUrl$path'),
      headers: _headers(token),
      body: jsonEncode(body ?? const {}),
    );
    return _decode(res);
  }

  Future<Map<String, dynamic>> get(String path, {String? token}) async {
    final res = await _client.get(Uri.parse('$_baseUrl$path'), headers: _headers(token));
    return _decode(res);
  }

  Map<String, String> _headers(String? token) => {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  Map<String, dynamic> _decode(http.Response res) {
    final decoded = res.body.isNotEmpty
        ? jsonDecode(res.body) as Map<String, dynamic>
        : <String, dynamic>{};

    if (res.statusCode >= 200 && res.statusCode < 300) return decoded;

    final message = decoded['message']?.toString() ?? 'HTTP ${res.statusCode}';
    throw ApiException(res.statusCode, message);
  }
}

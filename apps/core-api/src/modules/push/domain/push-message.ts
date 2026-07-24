/** 발송할 푸시 한 건. 데이터 payload는 앱이 탭 라우팅에 쓴다. */
export interface PushMessage {
  /** 대상 FCM 토큰. */
  token: string;
  title: string;
  body: string;
  /** 앱이 읽는 커스텀 데이터(예: type, roomId). 값은 모두 문자열이어야 한다(FCM 규약). */
  data?: Record<string, string>;
}

/** 멀티캐스트 발송 결과 — 무효 토큰 정리에 쓴다. */
export interface PushSendResult {
  successCount: number;
  failureCount: number;
  /** 발송에 실패해 폐기해야 하는 토큰들(UNREGISTERED 등). */
  invalidTokens: string[];
}

/**
 * 푸시 발송기 추상화. 운영에선 FCM 구현이, 키가 없는 로컬에선 로깅 구현이 쓰인다.
 * NotificationService는 이 인터페이스만 알아서 어느 구현이든 동일하게 동작한다.
 */
export abstract class PushSender {
  /** 여러 토큰에 같은 메시지를 보낸다. 실패한 무효 토큰을 결과로 돌려준다. */
  abstract sendEach(messages: PushMessage[]): Promise<PushSendResult>;
}

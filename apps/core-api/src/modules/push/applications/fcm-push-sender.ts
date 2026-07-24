import { ConfigsService } from '@configs';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { App } from 'firebase-admin/app';
import { PushMessage, PushSender, PushSendResult } from '../domain/push-message';

/**
 * FCM 기반 푸시 발송기. **FCM 단일 창구**(Android 직접 · iOS는 FCM→APNs 릴레이) 규약을 구현한다.
 *
 * 서비스 계정 키(FIREBASE_SERVICE_ACCOUNT, base64 JSON)가 설정돼 있으면 firebase-admin을 초기화하고,
 * 없으면 스스로 비활성 상태가 되어 로그만 남긴다 — 키 발급 전 로컬에서도 발송 흐름을 그대로 검증할 수 있다.
 * 무효 토큰(UNREGISTERED/INVALID_ARGUMENT) 응답은 결과의 invalidTokens로 돌려줘 상위에서 기기를 해지한다.
 */
@Injectable()
export class FcmPushSender extends PushSender implements OnModuleInit {
  private readonly logger = new Logger(FcmPushSender.name);
  private app?: App;

  /** 발송 실패 시 토큰을 폐기해야 하는 FCM 오류 코드. */
  private static readonly INVALID_TOKEN_CODES = [
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token',
    'messaging/invalid-argument',
  ];

  constructor(private readonly configsService: ConfigsService) {
    super();
  }

  async onModuleInit() {
    const raw = this.configsService.firebase.serviceAccount;

    if (!raw) {
      this.logger.log('FIREBASE_SERVICE_ACCOUNT 미설정 — 푸시는 로그로만 남기고 실제 발송하지 않습니다.');
      return;
    }

    try {
      const { initializeApp, cert, getApps } = await import('firebase-admin/app');
      const credential = cert(JSON.parse(Buffer.from(raw, 'base64').toString('utf8')));
      // 같은 프로세스에서 중복 초기화 방지.
      this.app = getApps()[0] ?? initializeApp({ credential }, 'chuno-push');
      this.logger.log('FCM 푸시 발송기 초기화 완료.');
    } catch (error) {
      this.logger.error(`FCM 초기화 실패 — 로그 발송으로 대체합니다: ${this.toMessage(error)}`);
    }
  }

  async sendEach(messages: PushMessage[]): Promise<PushSendResult> {
    if (messages.length === 0) {
      return { successCount: 0, failureCount: 0, invalidTokens: [] };
    }

    // 키 미설정·초기화 실패 시: 실제 발송 없이 로그만. (발송 성공으로 간주해 흐름을 막지 않는다.)
    if (!this.app) {
      messages.forEach((message) =>
        this.logger.debug(`[push:noop] ${message.title} — ${message.body} → ${message.token.slice(0, 12)}…`)
      );
      return { successCount: messages.length, failureCount: 0, invalidTokens: [] };
    }

    const { getMessaging } = await import('firebase-admin/messaging');
    const response = await getMessaging(this.app).sendEach(
      messages.map((message) => ({
        token: message.token,
        notification: { title: message.title, body: message.body },
        data: message.data,
      }))
    );

    const invalidTokens: string[] = [];
    response.responses.forEach((res, index) => {
      const code = res.error?.code;
      if (code && FcmPushSender.INVALID_TOKEN_CODES.includes(code)) {
        invalidTokens.push(messages[index].token);
      }
    });

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      invalidTokens,
    };
  }

  private toMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}

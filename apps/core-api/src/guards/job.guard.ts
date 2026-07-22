import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { ConfigsService } from '@configs';

// 외부 스케줄러(예: AWS EventBridge)가 배치 잡 엔드포인트를 호출할 때 쓰는 헤더.
const SCHEDULER_TOKEN_HEADER = 'x-scheduler-token';

/**
 * 스케줄러(머신) 전용 가드. `x-scheduler-token` 헤더를 설정된 시크릿과 대조한다.
 * 사람 관리자용 AdminGuard와 별개다 — 스케줄러는 구글 로그인 JWT를 받을 수 없으므로 헤더 토큰으로 인증한다.
 */
@Injectable()
export class JobGuard implements CanActivate {
  constructor(private readonly configsService: ConfigsService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const expected = this.configsService.job.schedulerToken;
    const provided = this.extractSchedulerToken(request);

    if (!expected || !provided || provided !== expected) {
      throw new UnauthorizedException('스케줄러 실행 권한이 없습니다.', {
        description: '유효한 스케줄러 토큰(x-scheduler-token)이 아닙니다.',
      });
    }

    return true;
  }

  private extractSchedulerToken(request: Request): string | undefined {
    const raw = request.headers[SCHEDULER_TOKEN_HEADER];
    return Array.isArray(raw) ? raw[0] : raw;
  }
}

import { ConfigsService } from '@configs';
import { diffSeconds } from '@libs/date';
import { Injectable } from '@nestjs/common';
import { CalendarDate } from '@types';
import { CheatAction, CheatType } from '../domain/cheat-detection.entity';
import { Participant } from '../domain/participant.entity';

/** 정합성 검사 결과. accepted=반영, 그 외는 조치와 탐지 근거를 담는다. */
export interface RevalidationVerdict {
  /** 검사 통과 여부. false면 detection이 채워진다. */
  accepted: boolean;
  detection?: {
    type: CheatType;
    action: CheatAction;
    observedSpeedMps?: number;
    thresholdSpeedMps?: number;
    intervalSeconds?: number;
    detail: string;
  };
}

/**
 * 서버 정합성 재검증(2차 §3). 좌표를 재계산하지 않고 거리 증분·페이스·타임스탬프 관측값만으로
 * 클라이언트 보고가 물리적으로 말이 되는지 검사한다.
 *
 * - abnormalSpeed(반려): 구간 속도가 상한(기본 6.5 m/s)을 넘음
 * - spoofSuspected(무효): 구간 속도가 상한의 3배를 넘는 순간이동성 패턴
 * - timestampMismatch(반려): 서버 경과 시간과 클라 주장 경과 시간의 괴리가 큼
 * - impossibleFinish(무효): 목표 도달까지의 평균 페이스가 하한(기본 2'00"/km)보다 빠름
 *
 * 임계값은 설정(REVALIDATION_*)으로 관리해 실측 로그로 튜닝한다.
 */
@Injectable()
export class RaceRevalidationService {
  constructor(private readonly configsService: ConfigsService) {}

  private get thresholds() {
    return this.configsService.revalidation;
  }

  /**
   * 진행 보고 검사. 새 보고가 이전 인정값에서 얼마나·얼마나 빨리 늘었는지 본다.
   * 뒤로 가거나 제자리인 보고(증분 ≤ 0)는 통과시킨다 — progress()가 최대값만 유지하므로 안전하다.
   */
  validateProgress({
    participant,
    reportedDistanceMeter,
    now,
    clientElapsedSeconds,
    raceStartOn,
  }: {
    participant: Participant;
    reportedDistanceMeter: number;
    now: CalendarDate;
    clientElapsedSeconds?: number;
    raceStartOn: CalendarDate;
  }): RevalidationVerdict {
    const increment = reportedDistanceMeter - participant.currentDistanceMeter;

    if (increment <= 0) {
      return { accepted: true };
    }

    // 타임스탬프 정합 — 서버 경과 시간과 클라가 주장하는 경과 시간의 괴리.
    if (clientElapsedSeconds !== undefined) {
      const serverElapsed = diffSeconds(now, raceStartOn);
      const skew = Math.abs(serverElapsed - clientElapsedSeconds);

      if (skew > this.thresholds.maxTimestampSkewSec) {
        return this.reject(CheatType.TIMESTAMP_MISMATCH, {
          intervalSeconds: skew,
          detail: `경과 시간 괴리 ${skew}s — 허용 ${this.thresholds.maxTimestampSkewSec}s 초과`,
        });
      }
    }

    // 구간 속도 — 직전 인정 보고 이후 얼마나 빨리 이동했는지. 0초 구간은 1초로 눕혀 나눗셈을 보호한다.
    const base = participant.lastProgressOn ?? raceStartOn;
    const intervalSeconds = Math.max(1, diffSeconds(now, base));
    const speedMps = increment / intervalSeconds;
    const { maxSpeedMps } = this.thresholds;

    if (speedMps > maxSpeedMps * 3) {
      // 순간이동 수준 — 위치 조작 의심. 기록 무효.
      return this.void(CheatType.SPOOF_SUSPECTED, {
        observedSpeedMps: speedMps,
        thresholdSpeedMps: maxSpeedMps,
        intervalSeconds,
        detail: `구간 ${speedMps.toFixed(1)} m/s — 상한 ${maxSpeedMps} m/s의 3배 초과(위치 조작 의심)`,
      });
    }

    if (speedMps > maxSpeedMps) {
      // 사람 속도 범위 초과 — 해당 보고만 반려.
      return this.reject(CheatType.ABNORMAL_SPEED, {
        observedSpeedMps: speedMps,
        thresholdSpeedMps: maxSpeedMps,
        intervalSeconds,
        detail: `구간 ${speedMps.toFixed(1)} m/s — 상한 ${maxSpeedMps} m/s 초과`,
      });
    }

    return { accepted: true };
  }

  /**
   * 목표 도달 재검증. 출발부터 도달까지의 평균 페이스가 인간 하한(2'00"/km)보다 빠르면
   * 물리적으로 불가능한 완주로 보고 무효 처리한다.
   */
  validateGoalReach({
    reachedDistanceMeter,
    now,
    raceStartOn,
  }: {
    reachedDistanceMeter: number;
    now: CalendarDate;
    raceStartOn: CalendarDate;
  }): RevalidationVerdict {
    const elapsedSeconds = diffSeconds(now, raceStartOn);

    if (reachedDistanceMeter <= 0 || elapsedSeconds <= 0) {
      return { accepted: true };
    }

    const paceSecPerKm = elapsedSeconds / (reachedDistanceMeter / 1000);

    if (paceSecPerKm < this.thresholds.minPaceSecPerKm) {
      return this.void(CheatType.IMPOSSIBLE_FINISH, {
        intervalSeconds: elapsedSeconds,
        detail: `평균 페이스 ${Math.round(paceSecPerKm)}s/km — 하한 ${this.thresholds.minPaceSecPerKm}s/km보다 빠름`,
      });
    }

    return { accepted: true };
  }

  private reject(
    type: CheatType,
    meta: Omit<NonNullable<RevalidationVerdict['detection']>, 'type' | 'action'>
  ): RevalidationVerdict {
    return { accepted: false, detection: { type, action: CheatAction.REJECTED, ...meta } };
  }

  private void(
    type: CheatType,
    meta: Omit<NonNullable<RevalidationVerdict['detection']>, 'type' | 'action'>
  ): RevalidationVerdict {
    return { accepted: false, detection: { type, action: CheatAction.VOIDED, ...meta } };
  }
}

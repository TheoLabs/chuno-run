import type { DataSourceOptions } from 'typeorm';
import type { RedisOptions } from 'ioredis';

export interface JwtConfig {
  accessTokenExpired: string;
  accessTokenSecret: string;
}

export interface KafkaConfig {
  clientId: string;
  brokers: string[];
  groupId: string;
  topic: string;
}

export interface GoogleConfig {
  clientId: string;
}

/** 앱(모바일) 소셜 로그인 검증 설정. 값은 모두 공개값(클라이언트 ID·번들 ID)이다. */
export interface OauthConfig {
  /** 구글 ID 토큰 audience 허용 목록 — iOS/Android 클라이언트 ID 가 서로 다르다. */
  googleClientIds: string[];
  /** 애플 identity token audience 허용 목록 — 앱 번들 ID / 서비스 ID. */
  appleClientIds: string[];
}

/** FCM 푸시 발송 설정. 서비스 계정 키(비공개)라 서버에만 둔다. */
export interface FirebaseConfig {
  /** 서비스 계정 JSON을 base64 인코딩한 값. 미설정이면 푸시는 로그로만 남는다. */
  serviceAccount: string;
}

/** 서버 정합성 재검증 임계값(2차 기획 §3 콜아웃). 실측 로그로 튜닝하도록 설정으로 뺀다. */
export interface RevalidationConfig {
  /** 거리 증분 상한 — 인간 최대 속도(m/s). 기본 6.5. */
  maxSpeedMps: number;
  /** 순간 페이스 하한(초/km). 이보다 빠르면 이상치. 기본 120(2'00"/km). */
  minPaceSecPerKm: number;
  /** 서버 수신 시각과 클라 주장 경과 시간의 허용 괴리(초). 기본 30. */
  maxTimestampSkewSec: number;
}

export interface JobConfig {
  // 외부 스케줄러(EventBridge 등)가 배치 잡을 호출할 때 x-scheduler-token 헤더로 제시하는 시크릿.
  schedulerToken: string;
}

interface AppConfig {
  mysql: DataSourceOptions;
  jwt: JwtConfig;
  kafka: KafkaConfig;
  redis: RedisOptions;
  google: GoogleConfig;
  oauth: OauthConfig;
  firebase: FirebaseConfig;
  revalidation: RevalidationConfig;
  job: JobConfig;
}

/** 쉼표 구분 환경변수를 문자열 배열로. 미설정이면 빈 배열(설정 누락으로 취급). */
const toList = (value?: string): string[] =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export default (env: Record<string, any> = process.env): AppConfig => ({
  mysql: {
    type: 'mysql',
    port: 3306,
    host: env.MYSQL_HOST,
    username: env.MYSQL_USERNAME,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DATABASE,
  },
  jwt: {
    accessTokenExpired: env.ACCESS_TOKEN_EXPIRED,
    accessTokenSecret: env.ACCESS_TOKEN_SECRET,
  },
  kafka: {
    clientId: env.KAFKA_CLIENT_ID,
    brokers: (env.KAFKA_BROKERS ?? '')
      .split(',')
      .map((broker: string) => broker.trim())
      .filter(Boolean),
    groupId: env.KAFKA_GROUP_ID,
    topic: env.KAFKA_DDD_EVENT_TOPIC,
  },
  redis: {
    host: env.REDIS_HOST,
    port: Number(env.REDIS_PORT),
  },
  google: {
    clientId: env.GOOGLE_CLIENT_ID,
  },
  oauth: {
    googleClientIds: toList(env.GOOGLE_APP_CLIENT_IDS),
    appleClientIds: toList(env.APPLE_CLIENT_IDS),
  },
  firebase: {
    serviceAccount: env.FIREBASE_SERVICE_ACCOUNT ?? '',
  },
  revalidation: {
    maxSpeedMps: Number(env.REVALIDATION_MAX_SPEED_MPS ?? 6.5),
    minPaceSecPerKm: Number(env.REVALIDATION_MIN_PACE_SEC_PER_KM ?? 120),
    maxTimestampSkewSec: Number(env.REVALIDATION_MAX_TIMESTAMP_SKEW_SEC ?? 30),
  },
  job: {
    schedulerToken: env.SCHEDULER_JOB_TOKEN,
  },
});

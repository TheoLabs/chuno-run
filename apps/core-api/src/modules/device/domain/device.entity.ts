import { today } from '@libs/date';
import { DddAggregate } from '@libs/ddd';
import { CalendarDate } from '@types';
import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

export enum DevicePlatform {
  IOS = 'ios',
  ANDROID = 'android',
}

export enum NotificationPermission {
  GRANTED = 'granted',
  DENIED = 'denied',
  UNDETERMINED = 'undetermined',
}

export enum DeviceStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
}

/** 알림 종류별 수신 설정. 기기 관리·알림 설정 화면과 발송 필터가 공유한다. */
export enum NotificationKind {
  RACE_STARTING_SOON = 'raceStartingSoon',
  RACE_STARTED = 'raceStarted',
  RACE_FINISHED = 'raceFinished',
}

type Ctor = {
  userId: number;
  installationId: string;
  platform: DevicePlatform;
  pushToken?: string | null;
  notificationPermission?: NotificationPermission;
  deviceName?: string | null;
};

/**
 * 사용자가 로그인한 기기 하나. 멀티기기 지원과 푸시 발송의 단위다.
 *
 * 로그인·알림 권한 허용 시 FCM 토큰과 함께 등록되고, 로그아웃·기기 해지·FCM 무효 응답 시
 * revoked로 전이해 발송 대상에서 빠진다. 같은 사용자·설치 조합은 유일(UQ)이라, 같은 기기에서
 * 재로그인하면 새 행이 아니라 기존 행을 되살린다.
 */
@Entity()
@Unique('unique_device_user_id_installation_id', ['userId', 'installationId'])
@Index('idx_device_user_id', ['userId'])
export class Device extends DddAggregate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: '소유 사용자' })
  userId: number;

  @Column({ comment: '앱 설치 단위 식별자(재설치하면 새 값)' })
  installationId: string;

  @Column({ type: 'enum', enum: DevicePlatform, comment: '기기 플랫폼' })
  platform: DevicePlatform;

  @Column({ type: 'varchar', nullable: true, comment: 'FCM 등록 토큰. 권한 미허용이면 null' })
  pushToken: string | null;

  @Column({
    type: 'enum',
    enum: NotificationPermission,
    default: NotificationPermission.UNDETERMINED,
    comment: '기기 알림 권한 상태',
  })
  notificationPermission: NotificationPermission;

  @Column({ default: true, comment: '시작 임박(모집 마감) 알림 수신 여부' })
  raceStartingSoonEnabled: boolean;

  @Column({ default: true, comment: '경주 시작(live) 알림 수신 여부' })
  raceStartedEnabled: boolean;

  @Column({ default: true, comment: '경주 종료(finished) 알림 수신 여부' })
  raceFinishedEnabled: boolean;

  @Column({ type: 'enum', enum: DeviceStatus, default: DeviceStatus.ACTIVE, comment: '기기 세션 상태' })
  status: DeviceStatus;

  @Column({ type: 'varchar', nullable: true, comment: '사용자에게 보여줄 기기 이름' })
  deviceName: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, comment: '마지막 사용 시각' })
  lastActiveOn: CalendarDate | null;

  @Column({ type: 'varchar', length: 20, nullable: true, comment: '해지 시각(revoked일 때만)' })
  revokedOn: CalendarDate | null;

  private constructor(args: Ctor) {
    super();

    if (args) {
      this.userId = args.userId;
      this.installationId = args.installationId;
      this.platform = args.platform;
      this.pushToken = args.pushToken ?? null;
      this.notificationPermission = args.notificationPermission ?? NotificationPermission.UNDETERMINED;
      this.raceStartingSoonEnabled = true;
      this.raceStartedEnabled = true;
      this.raceFinishedEnabled = true;
      this.status = DeviceStatus.ACTIVE;
      this.deviceName = args.deviceName ?? null;
      this.lastActiveOn = today('YYYY-MM-DD HH:mm:ss');
      this.revokedOn = null;
    }
  }

  static create(args: Ctor) {
    return new Device(args);
  }

  /**
   * 등록 갱신 — 같은 기기에서 재로그인·토큰 갱신·권한 변경 시 호출한다.
   * revoked 상태였다면 다시 active로 되살린다(로그아웃 후 재로그인).
   */
  refresh(args: {
    platform?: DevicePlatform;
    pushToken?: string | null;
    notificationPermission?: NotificationPermission;
    deviceName?: string | null;
  }) {
    if (args.platform !== undefined) {
      this.platform = args.platform;
    }
    if (args.pushToken !== undefined) {
      this.pushToken = args.pushToken;
    }
    if (args.notificationPermission !== undefined) {
      this.notificationPermission = args.notificationPermission;
    }
    if (args.deviceName !== undefined && args.deviceName) {
      this.deviceName = args.deviceName;
    }

    this.status = DeviceStatus.ACTIVE;
    this.revokedOn = null;
    this.lastActiveOn = today('YYYY-MM-DD HH:mm:ss');
  }

  /** 알림 종류별 수신 설정 변경. 넘긴 항목만 바꾼다. */
  changeNotificationSettings(settings: Partial<Record<NotificationKind, boolean>>) {
    if (settings[NotificationKind.RACE_STARTING_SOON] !== undefined) {
      this.raceStartingSoonEnabled = settings[NotificationKind.RACE_STARTING_SOON]!;
    }
    if (settings[NotificationKind.RACE_STARTED] !== undefined) {
      this.raceStartedEnabled = settings[NotificationKind.RACE_STARTED]!;
    }
    if (settings[NotificationKind.RACE_FINISHED] !== undefined) {
      this.raceFinishedEnabled = settings[NotificationKind.RACE_FINISHED]!;
    }
  }

  /** 해지 — 로그아웃·사용자 해지·FCM 무효 토큰 응답 시. 발송 대상에서 빠진다(멱등). */
  revoke() {
    if (this.status === DeviceStatus.REVOKED) {
      return;
    }

    this.status = DeviceStatus.REVOKED;
    this.revokedOn = today('YYYY-MM-DD HH:mm:ss');
  }

  /** 이 기기가 해당 종류 알림을 받을 수 있는지 — 활성·권한 허용·토큰 존재·종류 on. */
  canReceive(kind: NotificationKind): boolean {
    if (this.status !== DeviceStatus.ACTIVE) {
      return false;
    }
    if (this.notificationPermission !== NotificationPermission.GRANTED) {
      return false;
    }
    if (!this.pushToken) {
      return false;
    }

    switch (kind) {
      case NotificationKind.RACE_STARTING_SOON:
        return this.raceStartingSoonEnabled;
      case NotificationKind.RACE_STARTED:
        return this.raceStartedEnabled;
      case NotificationKind.RACE_FINISHED:
        return this.raceFinishedEnabled;
      default:
        return false;
    }
  }
}

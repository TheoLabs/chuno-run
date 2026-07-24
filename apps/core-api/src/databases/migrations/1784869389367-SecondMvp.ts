import { MigrationInterface, QueryRunner } from "typeorm";

export class SecondMvp1784869389367 implements MigrationInterface {
    name = 'SecondMvp1784869389367'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`device\` (\`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`createdBy\` varchar(255) NULL, \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updatedBy\` varchar(255) NULL, \`deletedAt\` datetime(6) NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL COMMENT '소유 사용자', \`installationId\` varchar(255) NOT NULL COMMENT '앱 설치 단위 식별자(재설치하면 새 값)', \`platform\` enum ('ios', 'android') NOT NULL COMMENT '기기 플랫폼', \`pushToken\` varchar(255) NULL COMMENT 'FCM 등록 토큰. 권한 미허용이면 null', \`notificationPermission\` enum ('granted', 'denied', 'undetermined') NOT NULL COMMENT '기기 알림 권한 상태' DEFAULT 'undetermined', \`raceStartingSoonEnabled\` tinyint NOT NULL COMMENT '시작 임박(모집 마감) 알림 수신 여부' DEFAULT 1, \`raceStartedEnabled\` tinyint NOT NULL COMMENT '경주 시작(live) 알림 수신 여부' DEFAULT 1, \`raceFinishedEnabled\` tinyint NOT NULL COMMENT '경주 종료(finished) 알림 수신 여부' DEFAULT 1, \`status\` enum ('active', 'revoked') NOT NULL COMMENT '기기 세션 상태' DEFAULT 'active', \`deviceName\` varchar(255) NULL COMMENT '사용자에게 보여줄 기기 이름', \`lastActiveOn\` varchar(20) NULL COMMENT '마지막 사용 시각', \`revokedOn\` varchar(20) NULL COMMENT '해지 시각(revoked일 때만)', INDEX \`idx_device_user_id\` (\`userId\`), UNIQUE INDEX \`unique_device_user_id_installation_id\` (\`userId\`, \`installationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`cheat_detection\` (\`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`createdBy\` varchar(255) NULL, \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updatedBy\` varchar(255) NULL, \`deletedAt\` datetime(6) NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`participantId\` int NOT NULL COMMENT '탐지된 참가 기록', \`type\` enum ('abnormalSpeed', 'spoofSuspected', 'timestampMismatch', 'impossibleFinish') NOT NULL COMMENT '탐지 유형', \`action\` enum ('rejected', 'voided') NOT NULL COMMENT '자동 조치(반려/무효)', \`reportedDistanceMeter\` int NOT NULL COMMENT '클라이언트가 보고한 누적 거리(m)', \`acceptedDistanceMeter\` int NOT NULL COMMENT '서버가 유지한 누적 거리(m)', \`observedSpeedMps\` decimal(8,3) NULL COMMENT '관측된 구간 속도(m/s)', \`thresholdSpeedMps\` decimal(8,3) NULL COMMENT '판정에 쓴 임계 속도(m/s)', \`intervalSeconds\` int NULL COMMENT '직전 보고 이후 경과 시간(초)', \`detail\` varchar(255) NULL COMMENT '사람이 읽을 판정 설명', \`detectedOn\` varchar(255) NOT NULL COMMENT '탐지 시각', INDEX \`idx_cheat_detection_participant_id\` (\`participantId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`participant\` ADD \`lastProgressOn\` varchar(20) NULL COMMENT '[2차] 마지막으로 인정된 진행 보고 시각 — 정합성 검사·복귀 재동기화 기준점'`);
        await queryRunner.query(`ALTER TABLE \`participant\` ADD \`voided\` tinyint NOT NULL COMMENT '[2차] 부정행위 탐지로 기록이 무효 처리됐는지' DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`exitedOn\` varchar(20) NULL COMMENT '[2차] 탈퇴 요청 시각 — exitedOn+30일이 파기·복구 가능 기준'`);
        await queryRunner.query(`ALTER TABLE \`cheat_detection\` ADD CONSTRAINT \`FK_b64aedf36e2a3025699f68927eb\` FOREIGN KEY (\`participantId\`) REFERENCES \`participant\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`cheat_detection\` DROP FOREIGN KEY \`FK_b64aedf36e2a3025699f68927eb\``);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`exitedOn\``);
        await queryRunner.query(`ALTER TABLE \`participant\` DROP COLUMN \`voided\``);
        await queryRunner.query(`ALTER TABLE \`participant\` DROP COLUMN \`lastProgressOn\``);
        await queryRunner.query(`DROP INDEX \`idx_cheat_detection_participant_id\` ON \`cheat_detection\``);
        await queryRunner.query(`DROP TABLE \`cheat_detection\``);
        await queryRunner.query(`DROP INDEX \`unique_device_user_id_installation_id\` ON \`device\``);
        await queryRunner.query(`DROP INDEX \`idx_device_user_id\` ON \`device\``);
        await queryRunner.query(`DROP TABLE \`device\``);
    }

}

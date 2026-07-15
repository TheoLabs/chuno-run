import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1784081120730 implements MigrationInterface {
    name = 'Init1784081120730'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`ddd_event\` (\`id\` varchar(36) NOT NULL, \`txId\` varchar(255) NOT NULL, \`eventType\` varchar(255) NOT NULL COMMENT '이벤트의 타입', \`payload\` text NOT NULL, \`scheduledAt\` datetime NULL COMMENT '실행 예정 시각', \`occurredAt\` datetime NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`idx_ddd_event_created_at\` (\`createdAt\`), INDEX \`idx_ddd_event_txId\` (\`txId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`participant\` (\`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`createdBy\` varchar(255) NULL, \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updatedBy\` varchar(255) NULL, \`deletedAt\` datetime(6) NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`roomId\` int NOT NULL, \`userId\` int NOT NULL COMMENT '참가 user id', \`status\` enum ('joined', 'running', 'finished', 'dnf', 'kicked') NOT NULL, \`currentDistanceMeter\` int NOT NULL COMMENT '현재까지 달린 거리(m)', \`finishedOn\` varchar(20) NULL COMMENT '목표 도달 또는 종료 시각', \`finalRank\` int NULL COMMENT '최종 등수', \`joinOn\` varchar(255) NOT NULL COMMENT '방 참가 시각', INDEX \`idx_participant_user_id\` (\`userId\`), UNIQUE INDEX \`unique_room_id_user_id\` (\`roomId\`, \`userId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`room\` (\`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`createdBy\` varchar(255) NULL, \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updatedBy\` varchar(255) NULL, \`deletedAt\` datetime(6) NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`hostUserId\` int NOT NULL COMMENT '방장', \`title\` varchar(255) NOT NULL COMMENT '방 제목', \`goalDistanceMeter\` int NOT NULL COMMENT '목표 거리 (m)', \`goalLimitMinutes\` int NOT NULL COMMENT '제한 시간 (분)', \`startOn\` varchar(255) NOT NULL COMMENT '게임 시작 시간', \`capacity\` int NOT NULL COMMENT '최대 수용 인원', \`status\` enum ('recruiting', 'ready', 'live', 'finished', 'cancelled') NOT NULL COMMENT '방 상태', \`finishedOn\` varchar(20) NULL COMMENT '게임 종료 시간 (YYYY-MM-DD HH:mm:ss)', PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`user\` (\`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`createdBy\` varchar(255) NULL, \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updatedBy\` varchar(255) NULL, \`deletedAt\` datetime(6) NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`provider\` enum ('kakao', 'google', 'apple') NOT NULL COMMENT '소셜 로그인 제공자', \`providerUserId\` varchar(255) NOT NULL COMMENT '제공자가 부여한 사용자 식별자', \`status\` enum ('onboarding', 'active', 'exited', 'suspended') NOT NULL, \`nickname\` varchar(255) NULL COMMENT '표시 이름', \`profileImageUrl\` varchar(255) NULL COMMENT '프로필 이미지 URL', \`joinOn\` varchar(255) NOT NULL COMMENT '가입 시각 (YYYY-MM-DD HH:mm:ss)', UNIQUE INDEX \`unique_provider_provider_user_id\` (\`provider\`, \`providerUserId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`user_consent\` (\`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`createdBy\` varchar(255) NULL, \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updatedBy\` varchar(255) NULL, \`deletedAt\` datetime(6) NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`agreementId\` int NOT NULL COMMENT '대상 약관 ID', \`isAgreed\` tinyint NOT NULL COMMENT '동의 약관 여부', \`consentedOn\` varchar(255) NOT NULL COMMENT '처리시각 (YYYY-MM-DD HH:mm:ss)', UNIQUE INDEX \`unique_user_consent_user_id_agreement_id\` (\`userId\`, \`agreementId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`agreement\` (\`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`createdBy\` varchar(255) NULL, \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updatedBy\` varchar(255) NULL, \`deletedAt\` datetime(6) NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`type\` enum ('service', 'privacy', 'location', 'marketing') NOT NULL COMMENT '약관 유형', \`version\` varchar(255) NOT NULL COMMENT '약관 버전(예: 1.0)', \`required\` tinyint NOT NULL COMMENT '필수 동의 여부', \`status\` enum ('pending', 'active', 'archived') NOT NULL, \`title\` varchar(255) NOT NULL COMMENT '약관 제목', \`content\` text NOT NULL COMMENT '약관 본문', \`expectedActivatedOn\` varchar(255) NOT NULL COMMENT '시행 예정일 (YYYY-MM-DD)', UNIQUE INDEX \`unique_agreement_type_version\` (\`type\`, \`version\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`participant\` ADD CONSTRAINT \`FK_88cc2da357cc7b7f59fc5960d0c\` FOREIGN KEY (\`roomId\`) REFERENCES \`room\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_consent\` ADD CONSTRAINT \`FK_3ca13251d989aa9f2cf5eff2126\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_consent\` DROP FOREIGN KEY \`FK_3ca13251d989aa9f2cf5eff2126\``);
        await queryRunner.query(`ALTER TABLE \`participant\` DROP FOREIGN KEY \`FK_88cc2da357cc7b7f59fc5960d0c\``);
        await queryRunner.query(`DROP INDEX \`unique_agreement_type_version\` ON \`agreement\``);
        await queryRunner.query(`DROP TABLE \`agreement\``);
        await queryRunner.query(`DROP INDEX \`unique_user_consent_user_id_agreement_id\` ON \`user_consent\``);
        await queryRunner.query(`DROP TABLE \`user_consent\``);
        await queryRunner.query(`DROP INDEX \`unique_provider_provider_user_id\` ON \`user\``);
        await queryRunner.query(`DROP TABLE \`user\``);
        await queryRunner.query(`DROP TABLE \`room\``);
        await queryRunner.query(`DROP INDEX \`unique_room_id_user_id\` ON \`participant\``);
        await queryRunner.query(`DROP INDEX \`idx_participant_user_id\` ON \`participant\``);
        await queryRunner.query(`DROP TABLE \`participant\``);
        await queryRunner.query(`DROP INDEX \`idx_ddd_event_txId\` ON \`ddd_event\``);
        await queryRunner.query(`DROP INDEX \`idx_ddd_event_created_at\` ON \`ddd_event\``);
        await queryRunner.query(`DROP TABLE \`ddd_event\``);
    }

}

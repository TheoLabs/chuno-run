import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveParticipantKickedStatus1784083097291 implements MigrationInterface {
  name = 'RemoveParticipantKickedStatus1784083097291';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`participant\` CHANGE \`status\` \`status\` enum ('joined', 'running', 'finished', 'dnf') NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`participant\` CHANGE \`status\` \`status\` enum ('joined', 'running', 'finished', 'dnf', 'kicked') NOT NULL`
    );
  }
}

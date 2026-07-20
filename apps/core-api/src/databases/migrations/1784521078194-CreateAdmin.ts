import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdmin1784521078194 implements MigrationInterface {
  name = 'CreateAdmin1784521078194';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`admin\` (\`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`createdBy\` varchar(255) NULL, \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updatedBy\` varchar(255) NULL, \`deletedAt\` datetime(6) NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`email\` varchar(255) NOT NULL COMMENT '구글 계정 이메일', \`googleSub\` varchar(255) NULL COMMENT '구글 계정 고유 id', \`name\` varchar(255) NULL COMMENT '이름', \`status\` enum ('active', 'disabled') NOT NULL, UNIQUE INDEX \`IDX_de87485f6489f5d0995f584195\` (\`email\`), UNIQUE INDEX \`IDX_f512c67b1a5e3f5d20e862ab20\` (\`googleSub\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`IDX_f512c67b1a5e3f5d20e862ab20\` ON \`admin\``);
    await queryRunner.query(`DROP INDEX \`IDX_de87485f6489f5d0995f584195\` ON \`admin\``);
    await queryRunner.query(`DROP TABLE \`admin\``);
  }
}

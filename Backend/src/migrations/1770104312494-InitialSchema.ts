import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1770104312494 implements MigrationInterface {
    name = 'InitialSchema1770104312494'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`userId\` \`userId\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD PRIMARY KEY (\`userId\`)`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`userId\` \`userId\` int NOT NULL AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD UNIQUE INDEX \`IDX_9047b2d58f91586f14f0cf44a4\` (\`userEmail\`)`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`userPhone1\` \`userPhone1\` varchar(20) NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`userPhone2\` \`userPhone2\` varchar(20) NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`resetToken\` \`resetToken\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`resetTokenExpires\` \`resetTokenExpires\` datetime NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`role\` \`role\` varchar(50) NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`lastLoginAttempt\` \`lastLoginAttempt\` datetime NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`lockedUntil\` \`lockedUntil\` datetime NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`lastLogin\` \`lastLogin\` datetime NULL`);
        await queryRunner.query(`ALTER TABLE \`customers\` ADD PRIMARY KEY (\`customerId\`)`);
        await queryRunner.query(`ALTER TABLE \`customers\` CHANGE \`customerLastName\` \`customerLastName\` varchar(50) NULL`);
        await queryRunner.query(`ALTER TABLE \`customers\` ADD UNIQUE INDEX \`IDX_0c402e0b777a8beeca160f2335\` (\`customerEmail\`)`);
        await queryRunner.query(`ALTER TABLE \`customers\` CHANGE \`customerPhone1\` \`customerPhone1\` varchar(20) NULL`);
        await queryRunner.query(`ALTER TABLE \`customers\` CHANGE \`customerPhone2\` \`customerPhone2\` varchar(20) NULL`);
        await queryRunner.query(`ALTER TABLE \`customers\` CHANGE \`customerFacebook\` \`customerFacebook\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`customers\` CHANGE \`customerInstagram\` \`customerInstagram\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`customers\` CHANGE \`customerTikTok\` \`customerTikTok\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`customers\` CHANGE \`customerLine\` \`customerLine\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`customers\` CHANGE \`customerX\` \`customerX\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`customers\` CHANGE \`customerAddress\` \`customerAddress\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`user_sessions\` CHANGE \`id\` \`id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`user_sessions\` ADD PRIMARY KEY (\`id\`)`);
        await queryRunner.query(`ALTER TABLE \`user_sessions\` CHANGE \`id\` \`id\` int NOT NULL AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`user_sessions\` ADD UNIQUE INDEX \`IDX_56ca06637d897e5d0b970ef525\` (\`refreshToken\`)`);
        await queryRunner.query(`ALTER TABLE \`user_sessions\` CHANGE \`ipAddress\` \`ipAddress\` varchar(45) NULL`);
        await queryRunner.query(`ALTER TABLE \`user_sessions\` CHANGE \`userAgent\` \`userAgent\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`user_sessions\` CHANGE \`revokedAt\` \`revokedAt\` timestamp NULL`);
        await queryRunner.query(`ALTER TABLE \`user_sessions\` CHANGE \`expiresAt\` \`expiresAt\` timestamp NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_customer_email\` ON \`customers\` (\`customerEmail\`)`);
        await queryRunner.query(`ALTER TABLE \`user_sessions\` ADD CONSTRAINT \`FK_55fa4db8406ed66bc7044328427\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`userId\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_sessions\` DROP FOREIGN KEY \`FK_55fa4db8406ed66bc7044328427\``);
        await queryRunner.query(`DROP INDEX \`IDX_customer_email\` ON \`customers\``);
        await queryRunner.query(`ALTER TABLE \`user_sessions\` CHANGE \`expiresAt\` \`expiresAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP()`);
        await queryRunner.query(`ALTER TABLE \`user_sessions\` CHANGE \`revokedAt\` \`revokedAt\` timestamp NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`user_sessions\` CHANGE \`userAgent\` \`userAgent\` text NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`user_sessions\` CHANGE \`ipAddress\` \`ipAddress\` varchar(45) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`user_sessions\` DROP INDEX \`IDX_56ca06637d897e5d0b970ef525\``);
        await queryRunner.query(`ALTER TABLE \`user_sessions\` CHANGE \`id\` \`id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`user_sessions\` DROP PRIMARY KEY`);
        await queryRunner.query(`ALTER TABLE \`user_sessions\` CHANGE \`id\` \`id\` int NOT NULL AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`customers\` CHANGE \`customerAddress\` \`customerAddress\` varchar(255) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`customers\` CHANGE \`customerX\` \`customerX\` varchar(100) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`customers\` CHANGE \`customerLine\` \`customerLine\` varchar(100) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`customers\` CHANGE \`customerTikTok\` \`customerTikTok\` varchar(100) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`customers\` CHANGE \`customerInstagram\` \`customerInstagram\` varchar(100) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`customers\` CHANGE \`customerFacebook\` \`customerFacebook\` varchar(100) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`customers\` CHANGE \`customerPhone2\` \`customerPhone2\` varchar(20) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`customers\` CHANGE \`customerPhone1\` \`customerPhone1\` varchar(20) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`customers\` DROP INDEX \`IDX_0c402e0b777a8beeca160f2335\``);
        await queryRunner.query(`ALTER TABLE \`customers\` CHANGE \`customerLastName\` \`customerLastName\` varchar(50) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`customers\` DROP PRIMARY KEY`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`lastLogin\` \`lastLogin\` datetime NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`lockedUntil\` \`lockedUntil\` datetime NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`lastLoginAttempt\` \`lastLoginAttempt\` datetime NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`role\` \`role\` varchar(50) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`resetTokenExpires\` \`resetTokenExpires\` datetime NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`resetToken\` \`resetToken\` varchar(255) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`userPhone2\` \`userPhone2\` varchar(20) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`userPhone1\` \`userPhone1\` varchar(20) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`users\` DROP INDEX \`IDX_9047b2d58f91586f14f0cf44a4\``);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`userId\` \`userId\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` DROP PRIMARY KEY`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`userId\` \`userId\` int NOT NULL AUTO_INCREMENT`);
    }

}

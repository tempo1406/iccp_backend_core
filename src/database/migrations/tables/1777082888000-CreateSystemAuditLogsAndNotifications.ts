/*
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSystemAuditLogsAndNotifications1777082888000
  implements MigrationInterface
{
  name = 'CreateSystemAuditLogsAndNotifications1777082888000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure system schema exists
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "system"`);

    // notifications
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "system"."notifications" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL,
        "title" VARCHAR(255) NOT NULL,
        "message" TEXT NOT NULL,
        "type" VARCHAR(255) NOT NULL DEFAULT 'info',
        "is_read" BOOLEAN NOT NULL DEFAULT false,
        "data" JSONB NULL,
        "campaign_id" UUID NULL,
        "content" TEXT NULL,
        "sender_id" UUID NULL,
        "sender_name" VARCHAR(255) NULL,
        "sender_avatar_url" TEXT NULL,
        "idempotency_key" VARCHAR(255) NULL UNIQUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL
      )
    `);

    // audit_logs
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "system"."audit_logs" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id" UUID NULL,
        "user_id" UUID NULL,
        "action" VARCHAR(100) NOT NULL,
        "entity_type" VARCHAR(100) NULL,
        "entity_id" UUID NULL,
        "old_values" JSONB NULL,
        "new_values" JSONB NULL,
        "ip_address" VARCHAR(45) NULL,
        "user_agent" TEXT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Indexes for notifications
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_notifications_user_id"
      ON "system"."notifications"("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_notifications_campaign_id"
      ON "system"."notifications"("campaign_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_notifications_created_at"
      ON "system"."notifications"("created_at")
    `);

    // Indexes for audit_logs
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_system_audit_logs_org"
      ON "system"."audit_logs"("organization_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_system_audit_logs_user"
      ON "system"."audit_logs"("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_system_audit_logs_entity_type"
      ON "system"."audit_logs"("entity_type")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_system_audit_logs_action"
      ON "system"."audit_logs"("action")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_system_audit_logs_created_at"
      ON "system"."audit_logs"("created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "system"."audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "system"."notifications"`);
  }
}

*/
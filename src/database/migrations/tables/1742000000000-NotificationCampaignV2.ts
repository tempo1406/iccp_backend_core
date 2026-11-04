// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: NotificationCampaignV21742000000000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class NotificationCampaignV21742000000000 implements MigrationInterface {
// // // // // //   name = 'NotificationCampaignV21742000000000';
// // // // // // 
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE SCHEMA IF NOT EXISTS system;
// // // // // //     `);
// // // // // // 
// // // // // //     // 1. Create enums (idempotent)
// // // // // //     await queryRunner.query(`
// // // // // //       DO $$ BEGIN
// // // // // //         CREATE TYPE system.campaign_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
// // // // // //       EXCEPTION WHEN duplicate_object THEN NULL;
// // // // // //       END $$;
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       DO $$ BEGIN
// // // // // //         CREATE TYPE system.target_type AS ENUM ('SPECIFIC_USERS', 'ORG_ALL', 'ORG_ROLE');
// // // // // //       EXCEPTION WHEN duplicate_object THEN NULL;
// // // // // //       END $$;
// // // // // //     `);
// // // // // // 
// // // // // //     // 2. Create notification_campaigns table
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE IF NOT EXISTS system.notification_campaigns (
// // // // // //         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
// // // // // //         sender_id UUID NOT NULL,
// // // // // //         title VARCHAR(255) NOT NULL,
// // // // // //         message TEXT NOT NULL,
// // // // // //         content TEXT NOT NULL,
// // // // // //         type VARCHAR(50) NOT NULL DEFAULT 'info',
// // // // // //         target_type system.target_type NOT NULL,
// // // // // //         target_org_id UUID,
// // // // // //         target_role_ids UUID[],
// // // // // //         target_user_ids UUID[],
// // // // // //         send_email BOOLEAN NOT NULL DEFAULT false,
// // // // // //         status system.campaign_status NOT NULL DEFAULT 'PENDING',
// // // // // //         total_recipients INT NOT NULL DEFAULT 0,
// // // // // //         sent_count INT NOT NULL DEFAULT 0,
// // // // // //         failed_count INT NOT NULL DEFAULT 0,
// // // // // //         created_at TIMESTAMP NOT NULL DEFAULT now(),
// // // // // //         updated_at TIMESTAMP NOT NULL DEFAULT now(),
// // // // // //         deleted_at TIMESTAMP
// // // // // //       );
// // // // // //     `);
// // // // // // 
// // // // // //     // 3. Indexes on notification_campaigns
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS idx_notification_campaigns_sender_id
// // // // // //         ON system.notification_campaigns(sender_id);
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS idx_notification_campaigns_status
// // // // // //         ON system.notification_campaigns(status);
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS idx_notification_campaigns_target_org_id
// // // // // //         ON system.notification_campaigns(target_org_id);
// // // // // //     `);
// // // // // // 
// // // // // //     // 4. Ensure notifications table exists before alter
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE IF NOT EXISTS system.notifications (
// // // // // //         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
// // // // // //         user_id UUID NOT NULL,
// // // // // //         title VARCHAR(255) NOT NULL,
// // // // // //         message TEXT NOT NULL,
// // // // // //         type VARCHAR(50) NOT NULL DEFAULT 'info',
// // // // // //         is_read BOOLEAN NOT NULL DEFAULT false,
// // // // // //         data JSONB,
// // // // // //         created_at TIMESTAMP NOT NULL DEFAULT now(),
// // // // // //         deleted_at TIMESTAMP
// // // // // //       );
// // // // // //     `);
// // // // // // 
// // // // // //     // 5. Add V2 columns to notifications table
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE system.notifications
// // // // // //         ADD COLUMN IF NOT EXISTS campaign_id UUID,
// // // // // //         ADD COLUMN IF NOT EXISTS content TEXT,
// // // // // //         ADD COLUMN IF NOT EXISTS sender_id UUID,
// // // // // //         ADD COLUMN IF NOT EXISTS sender_name VARCHAR(255),
// // // // // //         ADD COLUMN IF NOT EXISTS sender_avatar_url TEXT;
// // // // // //     `);
// // // // // // 
// // // // // //     // 6. Index on notifications.campaign_id
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS idx_notifications_campaign_id
// // // // // //         ON system.notifications(campaign_id);
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     // Remove indexes
// // // // // //     await queryRunner.query(
// // // // // //       `DROP INDEX IF EXISTS system.idx_notifications_campaign_id;`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `DROP INDEX IF EXISTS system.idx_notification_campaigns_sender_id;`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `DROP INDEX IF EXISTS system.idx_notification_campaigns_status;`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `DROP INDEX IF EXISTS system.idx_notification_campaigns_target_org_id;`,
// // // // // //     );
// // // // // // 
// // // // // //     // Drop columns from notifications
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE system.notifications
// // // // // //         DROP COLUMN IF EXISTS campaign_id,
// // // // // //         DROP COLUMN IF EXISTS content,
// // // // // //         DROP COLUMN IF EXISTS sender_id,
// // // // // //         DROP COLUMN IF EXISTS sender_name,
// // // // // //         DROP COLUMN IF EXISTS sender_avatar_url;
// // // // // //     `);
// // // // // // 
// // // // // //     // Drop notification_campaigns table
// // // // // //     await queryRunner.query(
// // // // // //       `DROP TABLE IF EXISTS system.notification_campaigns;`,
// // // // // //     );
// // // // // // 
// // // // // //     // Drop enums
// // // // // //     await queryRunner.query(`DROP TYPE IF EXISTS system.campaign_status;`);
// // // // // //     await queryRunner.query(`DROP TYPE IF EXISTS system.target_type;`);
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 
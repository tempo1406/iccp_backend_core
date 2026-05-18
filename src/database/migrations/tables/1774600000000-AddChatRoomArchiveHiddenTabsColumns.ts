/*
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChatRoomArchiveHiddenTabsColumns1774600000000
  implements MigrationInterface
{
  name = 'AddChatRoomArchiveHiddenTabsColumns1774600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat"."rooms"
      ADD COLUMN IF NOT EXISTS "archived_by_user_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."room_members"
      ADD COLUMN IF NOT EXISTS "hidden_reason" character varying(50)
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."room_members"
      ADD COLUMN IF NOT EXISTS "hidden_at" TIMESTAMP
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_room_members_org_user_hidden_active"
      ON "chat"."room_members" ("organization_id", "user_id", "is_hidden", "is_active")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat"."room_tabs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "room_id" uuid NOT NULL,
        "tabs" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "updated_by" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_chat_room_tabs_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_room_tabs_org_room"
      ON "chat"."room_tabs" ("organization_id", "room_id")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'UQ_chat_room_tabs_org_room'
        ) THEN
          ALTER TABLE "chat"."room_tabs"
          ADD CONSTRAINT "UQ_chat_room_tabs_org_room"
          UNIQUE ("organization_id", "room_id");
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_chat_rooms_archived_by_user'
        ) THEN
          ALTER TABLE "chat"."rooms"
          ADD CONSTRAINT "FK_chat_rooms_archived_by_user"
          FOREIGN KEY ("archived_by_user_id")
          REFERENCES "auth"."users"("id")
          ON DELETE SET NULL
          ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_chat_room_tabs_organization'
        ) THEN
          ALTER TABLE "chat"."room_tabs"
          ADD CONSTRAINT "FK_chat_room_tabs_organization"
          FOREIGN KEY ("organization_id")
          REFERENCES "tenant"."organizations"("id")
          ON DELETE NO ACTION
          ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_chat_room_tabs_room'
        ) THEN
          ALTER TABLE "chat"."room_tabs"
          ADD CONSTRAINT "FK_chat_room_tabs_room"
          FOREIGN KEY ("room_id")
          REFERENCES "chat"."rooms"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_chat_room_tabs_updated_by_user'
        ) THEN
          ALTER TABLE "chat"."room_tabs"
          ADD CONSTRAINT "FK_chat_room_tabs_updated_by_user"
          FOREIGN KEY ("updated_by")
          REFERENCES "auth"."users"("id")
          ON DELETE NO ACTION
          ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat"."room_tabs"
      DROP CONSTRAINT IF EXISTS "FK_chat_room_tabs_updated_by_user"
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."room_tabs"
      DROP CONSTRAINT IF EXISTS "FK_chat_room_tabs_room"
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."room_tabs"
      DROP CONSTRAINT IF EXISTS "FK_chat_room_tabs_organization"
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."room_tabs"
      DROP CONSTRAINT IF EXISTS "UQ_chat_room_tabs_org_room"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "chat"."IDX_chat_room_tabs_org_room"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "chat"."room_tabs"
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."rooms"
      DROP CONSTRAINT IF EXISTS "FK_chat_rooms_archived_by_user"
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."room_members"
      DROP COLUMN IF EXISTS "hidden_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."room_members"
      DROP COLUMN IF EXISTS "hidden_reason"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "chat"."IDX_chat_room_members_org_user_hidden_active"
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."rooms"
      DROP COLUMN IF EXISTS "archived_by_user_id"
    `);
  }
}

*/
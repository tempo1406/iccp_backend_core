// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: CreateChatBoxCoreTables1773110400000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class CreateChatBoxCoreTables1773110400000 implements MigrationInterface {
// // // // // //   name = 'CreateChatBoxCoreTables1773110400000';
// // // // // // 
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
// // // // // //     await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "chat"`);
// // // // // // 
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE TYPE "chat"."chat_room_type_enum" AS ENUM('channel', 'dm', 'group_dm')`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE TYPE "chat"."chat_room_visibility_enum" AS ENUM('public', 'private')`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE TYPE "chat"."chat_context_scope_enum" AS ENUM('organization', 'project', 'department')`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE TYPE "chat"."chat_member_role_enum" AS ENUM('owner', 'admin', 'member', 'guest')`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE TYPE "chat"."chat_join_source_enum" AS ENUM('manual', 'invite', 'auto', 'import')`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE TYPE "chat"."chat_notify_level_enum" AS ENUM('all', 'mentions', 'mute')`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE TYPE "chat"."chat_room_invitation_status_enum" AS ENUM('pending', 'accepted', 'expired', 'cancelled', 'revoked')`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE TYPE "chat"."chat_message_type_enum" AS ENUM('text', 'system', 'file', 'image', 'event')`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE TYPE "chat"."chat_attachment_type_enum" AS ENUM('file', 'image', 'video', 'audio')`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE TYPE "chat"."chat_mention_type_enum" AS ENUM('user', 'channel', 'here')`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE TYPE "chat"."chat_presence_status_enum" AS ENUM('online', 'away', 'dnd', 'offline')`,
// // // // // //     );
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE "chat"."rooms" (
// // // // // //         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
// // // // // //         "organization_id" uuid NOT NULL,
// // // // // //         "room_type" "chat"."chat_room_type_enum" NOT NULL DEFAULT 'channel',
// // // // // //         "visibility" "chat"."chat_room_visibility_enum" NOT NULL DEFAULT 'public',
// // // // // //         "name" character varying(255),
// // // // // //         "room_key" character varying(255),
// // // // // //         "topic" text,
// // // // // //         "description" text,
// // // // // //         "context_scope" "chat"."chat_context_scope_enum" NOT NULL DEFAULT 'organization',
// // // // // //         "context_id" uuid,
// // // // // //         "created_by" uuid NOT NULL,
// // // // // //         "owner_id" uuid,
// // // // // //         "last_message_id" uuid,
// // // // // //         "last_message_at" TIMESTAMP,
// // // // // //         "is_archived" boolean NOT NULL DEFAULT false,
// // // // // //         "archived_at" TIMESTAMP,
// // // // // //         "created_at" TIMESTAMP NOT NULL DEFAULT now(),
// // // // // //         "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
// // // // // //         CONSTRAINT "PK_chat_rooms_id" PRIMARY KEY ("id"),
// // // // // //         CONSTRAINT "UQ_chat_rooms_organization_room_key" UNIQUE ("organization_id", "room_key")
// // // // // //       )
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE "chat"."messages" (
// // // // // //         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
// // // // // //         "organization_id" uuid NOT NULL,
// // // // // //         "room_id" uuid NOT NULL,
// // // // // //         "sender_id" uuid,
// // // // // //         "message_type" "chat"."chat_message_type_enum" NOT NULL DEFAULT 'text',
// // // // // //         "content" text,
// // // // // //         "rich_content" jsonb,
// // // // // //         "thread_root_message_id" uuid,
// // // // // //         "parent_message_id" uuid,
// // // // // //         "client_message_id" character varying(100),
// // // // // //         "reply_count" integer NOT NULL DEFAULT 0,
// // // // // //         "reaction_count" integer NOT NULL DEFAULT 0,
// // // // // //         "is_edited" boolean NOT NULL DEFAULT false,
// // // // // //         "edited_at" TIMESTAMP,
// // // // // //         "is_deleted" boolean NOT NULL DEFAULT false,
// // // // // //         "deleted_at" TIMESTAMP,
// // // // // //         "metadata" jsonb,
// // // // // //         "sent_at" TIMESTAMP NOT NULL DEFAULT now(),
// // // // // //         "created_at" TIMESTAMP NOT NULL DEFAULT now(),
// // // // // //         "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
// // // // // //         CONSTRAINT "PK_chat_messages_id" PRIMARY KEY ("id"),
// // // // // //         CONSTRAINT "UQ_chat_messages_room_sender_client_message" UNIQUE ("room_id", "sender_id", "client_message_id")
// // // // // //       )
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE "chat"."room_members" (
// // // // // //         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
// // // // // //         "organization_id" uuid NOT NULL,
// // // // // //         "room_id" uuid NOT NULL,
// // // // // //         "user_id" uuid NOT NULL,
// // // // // //         "member_role" "chat"."chat_member_role_enum" NOT NULL DEFAULT 'member',
// // // // // //         "join_source" "chat"."chat_join_source_enum" NOT NULL DEFAULT 'manual',
// // // // // //         "is_active" boolean NOT NULL DEFAULT true,
// // // // // //         "joined_at" TIMESTAMP NOT NULL DEFAULT now(),
// // // // // //         "left_at" TIMESTAMP,
// // // // // //         "notify_level" "chat"."chat_notify_level_enum" NOT NULL DEFAULT 'all',
// // // // // //         "mute_until" TIMESTAMP,
// // // // // //         "is_hidden" boolean NOT NULL DEFAULT false,
// // // // // //         "created_at" TIMESTAMP NOT NULL DEFAULT now(),
// // // // // //         "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
// // // // // //         CONSTRAINT "PK_chat_room_members_id" PRIMARY KEY ("id"),
// // // // // //         CONSTRAINT "UQ_chat_room_members_room_user" UNIQUE ("room_id", "user_id")
// // // // // //       )
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE "chat"."room_invitations" (
// // // // // //         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
// // // // // //         "organization_id" uuid NOT NULL,
// // // // // //         "room_id" uuid NOT NULL,
// // // // // //         "email" character varying(255),
// // // // // //         "invited_user_id" uuid NOT NULL,
// // // // // //         "invited_by" uuid NOT NULL,
// // // // // //         "invite_message" text,
// // // // // //         "status" "chat"."chat_room_invitation_status_enum" NOT NULL DEFAULT 'pending',
// // // // // //         "accepted_at" TIMESTAMP,
// // // // // //         "cancelled_at" TIMESTAMP,
// // // // // //         "created_at" TIMESTAMP NOT NULL DEFAULT now(),
// // // // // //         "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
// // // // // //         CONSTRAINT "PK_chat_room_invitations_id" PRIMARY KEY ("id")
// // // // // //       )
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE "chat"."message_attachments" (
// // // // // //         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
// // // // // //         "organization_id" uuid NOT NULL,
// // // // // //         "message_id" uuid NOT NULL,
// // // // // //         "attachment_type" "chat"."chat_attachment_type_enum" NOT NULL,
// // // // // //         "file_name" character varying(255) NOT NULL,
// // // // // //         "file_url" text NOT NULL,
// // // // // //         "mime_type" character varying(150),
// // // // // //         "file_size" bigint,
// // // // // //         "checksum" character varying(128),
// // // // // //         "width" integer,
// // // // // //         "height" integer,
// // // // // //         "duration_ms" integer,
// // // // // //         "created_at" TIMESTAMP NOT NULL DEFAULT now(),
// // // // // //         CONSTRAINT "PK_chat_message_attachments_id" PRIMARY KEY ("id")
// // // // // //       )
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE "chat"."message_reactions" (
// // // // // //         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
// // // // // //         "organization_id" uuid NOT NULL,
// // // // // //         "message_id" uuid NOT NULL,
// // // // // //         "user_id" uuid NOT NULL,
// // // // // //         "emoji" character varying(32) NOT NULL,
// // // // // //         "created_at" TIMESTAMP NOT NULL DEFAULT now(),
// // // // // //         CONSTRAINT "PK_chat_message_reactions_id" PRIMARY KEY ("id"),
// // // // // //         CONSTRAINT "UQ_chat_message_reactions_message_user_emoji" UNIQUE ("message_id", "user_id", "emoji")
// // // // // //       )
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE "chat"."message_mentions" (
// // // // // //         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
// // // // // //         "organization_id" uuid NOT NULL,
// // // // // //         "message_id" uuid NOT NULL,
// // // // // //         "mentioned_user_id" uuid NOT NULL,
// // // // // //         "mention_type" "chat"."chat_mention_type_enum" NOT NULL DEFAULT 'user',
// // // // // //         "is_read" boolean NOT NULL DEFAULT false,
// // // // // //         "read_at" TIMESTAMP,
// // // // // //         "created_at" TIMESTAMP NOT NULL DEFAULT now(),
// // // // // //         CONSTRAINT "PK_chat_message_mentions_id" PRIMARY KEY ("id"),
// // // // // //         CONSTRAINT "UQ_chat_message_mentions_message_user_type" UNIQUE ("message_id", "mentioned_user_id", "mention_type")
// // // // // //       )
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE "chat"."message_pins" (
// // // // // //         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
// // // // // //         "organization_id" uuid NOT NULL,
// // // // // //         "room_id" uuid NOT NULL,
// // // // // //         "message_id" uuid NOT NULL,
// // // // // //         "pinned_by" uuid NOT NULL,
// // // // // //         "pinned_at" TIMESTAMP NOT NULL DEFAULT now(),
// // // // // //         "is_active" boolean NOT NULL DEFAULT true,
// // // // // //         "unpinned_at" TIMESTAMP,
// // // // // //         CONSTRAINT "PK_chat_message_pins_id" PRIMARY KEY ("id"),
// // // // // //         CONSTRAINT "UQ_chat_message_pins_room_message" UNIQUE ("room_id", "message_id")
// // // // // //       )
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE "chat"."read_states" (
// // // // // //         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
// // // // // //         "organization_id" uuid NOT NULL,
// // // // // //         "room_id" uuid NOT NULL,
// // // // // //         "user_id" uuid NOT NULL,
// // // // // //         "last_read_message_id" uuid,
// // // // // //         "last_read_at" TIMESTAMP,
// // // // // //         "unread_count_cache" integer NOT NULL DEFAULT 0,
// // // // // //         "created_at" TIMESTAMP NOT NULL DEFAULT now(),
// // // // // //         "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
// // // // // //         CONSTRAINT "PK_chat_read_states_id" PRIMARY KEY ("id"),
// // // // // //         CONSTRAINT "UQ_chat_read_states_room_user" UNIQUE ("room_id", "user_id")
// // // // // //       )
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE "chat"."user_presence" (
// // // // // //         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
// // // // // //         "organization_id" uuid NOT NULL,
// // // // // //         "user_id" uuid NOT NULL,
// // // // // //         "presence_status" "chat"."chat_presence_status_enum" NOT NULL DEFAULT 'offline',
// // // // // //         "custom_status" text,
// // // // // //         "custom_emoji" character varying(32),
// // // // // //         "last_seen_at" TIMESTAMP,
// // // // // //         "last_activity_at" TIMESTAMP,
// // // // // //         "source" character varying(50),
// // // // // //         "created_at" TIMESTAMP NOT NULL DEFAULT now(),
// // // // // //         "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
// // // // // //         CONSTRAINT "PK_chat_user_presence_id" PRIMARY KEY ("id"),
// // // // // //         CONSTRAINT "UQ_chat_user_presence_org_user" UNIQUE ("organization_id", "user_id")
// // // // // //       )
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE INDEX "IDX_chat_rooms_org_type_archived" ON "chat"."rooms" ("organization_id", "room_type", "is_archived")`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE INDEX "IDX_chat_rooms_org_context" ON "chat"."rooms" ("organization_id", "context_scope", "context_id")`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE INDEX "IDX_chat_rooms_org_last_message_at" ON "chat"."rooms" ("organization_id", "last_message_at")`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE INDEX "IDX_chat_messages_room_sent_at" ON "chat"."messages" ("room_id", "sent_at")`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE INDEX "IDX_chat_messages_thread_sent_at" ON "chat"."messages" ("thread_root_message_id", "sent_at")`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE INDEX "IDX_chat_messages_org_sent_at" ON "chat"."messages" ("organization_id", "sent_at")`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE INDEX "IDX_chat_room_members_org_user_active" ON "chat"."room_members" ("organization_id", "user_id", "is_active")`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE INDEX "IDX_chat_room_members_room_member_role" ON "chat"."room_members" ("room_id", "member_role")`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE INDEX "IDX_chat_room_invitations_room_status" ON "chat"."room_invitations" ("room_id", "status")`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE INDEX "IDX_chat_room_invitations_org_invited_status" ON "chat"."room_invitations" ("organization_id", "invited_user_id", "status")`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE INDEX "IDX_chat_message_attachments_message_id" ON "chat"."message_attachments" ("message_id")`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE INDEX "IDX_chat_message_attachments_org_type" ON "chat"."message_attachments" ("organization_id", "attachment_type")`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE INDEX "IDX_chat_message_reactions_message_id" ON "chat"."message_reactions" ("message_id")`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE INDEX "IDX_chat_message_reactions_user_created_at" ON "chat"."message_reactions" ("user_id", "created_at")`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE INDEX "IDX_chat_message_mentions_user_read_created" ON "chat"."message_mentions" ("mentioned_user_id", "is_read", "created_at")`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE INDEX "IDX_chat_message_mentions_org_user" ON "chat"."message_mentions" ("organization_id", "mentioned_user_id")`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE INDEX "IDX_chat_message_pins_room_active_pinned_at" ON "chat"."message_pins" ("room_id", "is_active", "pinned_at")`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE INDEX "IDX_chat_read_states_org_user" ON "chat"."read_states" ("organization_id", "user_id")`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE INDEX "IDX_chat_read_states_user_updated_at" ON "chat"."read_states" ("user_id", "updated_at")`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE INDEX "IDX_chat_user_presence_org_status" ON "chat"."user_presence" ("organization_id", "presence_status")`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `CREATE INDEX "IDX_chat_user_presence_last_activity_at" ON "chat"."user_presence" ("last_activity_at")`,
// // // // // //     );
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."rooms"
// // // // // //       ADD CONSTRAINT "FK_chat_rooms_organization" FOREIGN KEY ("organization_id") REFERENCES "tenant"."organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."rooms"
// // // // // //       ADD CONSTRAINT "FK_chat_rooms_created_by" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."rooms"
// // // // // //       ADD CONSTRAINT "FK_chat_rooms_owner" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."rooms"
// // // // // //       ADD CONSTRAINT "FK_chat_rooms_last_message" FOREIGN KEY ("last_message_id") REFERENCES "chat"."messages"("id") ON DELETE SET NULL ON UPDATE NO ACTION
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."messages"
// // // // // //       ADD CONSTRAINT "FK_chat_messages_organization" FOREIGN KEY ("organization_id") REFERENCES "tenant"."organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."messages"
// // // // // //       ADD CONSTRAINT "FK_chat_messages_room" FOREIGN KEY ("room_id") REFERENCES "chat"."rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."messages"
// // // // // //       ADD CONSTRAINT "FK_chat_messages_sender" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."messages"
// // // // // //       ADD CONSTRAINT "FK_chat_messages_thread_root" FOREIGN KEY ("thread_root_message_id") REFERENCES "chat"."messages"("id") ON DELETE SET NULL ON UPDATE NO ACTION
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."messages"
// // // // // //       ADD CONSTRAINT "FK_chat_messages_parent" FOREIGN KEY ("parent_message_id") REFERENCES "chat"."messages"("id") ON DELETE SET NULL ON UPDATE NO ACTION
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."room_members"
// // // // // //       ADD CONSTRAINT "FK_chat_room_members_organization" FOREIGN KEY ("organization_id") REFERENCES "tenant"."organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."room_members"
// // // // // //       ADD CONSTRAINT "FK_chat_room_members_room" FOREIGN KEY ("room_id") REFERENCES "chat"."rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."room_members"
// // // // // //       ADD CONSTRAINT "FK_chat_room_members_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."room_invitations"
// // // // // //       ADD CONSTRAINT "FK_chat_room_invitations_organization" FOREIGN KEY ("organization_id") REFERENCES "tenant"."organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."room_invitations"
// // // // // //       ADD CONSTRAINT "FK_chat_room_invitations_room" FOREIGN KEY ("room_id") REFERENCES "chat"."rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."room_invitations"
// // // // // //       ADD CONSTRAINT "FK_chat_room_invitations_invited_user" FOREIGN KEY ("invited_user_id") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."room_invitations"
// // // // // //       ADD CONSTRAINT "FK_chat_room_invitations_invited_by" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."message_attachments"
// // // // // //       ADD CONSTRAINT "FK_chat_message_attachments_organization" FOREIGN KEY ("organization_id") REFERENCES "tenant"."organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."message_attachments"
// // // // // //       ADD CONSTRAINT "FK_chat_message_attachments_message" FOREIGN KEY ("message_id") REFERENCES "chat"."messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."message_reactions"
// // // // // //       ADD CONSTRAINT "FK_chat_message_reactions_organization" FOREIGN KEY ("organization_id") REFERENCES "tenant"."organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."message_reactions"
// // // // // //       ADD CONSTRAINT "FK_chat_message_reactions_message" FOREIGN KEY ("message_id") REFERENCES "chat"."messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."message_reactions"
// // // // // //       ADD CONSTRAINT "FK_chat_message_reactions_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."message_mentions"
// // // // // //       ADD CONSTRAINT "FK_chat_message_mentions_organization" FOREIGN KEY ("organization_id") REFERENCES "tenant"."organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."message_mentions"
// // // // // //       ADD CONSTRAINT "FK_chat_message_mentions_message" FOREIGN KEY ("message_id") REFERENCES "chat"."messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."message_mentions"
// // // // // //       ADD CONSTRAINT "FK_chat_message_mentions_mentioned_user" FOREIGN KEY ("mentioned_user_id") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."message_pins"
// // // // // //       ADD CONSTRAINT "FK_chat_message_pins_organization" FOREIGN KEY ("organization_id") REFERENCES "tenant"."organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."message_pins"
// // // // // //       ADD CONSTRAINT "FK_chat_message_pins_room" FOREIGN KEY ("room_id") REFERENCES "chat"."rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."message_pins"
// // // // // //       ADD CONSTRAINT "FK_chat_message_pins_message" FOREIGN KEY ("message_id") REFERENCES "chat"."messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."message_pins"
// // // // // //       ADD CONSTRAINT "FK_chat_message_pins_pinned_by" FOREIGN KEY ("pinned_by") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."read_states"
// // // // // //       ADD CONSTRAINT "FK_chat_read_states_organization" FOREIGN KEY ("organization_id") REFERENCES "tenant"."organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."read_states"
// // // // // //       ADD CONSTRAINT "FK_chat_read_states_room" FOREIGN KEY ("room_id") REFERENCES "chat"."rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."read_states"
// // // // // //       ADD CONSTRAINT "FK_chat_read_states_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."read_states"
// // // // // //       ADD CONSTRAINT "FK_chat_read_states_last_read_message" FOREIGN KEY ("last_read_message_id") REFERENCES "chat"."messages"("id") ON DELETE SET NULL ON UPDATE NO ACTION
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."user_presence"
// // // // // //       ADD CONSTRAINT "FK_chat_user_presence_organization" FOREIGN KEY ("organization_id") REFERENCES "tenant"."organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."user_presence"
// // // // // //       ADD CONSTRAINT "FK_chat_user_presence_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."user_presence" DROP CONSTRAINT "FK_chat_user_presence_user"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."user_presence" DROP CONSTRAINT "FK_chat_user_presence_organization"`,
// // // // // //     );
// // // // // // 
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."read_states" DROP CONSTRAINT "FK_chat_read_states_last_read_message"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."read_states" DROP CONSTRAINT "FK_chat_read_states_user"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."read_states" DROP CONSTRAINT "FK_chat_read_states_room"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."read_states" DROP CONSTRAINT "FK_chat_read_states_organization"`,
// // // // // //     );
// // // // // // 
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."message_pins" DROP CONSTRAINT "FK_chat_message_pins_pinned_by"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."message_pins" DROP CONSTRAINT "FK_chat_message_pins_message"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."message_pins" DROP CONSTRAINT "FK_chat_message_pins_room"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."message_pins" DROP CONSTRAINT "FK_chat_message_pins_organization"`,
// // // // // //     );
// // // // // // 
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."message_mentions" DROP CONSTRAINT "FK_chat_message_mentions_mentioned_user"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."message_mentions" DROP CONSTRAINT "FK_chat_message_mentions_message"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."message_mentions" DROP CONSTRAINT "FK_chat_message_mentions_organization"`,
// // // // // //     );
// // // // // // 
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."message_reactions" DROP CONSTRAINT "FK_chat_message_reactions_user"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."message_reactions" DROP CONSTRAINT "FK_chat_message_reactions_message"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."message_reactions" DROP CONSTRAINT "FK_chat_message_reactions_organization"`,
// // // // // //     );
// // // // // // 
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."message_attachments" DROP CONSTRAINT "FK_chat_message_attachments_message"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."message_attachments" DROP CONSTRAINT "FK_chat_message_attachments_organization"`,
// // // // // //     );
// // // // // // 
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."room_invitations" DROP CONSTRAINT "FK_chat_room_invitations_invited_by"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."room_invitations" DROP CONSTRAINT "FK_chat_room_invitations_invited_user"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."room_invitations" DROP CONSTRAINT "FK_chat_room_invitations_room"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."room_invitations" DROP CONSTRAINT "FK_chat_room_invitations_organization"`,
// // // // // //     );
// // // // // // 
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."room_members" DROP CONSTRAINT "FK_chat_room_members_user"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."room_members" DROP CONSTRAINT "FK_chat_room_members_room"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."room_members" DROP CONSTRAINT "FK_chat_room_members_organization"`,
// // // // // //     );
// // // // // // 
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."messages" DROP CONSTRAINT "FK_chat_messages_parent"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."messages" DROP CONSTRAINT "FK_chat_messages_thread_root"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."messages" DROP CONSTRAINT "FK_chat_messages_sender"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."messages" DROP CONSTRAINT "FK_chat_messages_room"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."messages" DROP CONSTRAINT "FK_chat_messages_organization"`,
// // // // // //     );
// // // // // // 
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."rooms" DROP CONSTRAINT "FK_chat_rooms_last_message"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."rooms" DROP CONSTRAINT "FK_chat_rooms_owner"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."rooms" DROP CONSTRAINT "FK_chat_rooms_created_by"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `ALTER TABLE "chat"."rooms" DROP CONSTRAINT "FK_chat_rooms_organization"`,
// // // // // //     );
// // // // // // 
// // // // // //     await queryRunner.query(
// // // // // //       `DROP INDEX "chat"."IDX_chat_user_presence_last_activity_at"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `DROP INDEX "chat"."IDX_chat_user_presence_org_status"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `DROP INDEX "chat"."IDX_chat_read_states_user_updated_at"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `DROP INDEX "chat"."IDX_chat_read_states_org_user"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `DROP INDEX "chat"."IDX_chat_message_pins_room_active_pinned_at"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `DROP INDEX "chat"."IDX_chat_message_mentions_org_user"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `DROP INDEX "chat"."IDX_chat_message_mentions_user_read_created"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `DROP INDEX "chat"."IDX_chat_message_reactions_user_created_at"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `DROP INDEX "chat"."IDX_chat_message_reactions_message_id"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `DROP INDEX "chat"."IDX_chat_message_attachments_org_type"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `DROP INDEX "chat"."IDX_chat_message_attachments_message_id"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `DROP INDEX "chat"."IDX_chat_room_invitations_org_invited_status"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `DROP INDEX "chat"."IDX_chat_room_invitations_room_status"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `DROP INDEX "chat"."IDX_chat_room_members_room_member_role"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `DROP INDEX "chat"."IDX_chat_room_members_org_user_active"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `DROP INDEX "chat"."IDX_chat_messages_org_sent_at"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `DROP INDEX "chat"."IDX_chat_messages_thread_sent_at"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `DROP INDEX "chat"."IDX_chat_messages_room_sent_at"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `DROP INDEX "chat"."IDX_chat_rooms_org_last_message_at"`,
// // // // // //     );
// // // // // //     await queryRunner.query(`DROP INDEX "chat"."IDX_chat_rooms_org_context"`);
// // // // // //     await queryRunner.query(
// // // // // //       `DROP INDEX "chat"."IDX_chat_rooms_org_type_archived"`,
// // // // // //     );
// // // // // // 
// // // // // //     await queryRunner.query(`DROP TABLE "chat"."user_presence"`);
// // // // // //     await queryRunner.query(`DROP TABLE "chat"."read_states"`);
// // // // // //     await queryRunner.query(`DROP TABLE "chat"."message_pins"`);
// // // // // //     await queryRunner.query(`DROP TABLE "chat"."message_mentions"`);
// // // // // //     await queryRunner.query(`DROP TABLE "chat"."message_reactions"`);
// // // // // //     await queryRunner.query(`DROP TABLE "chat"."message_attachments"`);
// // // // // //     await queryRunner.query(`DROP TABLE "chat"."room_invitations"`);
// // // // // //     await queryRunner.query(`DROP TABLE "chat"."room_members"`);
// // // // // //     await queryRunner.query(`DROP TABLE "chat"."messages"`);
// // // // // //     await queryRunner.query(`DROP TABLE "chat"."rooms"`);
// // // // // // 
// // // // // //     await queryRunner.query(`DROP TYPE "chat"."chat_presence_status_enum"`);
// // // // // //     await queryRunner.query(`DROP TYPE "chat"."chat_mention_type_enum"`);
// // // // // //     await queryRunner.query(`DROP TYPE "chat"."chat_attachment_type_enum"`);
// // // // // //     await queryRunner.query(`DROP TYPE "chat"."chat_message_type_enum"`);
// // // // // //     await queryRunner.query(
// // // // // //       `DROP TYPE "chat"."chat_room_invitation_status_enum"`,
// // // // // //     );
// // // // // //     await queryRunner.query(`DROP TYPE "chat"."chat_notify_level_enum"`);
// // // // // //     await queryRunner.query(`DROP TYPE "chat"."chat_join_source_enum"`);
// // // // // //     await queryRunner.query(`DROP TYPE "chat"."chat_member_role_enum"`);
// // // // // //     await queryRunner.query(`DROP TYPE "chat"."chat_context_scope_enum"`);
// // // // // //     await queryRunner.query(`DROP TYPE "chat"."chat_room_visibility_enum"`);
// // // // // //     await queryRunner.query(`DROP TYPE "chat"."chat_room_type_enum"`);
// // // // // // 
// // // // // //     await queryRunner.query(`DROP SCHEMA IF EXISTS "chat" CASCADE`);
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 
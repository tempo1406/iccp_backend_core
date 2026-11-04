// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: CreateCoreAuthTenantTables1740045673000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class CreateCoreAuthTenantTables1740045673000 implements MigrationInterface {
// // // // // //   name = 'CreateCoreAuthTenantTables1740045673000';
// // // // // // 
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE IF NOT EXISTS "auth"."users" (
// // // // // //         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
// // // // // //         "email" character varying(255) NOT NULL,
// // // // // //         "password_hash" character varying(255) NOT NULL,
// // // // // //         "first_name" character varying(255),
// // // // // //         "last_name" character varying(255),
// // // // // //         "avatar_url" text,
// // // // // //         "phone" character varying(20),
// // // // // //         "date_of_birth" TIMESTAMP,
// // // // // //         "address" character varying(255),
// // // // // //         "provider" character varying(50) NOT NULL DEFAULT 'local',
// // // // // //         "is_active" boolean NOT NULL DEFAULT true,
// // // // // //         "is_verified" boolean NOT NULL DEFAULT false,
// // // // // //         "email_verified_at" TIMESTAMP,
// // // // // //         "last_login_at" TIMESTAMP,
// // // // // //         "created_at" TIMESTAMP NOT NULL DEFAULT now(),
// // // // // //         "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
// // // // // //         "deleted_at" TIMESTAMP,
// // // // // //         CONSTRAINT "PK_user_id" PRIMARY KEY ("id"),
// // // // // //         CONSTRAINT "UQ_auth_users_email" UNIQUE ("email")
// // // // // //       )
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE IF NOT EXISTS "tenant"."organizations" (
// // // // // //         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
// // // // // //         "name" character varying(255) NOT NULL,
// // // // // //         "slug" character varying(100) NOT NULL,
// // // // // //         "description" text,
// // // // // //         "logo_url" text,
// // // // // //         "industry" character varying(100),
// // // // // //         "size" character varying(50),
// // // // // //         "owner_id" uuid NOT NULL,
// // // // // //         "subscription_plan_id" uuid,
// // // // // //         "is_active" boolean NOT NULL DEFAULT true,
// // // // // //         "settings" jsonb,
// // // // // //         "created_at" TIMESTAMP NOT NULL DEFAULT now(),
// // // // // //         "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
// // // // // //         CONSTRAINT "PK_tenant_organizations_id" PRIMARY KEY ("id"),
// // // // // //         CONSTRAINT "UQ_tenant_organizations_slug" UNIQUE ("slug")
// // // // // //       )
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS "IDX_auth_users_is_active"
// // // // // //       ON "auth"."users" ("is_active")
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS "IDX_tenant_organizations_owner_id"
// // // // // //       ON "tenant"."organizations" ("owner_id")
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS "IDX_tenant_organizations_is_active"
// // // // // //       ON "tenant"."organizations" ("is_active")
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       DO $$
// // // // // //       BEGIN
// // // // // //         IF NOT EXISTS (
// // // // // //           SELECT 1
// // // // // //           FROM pg_constraint
// // // // // //           WHERE conname = 'FK_tenant_organizations_owner'
// // // // // //         ) THEN
// // // // // //           ALTER TABLE "tenant"."organizations"
// // // // // //           ADD CONSTRAINT "FK_tenant_organizations_owner"
// // // // // //           FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id")
// // // // // //           ON DELETE NO ACTION ON UPDATE NO ACTION;
// // // // // //         END IF;
// // // // // //       END
// // // // // //       $$;
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."organizations"
// // // // // //       DROP CONSTRAINT IF EXISTS "FK_tenant_organizations_owner"
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(
// // // // // //       `DROP INDEX IF EXISTS "tenant"."IDX_tenant_organizations_is_active"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `DROP INDEX IF EXISTS "tenant"."IDX_tenant_organizations_owner_id"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `DROP INDEX IF EXISTS "auth"."IDX_auth_users_is_active"`,
// // // // // //     );
// // // // // // 
// // // // // //     await queryRunner.query(`DROP TABLE IF EXISTS "tenant"."organizations"`);
// // // // // //     await queryRunner.query(`DROP TABLE IF EXISTS "auth"."users"`);
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 
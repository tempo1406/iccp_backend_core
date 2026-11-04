/*
import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropUniqueOrganizationMemberOrgUser1775600000000
  implements MigrationInterface
{
  name = 'DropUniqueOrganizationMemberOrgUser1775600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        constraint_name text;
      BEGIN
        FOR constraint_name IN
          SELECT tc.constraint_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_schema = kcu.constraint_schema
           AND tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
           AND tc.table_name = kcu.table_name
          WHERE tc.table_schema = 'tenant'
            AND tc.table_name = 'organization_members'
            AND tc.constraint_type = 'UNIQUE'
          GROUP BY tc.constraint_name
          HAVING array_agg(kcu.column_name::text ORDER BY kcu.ordinal_position) = ARRAY['organization_id', 'user_id']::text[]
        LOOP
          EXECUTE format(
            'ALTER TABLE "tenant"."organization_members" DROP CONSTRAINT IF EXISTS %I',
            constraint_name
          );
        END LOOP;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint con
          JOIN pg_class rel ON rel.oid = con.conrelid
          JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
          WHERE nsp.nspname = 'tenant'
            AND rel.relname = 'organization_members'
            AND con.conname = 'UQ_tenant_organization_members_org_user'
        ) THEN
          ALTER TABLE "tenant"."organization_members"
          ADD CONSTRAINT "UQ_tenant_organization_members_org_user"
          UNIQUE ("organization_id", "user_id");
        END IF;
      END
      $$;
    `);
  }
}

*/
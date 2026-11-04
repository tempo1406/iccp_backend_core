/*
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateKpiTargetSnapshotsTable1777083406000
  implements MigrationInterface
{
  name = 'CreateKpiTargetSnapshotsTable1777083406000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant"."kpi_target_snapshots" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "target_id" UUID NOT NULL,
        "actual_score" DECIMAL(5, 2) NULL,
        "actual_on_time_rate" DECIMAL(5, 2) NULL,
        "actual_point_completion_rate" DECIMAL(5, 2) NULL,
        "actual_ot_hours" DECIMAL(6, 2) NULL,
        "actual_completed_tasks" INT NULL,
        "actual_overdue_tasks" INT NULL,
        "actual_payload" JSONB NULL,
        "archived_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_kpi_target_snapshots_target_id"
      ON "tenant"."kpi_target_snapshots"("target_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant"."kpi_target_snapshots"`);
  }
}

*/
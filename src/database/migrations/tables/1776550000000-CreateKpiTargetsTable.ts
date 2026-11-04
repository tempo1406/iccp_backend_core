// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: CreateKpiTargetsTable1776550000000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class CreateKpiTargetsTable1776550000000 implements MigrationInterface {
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE IF NOT EXISTS tenant.kpi_targets (
// // // // // //         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
// // // // // //         organization_id UUID NOT NULL,
// // // // // //         project_id UUID NULL,
// // // // // //         scope_type VARCHAR(20) NOT NULL DEFAULT 'user',
// // // // // //         user_id UUID NULL,
// // // // // //         role_id UUID NULL,
// // // // // //         period VARCHAR(20) NOT NULL DEFAULT 'monthly',
// // // // // //         period_start DATE NOT NULL,
// // // // // //         period_end DATE NOT NULL,
// // // // // //         target_score DECIMAL(5,2) NULL,
// // // // // //         target_point_completion_rate DECIMAL(5,2) NULL,
// // // // // //         target_on_time_rate DECIMAL(5,2) NULL,
// // // // // //         target_ot_hours DECIMAL(6,2) NULL,
// // // // // //         target_completed_tasks INT NULL,
// // // // // //         max_overdue_tasks INT NULL,
// // // // // //         require_zero_overdue BOOLEAN NOT NULL DEFAULT false,
// // // // // //         status VARCHAR(20) NOT NULL DEFAULT 'active',
// // // // // //         note TEXT NULL,
// // // // // //         assigned_by UUID NULL,
// // // // // //         created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
// // // // // //         updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
// // // // // //         deleted_at TIMESTAMPTZ NULL,
// // // // // //         deleted_by UUID NULL
// // // // // //       )
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS idx_kpi_targets_org_scope
// // // // // //       ON tenant.kpi_targets(organization_id, scope_type)
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS idx_kpi_targets_org_user
// // // // // //       ON tenant.kpi_targets(organization_id, user_id)
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS idx_kpi_targets_org_role
// // // // // //       ON tenant.kpi_targets(organization_id, role_id)
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS idx_kpi_targets_project
// // // // // //       ON tenant.kpi_targets(project_id)
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS idx_kpi_targets_period
// // // // // //       ON tenant.kpi_targets(period_start, period_end)
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`DROP TABLE IF EXISTS tenant.kpi_targets`);
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 
/*
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReportRunsAndDeliveryAttemptsTables1776570000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tenant.report_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        report_type VARCHAR(50) NOT NULL DEFAULT 'periodic',
        frequency VARCHAR(20) NOT NULL DEFAULT 'quarterly',
        period_key VARCHAR(20) NOT NULL,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        scheduled_for TIMESTAMPTZ NOT NULL,
        attempt_count INT NOT NULL DEFAULT 0,
        success_count INT NOT NULL DEFAULT 0,
        failed_count INT NOT NULL DEFAULT 0,
        next_retry_at TIMESTAMPTZ NULL,
        last_attempt_at TIMESTAMPTZ NULL,
        summary_snapshot JSONB NULL,
        artifact_snapshot JSONB NULL,
        resolved_recipient_snapshot JSONB NULL,
        successful_recipient_snapshot JSONB NULL,
        pending_recipient_snapshot JSONB NULL,
        last_error TEXT NULL,
        sent_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_report_runs_type_status_schedule
      ON tenant.report_runs(report_type, status, scheduled_for)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_report_runs_type_next_retry
      ON tenant.report_runs(report_type, next_retry_at)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_report_runs_org_type_freq_period
      ON tenant.report_runs(organization_id, report_type, frequency, period_key)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tenant.report_delivery_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        report_run_id UUID NOT NULL,
        attempt_no INT NOT NULL,
        trigger_source VARCHAR(20) NOT NULL,
        status VARCHAR(30) NOT NULL,
        recipient_snapshot JSONB NULL,
        successful_recipient_snapshot JSONB NULL,
        failed_recipient_snapshot JSONB NULL,
        success_count INT NOT NULL DEFAULT 0,
        failed_count INT NOT NULL DEFAULT 0,
        error_summary TEXT NULL,
        started_at TIMESTAMPTZ NOT NULL,
        finished_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_report_delivery_attempts_run
      ON tenant.report_delivery_attempts(report_run_id, attempt_no)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS tenant.report_delivery_attempts
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS tenant.report_runs
    `);
  }
}

*/
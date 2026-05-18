// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: AddPermissionToAccessRules1765000000000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class AddPermissionToAccessRules1765000000000 implements MigrationInterface {
// // // // // //   name = 'AddPermissionToAccessRules1765000000000';
// // // // // // 
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     // Thêm cột permission vào document_access_rules
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE knowledge.document_access_rules
// // // // // //         ADD COLUMN IF NOT EXISTS permission VARCHAR(50) NOT NULL DEFAULT 'view'
// // // // // //     `);
// // // // // // 
// // // // // //     // Thêm cột permission vào folder_access_rules
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE knowledge.folder_access_rules
// // // // // //         ADD COLUMN IF NOT EXISTS permission VARCHAR(50) NOT NULL DEFAULT 'view'
// // // // // //     `);
// // // // // // 
// // // // // //     // Thêm comment để tài liệu hoá enum value
// // // // // //     await queryRunner.query(`
// // // // // //       COMMENT ON COLUMN knowledge.document_access_rules.permission IS 'view | download | upload | edit | manage'
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       COMMENT ON COLUMN knowledge.folder_access_rules.permission IS 'view | download | upload | edit | manage'
// // // // // //     `);
// // // // // // 
// // // // // //     // Index để tăng tốc query theo (document_id, permission) và (folder_id, permission)
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS idx_doc_access_rules_permission
// // // // // //         ON knowledge.document_access_rules (document_id, permission)
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS idx_folder_access_rules_permission
// // // // // //         ON knowledge.folder_access_rules (folder_id, permission)
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`DROP INDEX IF EXISTS knowledge.idx_folder_access_rules_permission`);
// // // // // //     await queryRunner.query(`DROP INDEX IF EXISTS knowledge.idx_doc_access_rules_permission`);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE knowledge.folder_access_rules
// // // // // //         DROP COLUMN IF EXISTS permission
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE knowledge.document_access_rules
// // // // // //         DROP COLUMN IF EXISTS permission
// // // // // //     `);
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 
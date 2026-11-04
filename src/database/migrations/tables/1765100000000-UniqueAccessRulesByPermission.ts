// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: UniqueAccessRulesByPermission1765100000000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class UniqueAccessRulesByPermission1765100000000 implements MigrationInterface {
// // // // // //   name = 'UniqueAccessRulesByPermission1765100000000';
// // // // // // 
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       DELETE FROM knowledge.document_access_rules a
// // // // // //       USING knowledge.document_access_rules b
// // // // // //       WHERE a.ctid < b.ctid
// // // // // //         AND a.document_id = b.document_id
// // // // // //         AND a.access_type = b.access_type
// // // // // //         AND a.access_id = b.access_id
// // // // // //         AND a.permission = b.permission
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       DELETE FROM knowledge.folder_access_rules a
// // // // // //       USING knowledge.folder_access_rules b
// // // // // //       WHERE a.ctid < b.ctid
// // // // // //         AND a.folder_id = b.folder_id
// // // // // //         AND a.access_type = b.access_type
// // // // // //         AND a.access_id = b.access_id
// // // // // //         AND a.permission = b.permission
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE UNIQUE INDEX IF NOT EXISTS uq_doc_access_rules_subject_permission
// // // // // //       ON knowledge.document_access_rules (document_id, access_type, access_id, permission)
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE UNIQUE INDEX IF NOT EXISTS uq_folder_access_rules_subject_permission
// // // // // //       ON knowledge.folder_access_rules (folder_id, access_type, access_id, permission)
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       DROP INDEX IF EXISTS knowledge.uq_folder_access_rules_subject_permission
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       DROP INDEX IF EXISTS knowledge.uq_doc_access_rules_subject_permission
// // // // // //     `);
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 
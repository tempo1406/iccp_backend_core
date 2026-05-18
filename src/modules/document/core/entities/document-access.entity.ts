import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum AccessType {
  USER = 'user',
  ROLE = 'role',
  PROJECT = 'project',
}

/**
 * Quyền tài nguyên được áp dụng trên từng document hoặc folder.
 *
 * Hierarchy (cao hơn bao gồm thấp hơn):
 *   manage > edit > upload > download > view
 */
export enum ResourcePermission {
  VIEW = 'view', // Xem metadata và preview
  DOWNLOAD = 'download', // Tải file
  UPLOAD = 'upload', // Upload version mới
  EDIT = 'edit', // Sửa metadata (title, description, category, scope)
  MANAGE = 'manage', // Toàn quyền: cấp/thu hồi access, xoá, restore
}

/**
 * Danh sách permission "đủ điều kiện" cho mỗi action.
 * Nếu rule của user có permission thuộc PERMISSION_COVERS[required],
 * user được coi là có quyền thực hiện action đó.
 */
export const PERMISSION_COVERS: Record<
  ResourcePermission,
  ResourcePermission[]
> = {
  [ResourcePermission.VIEW]: [
    ResourcePermission.VIEW,
    ResourcePermission.DOWNLOAD,
    ResourcePermission.UPLOAD,
    ResourcePermission.EDIT,
    ResourcePermission.MANAGE,
  ],
  [ResourcePermission.DOWNLOAD]: [
    ResourcePermission.DOWNLOAD,
    ResourcePermission.UPLOAD,
    ResourcePermission.EDIT,
    ResourcePermission.MANAGE,
  ],
  [ResourcePermission.UPLOAD]: [
    ResourcePermission.UPLOAD,
    ResourcePermission.EDIT,
    ResourcePermission.MANAGE,
  ],
  [ResourcePermission.EDIT]: [
    ResourcePermission.EDIT,
    ResourcePermission.MANAGE,
  ],
  [ResourcePermission.MANAGE]: [ResourcePermission.MANAGE],
};

@Entity({ schema: 'knowledge', name: 'document_access_rules' })
export class DocumentAccessRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @Column({ name: 'access_type', type: 'varchar', length: 50 })
  accessType: string;

  @Column({ name: 'access_id', type: 'uuid' })
  accessId: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: ResourcePermission.VIEW,
    comment: 'view | download | upload | edit | manage',
  })
  permission: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

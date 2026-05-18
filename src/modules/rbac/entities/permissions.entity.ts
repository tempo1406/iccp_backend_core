import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ schema: 'rbac', name: 'permissions' })
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  code: string; // e.g. "documents.create", "projects.delete"

  @Column({ length: 255 })
  name: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ length: 50 })
  module: string; // documents | projects | users | chatbot | analytics | billing | system | rbac | tenant

  @CreateDateColumn()
  createdAt: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'tenant', name: 'org_working_time_configs' })
export class OrgWorkingTimeConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid', unique: true })
  organizationId: string;

  @Column({
    name: 'monday_hours',
    type: 'decimal',
    precision: 4,
    scale: 2,
    default: 8.0,
  })
  mondayHours: number;

  @Column({
    name: 'tuesday_hours',
    type: 'decimal',
    precision: 4,
    scale: 2,
    default: 8.0,
  })
  tuesdayHours: number;

  @Column({
    name: 'wednesday_hours',
    type: 'decimal',
    precision: 4,
    scale: 2,
    default: 8.0,
  })
  wednesdayHours: number;

  @Column({
    name: 'thursday_hours',
    type: 'decimal',
    precision: 4,
    scale: 2,
    default: 8.0,
  })
  thursdayHours: number;

  @Column({
    name: 'friday_hours',
    type: 'decimal',
    precision: 4,
    scale: 2,
    default: 8.0,
  })
  fridayHours: number;

  @Column({
    name: 'saturday_hours',
    type: 'decimal',
    precision: 4,
    scale: 2,
    default: 0.0,
  })
  saturdayHours: number;

  @Column({
    name: 'sunday_hours',
    type: 'decimal',
    precision: 4,
    scale: 2,
    default: 0.0,
  })
  sundayHours: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

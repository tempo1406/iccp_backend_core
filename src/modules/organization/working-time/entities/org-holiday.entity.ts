import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export enum OrgHolidayType {
  NATIONAL_HOLIDAY = 'national_holiday',
  COMPANY_HOLIDAY = 'company_holiday',
  SPECIAL_DAY = 'special_day',
}

@Entity({ schema: 'tenant', name: 'org_holidays' })
@Unique(['organizationId', 'date'])
export class OrgHoliday {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ type: 'date' })
  date: string; // YYYY-MM-DD

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: OrgHolidayType,
    enumName: 'org_holiday_type',
    default: OrgHolidayType.NATIONAL_HOLIDAY,
  })
  type: OrgHolidayType;

  /** 0 = full day off, 4 = half day */
  @Column({
    name: 'working_hours',
    type: 'decimal',
    precision: 4,
    scale: 2,
    default: 0.0,
  })
  workingHours: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}

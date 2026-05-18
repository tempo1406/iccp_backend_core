import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ schema: 'project', name: 'daily_report_comments' })
@Index('idx_daily_report_comments_report', ['dailyReportId', 'createdAt'])
export class DailyReportComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'daily_report_id', type: 'uuid' })
  dailyReportId: string;

  @Column({ name: 'author_id', type: 'uuid' })
  authorId: string;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

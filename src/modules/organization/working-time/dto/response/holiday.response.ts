import { Expose } from 'class-transformer';
import { OrgHolidayType } from '../../entities/org-holiday.entity';

export class HolidayResponse {
  @Expose() id: string;
  @Expose() date: string;
  @Expose() name: string;
  @Expose() type: OrgHolidayType;
  @Expose() workingHours: number;
  @Expose() createdAt: Date;
}

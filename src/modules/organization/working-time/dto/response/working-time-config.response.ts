import { Expose } from 'class-transformer';

export class WorkingTimeConfigResponse {
  @Expose() organizationId: string;
  @Expose() mondayHours: number;
  @Expose() tuesdayHours: number;
  @Expose() wednesdayHours: number;
  @Expose() thursdayHours: number;
  @Expose() fridayHours: number;
  @Expose() saturdayHours: number;
  @Expose() sundayHours: number;
  @Expose() updatedAt: Date;
}

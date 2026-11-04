import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { OrgWorkingTimeConfig } from './entities/org-working-time-config.entity';
import { OrgHoliday } from './entities/org-holiday.entity';
import {
  TicketRequest,
  TicketRequestStatus,
  TicketRequestType,
} from '@modules/ticket-request/core/entities/ticket-request.entity';
import { KpiSettingsResolver } from '@modules/analytics/kpi-settings-resolver.service';
import { UpsertWorkingTimeRequest } from './dto/request/upsert-working-time.request';
import { CreateHolidayRequest } from './dto/request/create-holiday.request';
import { WorkingTimeConfigResponse } from './dto/response/working-time-config.response';
import { HolidayResponse } from './dto/response/holiday.response';

const DAY_HOURS_KEY: (keyof OrgWorkingTimeConfig)[] = [
  'sundayHours',
  'mondayHours',
  'tuesdayHours',
  'wednesdayHours',
  'thursdayHours',
  'fridayHours',
  'saturdayHours',
];

function getStandardHoursForDate(
  date: Date,
  config: OrgWorkingTimeConfig,
  holidayMap: Map<string, OrgHoliday>,
): number {
  const dateStr = date.toISOString().slice(0, 10);
  const holiday = holidayMap.get(dateStr);
  if (holiday) return Number(holiday.workingHours);
  const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
  return Number(config[DAY_HOURS_KEY[dayOfWeek]]);
}

function getOtMultiplier(
  dateStr: string,
  holidayMap: Map<string, OrgHoliday>,
  multipliers: {
    weekday: number;
    saturday: number;
    sunday: number;
    holiday: number;
  },
): number {
  if (holidayMap.has(dateStr)) return multipliers.holiday;
  const dayOfWeek = new Date(dateStr).getDay();
  if (dayOfWeek === 0) return multipliers.sunday;
  if (dayOfWeek === 6) return multipliers.saturday;
  return multipliers.weekday;
}

@Injectable()
export class WorkingTimeService {
  constructor(
    @InjectRepository(OrgWorkingTimeConfig)
    private readonly configRepo: Repository<OrgWorkingTimeConfig>,

    @InjectRepository(OrgHoliday)
    private readonly holidayRepo: Repository<OrgHoliday>,

    @InjectRepository(TicketRequest)
    private readonly ticketRepo: Repository<TicketRequest>,

    private readonly kpiSettingsResolver: KpiSettingsResolver,
  ) {}

  async getOrCreateConfig(orgId: string): Promise<OrgWorkingTimeConfig> {
    let config = await this.configRepo.findOne({
      where: { organizationId: orgId },
    });
    if (!config) {
      config = this.configRepo.create({ organizationId: orgId });
      await this.configRepo.save(config);
    }
    return config;
  }

  async upsertConfig(
    orgId: string,
    dto: UpsertWorkingTimeRequest,
  ): Promise<WorkingTimeConfigResponse> {
    let config = await this.configRepo.findOne({
      where: { organizationId: orgId },
    });
    if (!config) {
      config = this.configRepo.create({ organizationId: orgId });
    }
    Object.assign(config, dto);
    const saved = await this.configRepo.save(config);
    return plainToInstance(WorkingTimeConfigResponse, saved, {
      excludeExtraneousValues: true,
    });
  }

  async getConfig(orgId: string): Promise<WorkingTimeConfigResponse> {
    const config = await this.getOrCreateConfig(orgId);
    return plainToInstance(WorkingTimeConfigResponse, config, {
      excludeExtraneousValues: true,
    });
  }

  async listHolidays(orgId: string): Promise<HolidayResponse[]> {
    const holidays = await this.holidayRepo.find({
      where: { organizationId: orgId, deletedAt: IsNull() },
      order: { date: 'ASC' },
    });
    return plainToInstance(HolidayResponse, holidays, {
      excludeExtraneousValues: true,
    });
  }

  async addHoliday(
    orgId: string,
    dto: CreateHolidayRequest,
  ): Promise<HolidayResponse> {
    const existing = await this.holidayRepo.findOne({
      where: { organizationId: orgId, date: dto.date },
    });
    if (existing && !existing.deletedAt) {
      throw new ConflictException(`A holiday already exists on ${dto.date}`);
    }

    const holiday = this.holidayRepo.create({
      organizationId: orgId,
      date: dto.date,
      name: dto.name,
      type: dto.type,
      workingHours: dto.workingHours ?? 0,
    });
    const saved = await this.holidayRepo.save(holiday);
    return plainToInstance(HolidayResponse, saved, {
      excludeExtraneousValues: true,
    });
  }

  async deleteHoliday(orgId: string, holidayId: string): Promise<void> {
    const holiday = await this.holidayRepo.findOne({
      where: { id: holidayId, organizationId: orgId },
    });
    if (!holiday) throw new NotFoundException('Holiday not found');
    await this.holidayRepo.softDelete(holidayId);
  }

  async calcExpectedWorkingHours(
    orgId: string,
    dateFrom: Date,
    dateTo: Date,
    allocatedHoursPerDay?: number | null,
  ): Promise<number> {
    const config = await this.getOrCreateConfig(orgId);
    const holidays = await this.holidayRepo.find({
      where: { organizationId: orgId, deletedAt: IsNull() },
    });
    const holidayMap = new Map(holidays.map((h) => [h.date, h]));

    let total = 0;
    const cur = new Date(dateFrom);
    cur.setHours(0, 0, 0, 0);
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);

    while (cur <= end) {
      const dateStr = cur.toISOString().slice(0, 10);
      const holiday = holidayMap.get(dateStr);

      if (holiday) {
        total += Number(holiday.workingHours);
      } else if (allocatedHoursPerDay != null) {
        const orgHours = getStandardHoursForDate(cur, config, holidayMap);
        if (orgHours > 0) {
          total += allocatedHoursPerDay;
        }
      } else {
        total += getStandardHoursForDate(cur, config, holidayMap);
      }

      cur.setDate(cur.getDate() + 1);
    }
    return total;
  }

  async calcMemberOtHours(
    userId: string,
    orgId: string,
    dateFrom?: Date,
    dateTo?: Date,
    projectId?: string,
  ): Promise<{
    totalOtHours: number;
    effectiveOtHours: number;
    approvedOtTickets: number;
  }> {
    const ticketsQuery = this.ticketRepo
      .createQueryBuilder('ticket')
      .where('ticket.organization_id = :orgId', { orgId })
      .andWhere('ticket.type = :type', { type: TicketRequestType.OVERTIME })
      .andWhere('ticket.status = :status', {
        status: TicketRequestStatus.APPROVED,
      })
      .andWhere('ticket.deleted_at IS NULL')
      .andWhere(
        `(
          ticket.effort_owner_id = :userId
          OR COALESCE(ticket.ot_metadata->'effortOwnerIds', '[]'::jsonb) @> CAST(:effortOwnerIds AS jsonb)
        )`,
        { userId, effortOwnerIds: JSON.stringify([userId]) },
      );

    if (projectId) {
      ticketsQuery.andWhere("ticket.ot_metadata ->> 'projectId' = :projectId", {
        projectId,
      });
    }

    const tickets = await ticketsQuery.getMany();

    const holidays = await this.holidayRepo.find({
      where: { organizationId: orgId, deletedAt: IsNull() },
    });
    const holidayMap = new Map(holidays.map((h) => [h.date, h]));
    const multipliers =
      await this.kpiSettingsResolver.resolveOtMultipliers(orgId);

    let totalOtHours = 0;
    let effectiveOtHours = 0;

    for (const ticket of tickets) {
      const entries = (ticket.otMetadata as any)?.effortEntries ?? [];
      for (const entry of entries) {
        if (dateFrom && new Date(entry.date) < dateFrom) continue;
        if (dateTo && new Date(entry.date) > dateTo) continue;

        const hours = Number(entry.hours);
        const mult = getOtMultiplier(entry.date, holidayMap, multipliers);
        totalOtHours += hours;
        effectiveOtHours += hours * mult;
      }
    }

    return {
      totalOtHours: Math.round(totalOtHours * 100) / 100,
      effectiveOtHours: Math.round(effectiveOtHours * 100) / 100,
      approvedOtTickets: tickets.length,
    };
  }
}

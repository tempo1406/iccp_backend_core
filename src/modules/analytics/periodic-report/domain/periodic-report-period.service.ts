import { Injectable } from '@nestjs/common';
import { ReportFrequency } from './constants/periodic-report.constant';

type PeriodSchedule = {
  periodKey: string;
  periodStart: string;
  periodEnd: string;
  scheduledFor: Date;
};

@Injectable()
export class PeriodicReportPeriodService {
  normalizeTimeZone(timeZone?: string | null): string {
    if (!timeZone) return 'UTC';
    try {
      new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
      return timeZone;
    } catch {
      return 'UTC';
    }
  }

  getLatestClosedPeriodSchedule(
    frequency: ReportFrequency,
    now: Date,
    timeZone: string,
    sendDelayDays: number,
    sendTime: string,
  ): PeriodSchedule {
    switch (frequency) {
      case ReportFrequency.MONTHLY:
        return this.getLatestClosedMonthSchedule(
          now,
          timeZone,
          sendDelayDays,
          sendTime,
        );
      case ReportFrequency.YEARLY:
        return this.getLatestClosedYearSchedule(
          now,
          timeZone,
          sendDelayDays,
          sendTime,
        );
      case ReportFrequency.QUARTERLY:
      default:
        return this.getLatestClosedQuarterSchedule(
          now,
          timeZone,
          sendDelayDays,
          sendTime,
        );
    }
  }

  getLatestClosedQuarterSchedule(
    now: Date,
    timeZone: string,
    sendDelayDays: number,
    sendTime: string,
  ): PeriodSchedule {
    const normalizedTz = this.normalizeTimeZone(timeZone);
    const localNow = this.getDateTimeParts(now, normalizedTz);
    const currentQuarter = Math.floor((localNow.month - 1) / 3) + 1;
    let year = localNow.year;
    let quarter = currentQuarter - 1;
    if (quarter === 0) {
      quarter = 4;
      year -= 1;
    }

    const periodStartMonth = (quarter - 1) * 3 + 1;
    const periodEndMonth = periodStartMonth + 2;
    const periodStart = `${year}-${this.pad(periodStartMonth)}-01`;
    const periodEndDay = new Date(Date.UTC(year, periodEndMonth, 0)).getUTCDate();
    const periodEnd = `${year}-${this.pad(periodEndMonth)}-${this.pad(periodEndDay)}`;

    return {
      periodKey: `${year}-Q${quarter}`,
      periodStart,
      periodEnd,
      scheduledFor: this.computeScheduledFor(periodEnd, normalizedTz, sendDelayDays, sendTime),
    };
  }

  getLatestClosedMonthSchedule(
    now: Date,
    timeZone: string,
    sendDelayDays: number,
    sendTime: string,
  ): PeriodSchedule {
    const normalizedTz = this.normalizeTimeZone(timeZone);
    const localNow = this.getDateTimeParts(now, normalizedTz);
    let year = localNow.year;
    let month = localNow.month - 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
    const periodStart = `${year}-${this.pad(month)}-01`;
    const periodEndDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const periodEnd = `${year}-${this.pad(month)}-${this.pad(periodEndDay)}`;

    return {
      periodKey: `${year}-M${this.pad(month)}`,
      periodStart,
      periodEnd,
      scheduledFor: this.computeScheduledFor(periodEnd, normalizedTz, sendDelayDays, sendTime),
    };
  }

  getLatestClosedYearSchedule(
    now: Date,
    timeZone: string,
    sendDelayDays: number,
    sendTime: string,
  ): PeriodSchedule {
    const normalizedTz = this.normalizeTimeZone(timeZone);
    const localNow = this.getDateTimeParts(now, normalizedTz);
    const year = localNow.year - 1;
    const periodStart = `${year}-01-01`;
    const periodEnd = `${year}-12-31`;

    return {
      periodKey: `${year}-Y`,
      periodStart,
      periodEnd,
      scheduledFor: this.computeScheduledFor(periodEnd, normalizedTz, sendDelayDays, sendTime),
    };
  }

  private computeScheduledFor(
    periodEnd: string,
    timeZone: string,
    sendDelayDays: number,
    sendTime: string,
  ): Date {
    const scheduledDate = this.addDays(periodEnd, sendDelayDays);
    const [hours, minutes] = this.parseSendTime(sendTime);
    return this.zonedDateTimeToUtc(scheduledDate, timeZone, hours, minutes);
  }

  parsePeriodKey(periodKey: string): {
    periodKey: string;
    periodStart: string;
    periodEnd: string;
    frequency: ReportFrequency;
  } {
    const trimmed = periodKey.trim();
    const quarterMatch = /^(\d{4})-Q([1-4])$/i.exec(trimmed);
    if (quarterMatch) {
      const year = Number(quarterMatch[1]);
      const quarter = Number(quarterMatch[2]);
      const periodStartMonth = (quarter - 1) * 3 + 1;
      const periodEndMonth = periodStartMonth + 2;
      const periodStart = `${year}-${this.pad(periodStartMonth)}-01`;
      const periodEndDay = new Date(Date.UTC(year, periodEndMonth, 0)).getUTCDate();
      const periodEnd = `${year}-${this.pad(periodEndMonth)}-${this.pad(periodEndDay)}`;
      return {
        periodKey: `${year}-Q${quarter}`,
        periodStart,
        periodEnd,
        frequency: ReportFrequency.QUARTERLY,
      };
    }

    const monthMatch = /^(\d{4})-M(0[1-9]|1[0-2])$/i.exec(trimmed);
    if (monthMatch) {
      const year = Number(monthMatch[1]);
      const month = Number(monthMatch[2]);
      const periodStart = `${year}-${this.pad(month)}-01`;
      const periodEndDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const periodEnd = `${year}-${this.pad(month)}-${this.pad(periodEndDay)}`;
      return {
        periodKey: `${year}-M${this.pad(month)}`,
        periodStart,
        periodEnd,
        frequency: ReportFrequency.MONTHLY,
      };
    }

    const yearMatch = /^(\d{4})-Y$/i.exec(trimmed);
    if (yearMatch) {
      const year = Number(yearMatch[1]);
      return {
        periodKey: `${year}-Y`,
        periodStart: `${year}-01-01`,
        periodEnd: `${year}-12-31`,
        frequency: ReportFrequency.YEARLY,
      };
    }

    throw new Error(
      'Invalid period key. Expected YYYY-QN, YYYY-MNN, or YYYY-Y',
    );
  }

  formatPeriodLabel(
    frequency: ReportFrequency,
    periodKey: string,
    periodStart: string,
    periodEnd: string,
  ): string {
    const prefix =
      frequency === ReportFrequency.MONTHLY
        ? 'Month'
        : frequency === ReportFrequency.YEARLY
          ? 'Year'
          : 'Quarter';
    return `${prefix} ${periodKey} (${periodStart} - ${periodEnd})`;
  }

  toDateStr(date: Date | string): string {
    if (typeof date === 'string') return date;
    return date.toISOString().slice(0, 10);
  }

  zonedDateTimeToUtc(
    dateStr: string,
    timeZone: string,
    hours = 0,
    minutes = 0,
    seconds = 0,
    milliseconds = 0,
  ): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    const utcGuess = Date.UTC(
      year,
      month - 1,
      day,
      hours,
      minutes,
      seconds,
      milliseconds,
    );

    const firstPass = new Date(
      utcGuess - this.getTimeZoneOffsetMs(new Date(utcGuess), timeZone),
    );
    return new Date(
      utcGuess - this.getTimeZoneOffsetMs(firstPass, timeZone),
    );
  }

  parseSendTime(sendTime: string): [number, number] {
    const match = /^(\d{2}):(\d{2})$/.exec(sendTime.trim());
    if (!match) {
      return [8, 0];
    }
    return [Number(match[1]), Number(match[2])];
  }

  private addDays(dateStr: string, days: number): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    const next = new Date(Date.UTC(year, month - 1, day));
    next.setUTCDate(next.getUTCDate() + days);
    return next.toISOString().slice(0, 10);
  }

  private getDateTimeParts(date: Date, timeZone: string) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(date);

    const values = Object.fromEntries(
      parts
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, Number(part.value)]),
    );

    return {
      year: values.year,
      month: values.month,
      day: values.day,
      hour: values.hour,
      minute: values.minute,
      second: values.second,
    };
  }

  private getTimeZoneOffsetMs(date: Date, timeZone: string): number {
    const values = this.getDateTimeParts(date, timeZone);
    const wallTimeUtc = Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour,
      values.minute,
      values.second,
    );
    return wallTimeUtc - date.getTime();
  }

  private pad(value: number): string {
    return `${value}`.padStart(2, '0');
  }
}

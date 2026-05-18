import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createCanvas, GlobalFonts, type SKRSContext2D } from '@napi-rs/canvas';
import { PeriodicReportScope } from '@modules/organization/settings/constants/periodic-report-settings.constant';
import { PeriodicReportCsvArtifact } from './periodic-report-csv.service';
import {
  PeriodicMemberKpiItem,
  PeriodicOrgSummary,
  PeriodicProjectSummaryItem,
  PeriodicReportSummarySnapshot,
} from './types/periodic-report.types';

const FONT_ALIAS = 'PeriodicReportRoboto';
const FONT_BOLD_ALIAS = 'PeriodicReportRobotoBold';
const FONT_ITALIC_ALIAS = 'PeriodicReportRobotoItalic';
const ROBOTO_SUBSET = 'latin';
const FONT_FORMATS = ['woff2', 'woff'] as const;
const SYSTEM_FONT_CANDIDATES = [
  'Arial',
  'DejaVu Sans',
  'Liberation Sans',
  'Noto Sans',
  'Roboto',
  'sans-serif',
];
const GENERIC_FONT_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
]);

let FONTS_LOADED = false;
let FONT_LOAD_ERROR: string | null = null;
let FONT_REGULAR_FAMILY = 'sans-serif';
let FONT_BOLD_FAMILY = 'sans-serif';
let FONT_ITALIC_FAMILY = 'sans-serif';

type ChartFontSet = {
  regular: string;
  bold: string;
  italic: string;
  source: string;
};

function fontStr(size: number, bold = false): string {
  const family = bold ? FONT_BOLD_FAMILY : FONT_REGULAR_FAMILY;
  return `${bold ? 'bold ' : ''}${size}px ${formatFontFamily(family)}`;
}

function italicFontStr(size: number): string {
  return `italic ${size}px ${formatFontFamily(FONT_ITALIC_FAMILY)}`;
}

function ensureRenderableFontsLoaded(logger: Logger): void {
  if (FONTS_LOADED && !FONT_LOAD_ERROR) return;

  const systemFontSet = resolveSystemFontSet();
  if (systemFontSet) {
    applyChartFontSet(systemFontSet);
    logger.log(`Chart font ready: ${systemFontSet.source}`);
    return;
  }

  try {
    const bundledFontSet = registerBundledRobotoFontSet(logger);
    if (bundledFontSet) {
      applyChartFontSet(bundledFontSet);
      logger.log(`Chart font ready: ${bundledFontSet.source}`);
      return;
    }
  } catch (error) {
    logger.warn(
      `Failed to register bundled font: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  FONT_LOAD_ERROR =
    'No usable canvas font is available for periodic report charts. Install a system TTF font or keep @fontsource/roboto available.';
  FONTS_LOADED = true;
  logger.error(FONT_LOAD_ERROR);
}

function assertChartFontsLoaded(logger: Logger): void {
  ensureRenderableFontsLoaded(logger);
  if (FONT_LOAD_ERROR) {
    throw new Error(FONT_LOAD_ERROR);
  }
}

function registerBundledRobotoFontSet(logger: Logger): ChartFontSet | null {
  const pkgRoot = dirname(require.resolve('@fontsource/roboto/package.json'));
  const filesRoot = join(pkgRoot, 'files');

  for (const format of FONT_FORMATS) {
    const suffix = format.toUpperCase();
    const regularPath = join(
      filesRoot,
      `roboto-${ROBOTO_SUBSET}-400-normal.${format}`,
    );
    const boldPath = join(
      filesRoot,
      `roboto-${ROBOTO_SUBSET}-700-normal.${format}`,
    );
    const italicPath = join(
      filesRoot,
      `roboto-${ROBOTO_SUBSET}-400-italic.${format}`,
    );

    const regularFamily = `${FONT_ALIAS}${suffix}`;
    const boldFamily = `${FONT_BOLD_ALIAS}${suffix}`;
    const italicFamily = `${FONT_ITALIC_ALIAS}${suffix}`;
    const regularKey = registerFontIfExists(regularPath, regularFamily);
    const boldKey = registerFontIfExists(boldPath, boldFamily);
    const italicKey = registerFontIfExists(italicPath, italicFamily);

    if (!regularKey) {
      logger.warn(`Chart font file was not registered: ${regularPath}`);
      continue;
    }

    if (!canRenderTextWithFamily(regularFamily)) {
      logger.warn(
        `Chart font ${regularFamily} registered but cannot render text`,
      );
      continue;
    }

    return {
      regular: regularFamily,
      bold:
        boldKey && canRenderTextWithFamily(boldFamily)
          ? boldFamily
          : regularFamily,
      italic:
        italicKey && canRenderTextWithFamily(italicFamily)
          ? italicFamily
          : regularFamily,
      source: `${ROBOTO_SUBSET} ${format}`,
    };
  }

  return null;
}

function registerFontIfExists(path: string, alias: string): object | null {
  if (!existsSync(path)) return null;
  return GlobalFonts.registerFromPath(path, alias);
}

function resolveSystemFontSet(): ChartFontSet | null {
  (
    GlobalFonts as typeof GlobalFonts & { loadSystemFonts: () => number }
  ).loadSystemFonts();
  for (const family of SYSTEM_FONT_CANDIDATES) {
    if (!canRenderTextWithFamily(family)) continue;
    return {
      regular: family,
      bold: family,
      italic: family,
      source: family,
    };
  }

  return null;
}

function applyChartFontSet(fontSet: ChartFontSet): void {
  FONT_REGULAR_FAMILY = fontSet.regular;
  FONT_BOLD_FAMILY = fontSet.bold;
  FONT_ITALIC_FAMILY = fontSet.italic;
  FONT_LOAD_ERROR = null;
  FONTS_LOADED = true;
}

function canRenderTextWithFamily(family: string): boolean {
  const canvas = createCanvas(180, 56);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 180, 56);
  ctx.fillStyle = '#000000';
  ctx.font = `24px ${formatFontFamily(family)}`;
  ctx.fillText('ICCP 123', 8, 36);

  const pixels = ctx.getImageData(0, 0, 180, 56).data;
  let inkPixels = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];
    const isDark =
      pixels[i] < 240 || pixels[i + 1] < 240 || pixels[i + 2] < 240;
    if (alpha > 0 && isDark) {
      inkPixels++;
    }
  }

  return inkPixels > 20;
}

function formatFontFamily(family: string): string {
  if (GENERIC_FONT_FAMILIES.has(family.toLowerCase())) {
    return family;
  }
  return `"${family.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
const CHART_W = 900;
const CHART_H = 460;
const TOP_N = 15;

const PALETTE = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#0ea5e9', // sky
  '#f97316', // orange
  '#6366f1', // indigo
];

type ColumnDef = {
  header: string;
  key: string;
  width?: number;
  numFmt?: string;
};

type Series = {
  name: string;
  color: string;
  data: number[];
};

@Injectable()
export class PeriodicReportXlsxService {
  private readonly logger = new Logger(PeriodicReportXlsxService.name);

  constructor() {
    ensureRenderableFontsLoaded(this.logger);
  }

  async buildArtifacts(
    snapshot: PeriodicReportSummarySnapshot,
  ): Promise<PeriodicReportCsvArtifact[]> {
    assertChartFontsLoaded(this.logger);

    const hasData =
      !!snapshot.orgSummary ||
      snapshot.projectSummary.length > 0 ||
      snapshot.memberKpi.length > 0;
    if (!hasData) {
      return [];
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ICCP Periodic Report';
    workbook.created = new Date();

    if (snapshot.orgSummary) {
      this.writeOrgSummarySheet(workbook, snapshot);
    }
    if (snapshot.projectSummary.length > 0) {
      this.writeProjectSummarySheet(workbook, snapshot.projectSummary);
    }
    if (snapshot.memberKpi.length > 0) {
      this.writeMemberKpiSheet(workbook, snapshot.memberKpi);
    }

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    return [
      {
        artifactType: PeriodicReportScope.WORKBOOK,
        fileName: `periodic-report-${snapshot.periodKey}.xlsx`,
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        content: buffer,
      },
    ];
  }

  private writeOrgSummarySheet(
    workbook: ExcelJS.Workbook,
    snapshot: PeriodicReportSummarySnapshot,
  ): void {
    const org = snapshot.orgSummary!;
    const sheet = workbook.addWorksheet('Org Summary');
    const columns: ColumnDef[] = [
      { header: 'Organization', key: 'organizationName', width: 28 },
      { header: 'Period', key: 'periodKey', width: 14 },
      { header: 'Total Members', key: 'totalMembers', width: 14 },
      { header: 'Active Members', key: 'activeMembers', width: 14 },
      { header: 'Total Projects', key: 'totalProjects', width: 14 },
      { header: 'Active Projects', key: 'activeProjects', width: 14 },
      { header: 'Completed Projects', key: 'completedProjects', width: 18 },
      { header: 'On Hold Projects', key: 'onHoldProjects', width: 16 },
      { header: 'Cancelled Projects', key: 'cancelledProjects', width: 18 },
      { header: 'Total Tasks', key: 'totalTasks', width: 12 },
      { header: 'Completed Tasks', key: 'completedTasks', width: 16 },
      { header: 'Overdue Tasks', key: 'overdueTasks', width: 14 },
      {
        header: 'Estimate Points',
        key: 'totalEstimatePoints',
        width: 16,
        numFmt: '#,##0.00',
      },
      {
        header: 'Actual Points',
        key: 'totalActualPoints',
        width: 14,
        numFmt: '#,##0.00',
      },
      {
        header: 'Completion Rate',
        key: 'completionRate',
        width: 16,
        numFmt: '0.00%',
      },
      {
        header: 'Point Completion',
        key: 'pointCompletionRate',
        width: 16,
        numFmt: '0.00%',
      },
      { header: 'On-Time Rate', key: 'onTimeRate', width: 14, numFmt: '0.00%' },
      { header: 'Total Tickets', key: 'totalTickets', width: 14 },
      { header: 'Pending Tickets', key: 'pendingTickets', width: 16 },
      { header: 'Approved Tickets', key: 'approvedTickets', width: 16 },
      { header: 'Rejected Tickets', key: 'rejectedTickets', width: 16 },
      {
        header: 'Approved OT Tickets',
        key: 'totalApprovedOtTickets',
        width: 18,
      },
      {
        header: 'Total OT Hours',
        key: 'totalOtHours',
        width: 14,
        numFmt: '#,##0.00',
      },
    ];
    this.applyColumns(sheet, columns);

    sheet.addRow({
      organizationName: org.organizationName,
      periodKey: snapshot.periodKey,
      totalMembers: org.totalMembers,
      activeMembers: org.activeMembers,
      totalProjects: org.totalProjects,
      activeProjects: org.activeProjects,
      completedProjects: org.completedProjects,
      onHoldProjects: org.onHoldProjects,
      cancelledProjects: org.cancelledProjects,
      totalTasks: org.totalTasks,
      completedTasks: org.completedTasks,
      overdueTasks: org.overdueTasks,
      totalEstimatePoints: org.totalEstimatePoints,
      totalActualPoints: org.totalActualPoints,
      completionRate: this.toRatio(org.completionRate),
      pointCompletionRate: this.toRatio(org.pointCompletionRate),
      onTimeRate: this.toRatio(org.onTimeRate),
      totalTickets: org.totalTickets,
      pendingTickets: org.pendingTickets,
      approvedTickets: org.approvedTickets,
      rejectedTickets: org.rejectedTickets,
      totalApprovedOtTickets: org.totalApprovedOtTickets,
      totalOtHours: org.totalOtHours,
    });

    this.styleHeader(sheet);
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    let row = 4;

    // Chart 1: Project status pie
    const projectPie = this.renderPieChart({
      title: 'Project Status Breakdown',
      labels: ['Active', 'Completed', 'On Hold', 'Cancelled'],
      values: [
        org.activeProjects,
        org.completedProjects,
        org.onHoldProjects,
        org.cancelledProjects,
      ],
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
      total: org.totalProjects,
      totalLabel: 'projects',
    });
    this.embedImage(workbook, sheet, projectPie, row);
    row += 22;

    // Chart 2: Task overview column
    const taskBars = this.renderColumnChart({
      title: 'Task Overview',
      yAxisLabel: 'Tasks',
      labels: ['Total', 'Completed', 'Overdue'],
      series: [
        {
          name: 'Tasks',
          color: '#6366f1',
          data: [org.totalTasks, org.completedTasks, org.overdueTasks],
        },
      ],
    });
    this.embedImage(workbook, sheet, taskBars, row);
    row += 22;

    // Chart 3: KPI rates
    const ratesChart = this.renderColumnChart({
      title: 'Performance Rates (%)',
      yAxisLabel: 'Percentage',
      labels: ['Completion', 'Point Completion', 'On-Time'],
      series: [
        {
          name: 'Rate %',
          color: '#10b981',
          data: [
            this.clampPercent(org.completionRate),
            this.clampPercent(org.pointCompletionRate),
            this.clampPercent(org.onTimeRate),
          ],
        },
      ],
      yMax: 100,
      valueSuffix: '%',
    });
    this.embedImage(workbook, sheet, ratesChart, row);
    row += 22;

    // Chart 4: Ticket pie
    const ticketPie = this.renderPieChart({
      title: 'Ticket Status Breakdown',
      labels: ['Pending', 'Approved', 'Rejected'],
      values: [org.pendingTickets, org.approvedTickets, org.rejectedTickets],
      colors: ['#f59e0b', '#10b981', '#ef4444'],
      total: org.totalTickets,
      totalLabel: 'tickets',
    });
    this.embedImage(workbook, sheet, ticketPie, row);
    row += 22;

    // Chart 5: Members and OT
    const membersOt = this.renderColumnChart({
      title: 'Members & Overtime',
      yAxisLabel: 'Count / Hours',
      labels: ['Total Members', 'Active Members', 'OT Tickets', 'OT Hours'],
      series: [
        {
          name: 'Value',
          color: '#0ea5e9',
          data: [
            org.totalMembers,
            org.activeMembers,
            org.totalApprovedOtTickets,
            Number(org.totalOtHours.toFixed(2)),
          ],
        },
      ],
    });
    this.embedImage(workbook, sheet, membersOt, row);
  }

  private writeProjectSummarySheet(
    workbook: ExcelJS.Workbook,
    items: PeriodicProjectSummaryItem[],
  ): void {
    const sheet = workbook.addWorksheet('Project Summary');
    const columns: ColumnDef[] = [
      { header: 'Project', key: 'projectName', width: 28 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Members', key: 'memberCount', width: 12 },
      { header: 'Total Assigned', key: 'totalAssigned', width: 14 },
      { header: 'Completed', key: 'completedTasks', width: 12 },
      { header: 'Open', key: 'openTasks', width: 10 },
      { header: 'On Time', key: 'onTimeTasks', width: 10 },
      { header: 'Late', key: 'lateTasks', width: 10 },
      { header: 'Overdue', key: 'overdueTasks', width: 10 },
      {
        header: 'Estimate Points',
        key: 'totalEstimatePoints',
        width: 14,
        numFmt: '#,##0.00',
      },
      {
        header: 'Actual Points',
        key: 'totalActualPoints',
        width: 14,
        numFmt: '#,##0.00',
      },
      {
        header: 'Estimated Hours',
        key: 'totalEstimatedHours',
        width: 14,
        numFmt: '#,##0.00',
      },
      { header: 'Approved OT Tickets', key: 'approvedOtTickets', width: 18 },
      {
        header: 'Total OT Hours',
        key: 'totalOtHours',
        width: 14,
        numFmt: '#,##0.00',
      },
      {
        header: 'Effective OT Hours',
        key: 'effectiveOtHours',
        width: 16,
        numFmt: '#,##0.00',
      },
      {
        header: 'Completion Rate',
        key: 'completionRate',
        width: 16,
        numFmt: '0.00%',
      },
      {
        header: 'Point Completion Rate',
        key: 'pointCompletionRate',
        width: 18,
        numFmt: '0.00%',
      },
      { header: 'On-Time Rate', key: 'onTimeRate', width: 14, numFmt: '0.00%' },
      {
        header: 'Overdue Rate',
        key: 'overdueRate',
        width: 14,
        numFmt: '0.00%',
      },
      {
        header: 'Performance Score',
        key: 'performanceScore',
        width: 16,
        numFmt: '#,##0.00',
      },
      { header: 'Risk Level', key: 'riskLevel', width: 12 },
    ];
    this.applyColumns(sheet, columns);

    for (const item of items) {
      sheet.addRow({
        ...item,
        completionRate: this.toRatio(item.completionRate),
        pointCompletionRate: this.toRatio(item.pointCompletionRate),
        onTimeRate: this.toRatio(item.onTimeRate),
        overdueRate: this.toRatio(item.overdueRate),
      });
    }

    this.styleHeader(sheet);
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    let row = items.length + 3;

    // Chart 1: Risk level distribution pie
    const riskCounts = this.countBy(items, (i) => i.riskLevel, [
      'low',
      'medium',
      'high',
    ]);
    const riskPie = this.renderPieChart({
      title: 'Project Risk Distribution',
      labels: ['Low Risk', 'Medium Risk', 'High Risk'],
      values: riskCounts,
      colors: ['#10b981', '#f59e0b', '#ef4444'],
      total: items.length,
      totalLabel: 'projects',
    });
    this.embedImage(workbook, sheet, riskPie, row);
    row += 22;

    // Chart 2: Task breakdown per top project (grouped horizontal)
    const top = [...items]
      .sort((a, b) => b.totalAssigned - a.totalAssigned)
      .slice(0, TOP_N);

    const taskBreakdown = this.renderHorizontalBarChart({
      title: `Task Breakdown by Project (Top ${top.length})`,
      labels: top.map((i) => i.projectName),
      series: [
        {
          name: 'Completed',
          color: '#10b981',
          data: top.map((i) => i.completedTasks),
        },
        { name: 'Open', color: '#3b82f6', data: top.map((i) => i.openTasks) },
        {
          name: 'Overdue',
          color: '#ef4444',
          data: top.map((i) => i.overdueTasks),
        },
      ],
      stacked: true,
    });
    this.embedImage(workbook, sheet, taskBreakdown, row);
    row += 22;

    // Chart 3: Completion rate per project
    const completionChart = this.renderHorizontalBarChart({
      title: `Completion Rate by Project (Top ${top.length})`,
      labels: top.map((i) => i.projectName),
      series: [
        {
          name: 'Completion %',
          color: '#6366f1',
          data: top.map((i) => Number(i.completionRate.toFixed(2))),
        },
      ],
      xMax: 100,
      valueSuffix: '%',
    });
    this.embedImage(workbook, sheet, completionChart, row);
    row += 22;

    // Chart 4: OT hours per project
    const otTop = [...items]
      .sort((a, b) => b.totalOtHours - a.totalOtHours)
      .slice(0, TOP_N);
    const otChart = this.renderHorizontalBarChart({
      title: `Total OT Hours by Project (Top ${otTop.length})`,
      labels: otTop.map((i) => i.projectName),
      series: [
        {
          name: 'OT Hours',
          color: '#f97316',
          data: otTop.map((i) => Number(i.totalOtHours.toFixed(2))),
        },
      ],
    });
    this.embedImage(workbook, sheet, otChart, row);
    row += 22;

    // Chart 5: Performance score
    const perfTop = [...items]
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, TOP_N);
    const perfChart = this.renderHorizontalBarChart({
      title: `Performance Score by Project (Top ${perfTop.length})`,
      labels: perfTop.map((i) => i.projectName),
      series: [
        {
          name: 'Performance Score',
          color: '#0ea5e9',
          data: perfTop.map((i) => Number(i.performanceScore.toFixed(2))),
        },
      ],
    });
    this.embedImage(workbook, sheet, perfChart, row);
  }

  private writeMemberKpiSheet(
    workbook: ExcelJS.Workbook,
    items: PeriodicMemberKpiItem[],
  ): void {
    const sheet = workbook.addWorksheet('Member KPI');
    const columns: ColumnDef[] = [
      { header: 'Full Name', key: 'fullName', width: 24 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Projects', key: 'projectCount', width: 12 },
      { header: 'Active Projects', key: 'activeProjectCount', width: 16 },
      { header: 'Total Assigned', key: 'totalAssigned', width: 14 },
      { header: 'Completed', key: 'completedTasks', width: 12 },
      { header: 'Open', key: 'openTasks', width: 10 },
      { header: 'On Time', key: 'onTimeTasks', width: 10 },
      { header: 'Late', key: 'lateTasks', width: 10 },
      { header: 'Overdue', key: 'overdueTasks', width: 10 },
      { header: 'Due Soon', key: 'dueSoonTasks', width: 12 },
      {
        header: 'Estimate Points',
        key: 'totalEstimatePoints',
        width: 14,
        numFmt: '#,##0.00',
      },
      {
        header: 'Actual Points',
        key: 'totalActualPoints',
        width: 14,
        numFmt: '#,##0.00',
      },
      {
        header: 'Estimated Hours',
        key: 'totalEstimatedHours',
        width: 14,
        numFmt: '#,##0.00',
      },
      {
        header: 'Expected Working Hours',
        key: 'expectedWorkingHours',
        width: 20,
        numFmt: '#,##0.00',
      },
      { header: 'Approved OT Tickets', key: 'approvedOtTickets', width: 18 },
      {
        header: 'Total OT Hours',
        key: 'totalOtHours',
        width: 14,
        numFmt: '#,##0.00',
      },
      {
        header: 'Effective OT Hours',
        key: 'effectiveOtHours',
        width: 16,
        numFmt: '#,##0.00',
      },
      {
        header: 'Completion Rate',
        key: 'completionRate',
        width: 16,
        numFmt: '0.00%',
      },
      {
        header: 'Point Completion Rate',
        key: 'pointCompletionRate',
        width: 18,
        numFmt: '0.00%',
      },
      { header: 'On-Time Rate', key: 'onTimeRate', width: 14, numFmt: '0.00%' },
      {
        header: 'Overdue Rate',
        key: 'overdueRate',
        width: 14,
        numFmt: '0.00%',
      },
      {
        header: 'Performance Score',
        key: 'performanceScore',
        width: 16,
        numFmt: '#,##0.00',
      },
    ];
    this.applyColumns(sheet, columns);

    for (const item of items) {
      sheet.addRow({
        ...item,
        email: item.email ?? '',
        completionRate: this.toRatio(item.completionRate),
        pointCompletionRate: this.toRatio(item.pointCompletionRate),
        onTimeRate: this.toRatio(item.onTimeRate),
        overdueRate: this.toRatio(item.overdueRate),
      });
    }

    this.styleHeader(sheet);
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    let row = items.length + 3;

    // Chart 1: Performance score top N
    const topPerf = [...items]
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, TOP_N);
    const perfChart = this.renderHorizontalBarChart({
      title: `Performance Score (Top ${topPerf.length} Members)`,
      labels: topPerf.map((i) => i.fullName),
      series: [
        {
          name: 'Performance Score',
          color: '#0ea5e9',
          data: topPerf.map((i) => Number(i.performanceScore.toFixed(2))),
        },
      ],
    });
    this.embedImage(workbook, sheet, perfChart, row);
    row += 22;

    // Chart 2: Task breakdown per top member
    const topAssigned = [...items]
      .sort((a, b) => b.totalAssigned - a.totalAssigned)
      .slice(0, TOP_N);
    const taskChart = this.renderHorizontalBarChart({
      title: `Task Breakdown by Member (Top ${topAssigned.length})`,
      labels: topAssigned.map((i) => i.fullName),
      series: [
        {
          name: 'Completed',
          color: '#10b981',
          data: topAssigned.map((i) => i.completedTasks),
        },
        {
          name: 'Open',
          color: '#3b82f6',
          data: topAssigned.map((i) => i.openTasks),
        },
        {
          name: 'Overdue',
          color: '#ef4444',
          data: topAssigned.map((i) => i.overdueTasks),
        },
      ],
      stacked: true,
    });
    this.embedImage(workbook, sheet, taskChart, row);
    row += 22;

    // Chart 3: Completion rate
    const completionChart = this.renderHorizontalBarChart({
      title: `Completion Rate (Top ${topPerf.length} Members)`,
      labels: topPerf.map((i) => i.fullName),
      series: [
        {
          name: 'Completion %',
          color: '#6366f1',
          data: topPerf.map((i) => Number(i.completionRate.toFixed(2))),
        },
      ],
      xMax: 100,
      valueSuffix: '%',
    });
    this.embedImage(workbook, sheet, completionChart, row);
    row += 22;

    // Chart 4: Effective OT hours
    const topOt = [...items]
      .sort((a, b) => b.effectiveOtHours - a.effectiveOtHours)
      .slice(0, TOP_N);
    const otChart = this.renderHorizontalBarChart({
      title: `Effective OT Hours (Top ${topOt.length} Members)`,
      labels: topOt.map((i) => i.fullName),
      series: [
        {
          name: 'OT Hours',
          color: '#f59e0b',
          data: topOt.map((i) => Number(i.effectiveOtHours.toFixed(2))),
        },
      ],
    });
    this.embedImage(workbook, sheet, otChart, row);
  }

  // ============== Chart Rendering Engine ==============

  private renderColumnChart(input: {
    title: string;
    yAxisLabel?: string;
    labels: string[];
    series: Series[];
    yMax?: number;
    valueSuffix?: string;
  }): Buffer {
    const canvas = createCanvas(CHART_W, CHART_H);
    const ctx = canvas.getContext('2d');

    this.fillBg(ctx);
    this.drawTitle(ctx, input.title);
    this.drawLegend(
      ctx,
      input.series.map((s) => ({ name: s.name, color: s.color })),
    );

    const padL = 70;
    const padR = 30;
    const padT = 70;
    const padB = 80;
    const plotW = CHART_W - padL - padR;
    const plotH = CHART_H - padT - padB;

    if (this.allZero(input.series)) {
      this.drawNoData(ctx, padL, padT, plotW, plotH);
      return Buffer.from(canvas.toBuffer('image/png'));
    }

    const allValues = input.series.flatMap((s) => s.data);
    const maxVal = input.yMax ?? Math.max(...allValues, 1);

    // Y-axis label
    if (input.yAxisLabel) {
      ctx.save();
      ctx.translate(20, padT + plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#374151';
      ctx.font = fontStr(12);
      ctx.textAlign = 'center';
      ctx.fillText(input.yAxisLabel, 0, 0);
      ctx.restore();
    }

    // Y grid lines + labels
    this.drawYAxisGrid(
      ctx,
      padL,
      padT,
      plotW,
      plotH,
      maxVal,
      5,
      input.valueSuffix,
    );

    const groupCount = input.labels.length;
    const groupW = plotW / groupCount;
    const seriesCount = input.series.length;
    const barW = Math.min((groupW * 0.8) / seriesCount, 80);
    const groupPadding = (groupW - barW * seriesCount) / 2;

    // Bars
    for (let g = 0; g < groupCount; g++) {
      for (let s = 0; s < seriesCount; s++) {
        const value = input.series[s].data[g] ?? 0;
        const h = value > 0 ? (value / maxVal) * plotH : 0;
        const x = padL + g * groupW + groupPadding + s * barW;
        const y = padT + plotH - h;
        ctx.fillStyle = input.series[s].color;
        ctx.fillRect(x, y, barW, h);

        if (value !== 0) {
          ctx.fillStyle = '#111827';
          ctx.font = fontStr(11, true);
          ctx.textAlign = 'center';
          const valText = `${this.formatVal(value)}${input.valueSuffix ?? ''}`;
          ctx.fillText(valText, x + barW / 2, y - 5);
        }
      }

      // X label
      ctx.fillStyle = '#374151';
      ctx.font = fontStr(11);
      ctx.textAlign = 'center';
      ctx.fillText(
        this.truncateLabel(input.labels[g], 16),
        padL + g * groupW + groupW / 2,
        padT + plotH + 18,
      );
    }

    // Axes
    this.drawAxes(ctx, padL, padT, plotW, plotH);

    return Buffer.from(canvas.toBuffer('image/png'));
  }

  private renderHorizontalBarChart(input: {
    title: string;
    labels: string[];
    series: Series[];
    stacked?: boolean;
    xMax?: number;
    valueSuffix?: string;
  }): Buffer {
    const rowCount = input.labels.length;
    const dynamicH = Math.max(CHART_H, 100 + rowCount * 28);
    const canvas = createCanvas(CHART_W, dynamicH);
    const ctx = canvas.getContext('2d');

    this.fillBg(ctx, dynamicH);
    this.drawTitle(ctx, input.title);
    this.drawLegend(
      ctx,
      input.series.map((s) => ({ name: s.name, color: s.color })),
    );

    const padL = 180;
    const padR = 60;
    const padT = 70;
    const padB = 50;
    const plotW = CHART_W - padL - padR;
    const plotH = dynamicH - padT - padB;

    if (this.allZero(input.series)) {
      this.drawNoData(ctx, padL, padT, plotW, plotH);
      return Buffer.from(canvas.toBuffer('image/png'));
    }

    let maxVal: number;
    if (input.xMax !== undefined) {
      maxVal = input.xMax;
    } else if (input.stacked) {
      maxVal = Math.max(
        ...input.labels.map((_, i) =>
          input.series.reduce((sum, s) => sum + (s.data[i] ?? 0), 0),
        ),
        1,
      );
    } else {
      maxVal = Math.max(...input.series.flatMap((s) => s.data), 1);
    }

    // X-axis grid + labels
    const xSteps = 5;
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#6b7280';
    ctx.font = fontStr(10);
    for (let i = 0; i <= xSteps; i++) {
      const xVal = (maxVal * i) / xSteps;
      const xPos = padL + (plotW * i) / xSteps;
      ctx.beginPath();
      ctx.moveTo(xPos, padT);
      ctx.lineTo(xPos, padT + plotH);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillText(
        `${this.formatVal(xVal)}${input.valueSuffix ?? ''}`,
        xPos,
        padT + plotH + 16,
      );
    }

    const rowH = plotH / rowCount;
    const barH = input.stacked
      ? Math.min(rowH * 0.7, 24)
      : Math.min((rowH * 0.8) / input.series.length, 18);

    for (let r = 0; r < rowCount; r++) {
      // Row label
      ctx.fillStyle = '#374151';
      ctx.font = fontStr(11);
      ctx.textAlign = 'right';
      ctx.fillText(
        this.truncateLabel(input.labels[r], 22),
        padL - 8,
        padT + r * rowH + rowH / 2 + 4,
      );

      if (input.stacked) {
        let cursorX = padL;
        const yMid = padT + r * rowH + (rowH - barH) / 2;
        for (let s = 0; s < input.series.length; s++) {
          const value = input.series[s].data[r] ?? 0;
          const segW = (value / maxVal) * plotW;
          if (segW > 0) {
            ctx.fillStyle = input.series[s].color;
            ctx.fillRect(cursorX, yMid, segW, barH);
            if (segW > 30) {
              ctx.fillStyle = '#ffffff';
              ctx.font = fontStr(10, true);
              ctx.textAlign = 'center';
              ctx.fillText(
                this.formatVal(value),
                cursorX + segW / 2,
                yMid + barH / 2 + 4,
              );
            }
            cursorX += segW;
          }
        }
        // Total at end
        const total = input.series.reduce(
          (sum, s) => sum + (s.data[r] ?? 0),
          0,
        );
        if (total > 0) {
          ctx.fillStyle = '#111827';
          ctx.font = fontStr(11, true);
          ctx.textAlign = 'left';
          ctx.fillText(
            `${this.formatVal(total)}${input.valueSuffix ?? ''}`,
            cursorX + 6,
            yMid + barH / 2 + 4,
          );
        }
      } else {
        for (let s = 0; s < input.series.length; s++) {
          const value = input.series[s].data[r] ?? 0;
          const segW = value > 0 ? (value / maxVal) * plotW : 0;
          const yPos =
            padT +
            r * rowH +
            (rowH - barH * input.series.length) / 2 +
            s * barH;
          ctx.fillStyle = input.series[s].color;
          ctx.fillRect(padL, yPos, segW, barH);
          if (value !== 0) {
            ctx.fillStyle = '#111827';
            ctx.font = fontStr(10, true);
            ctx.textAlign = 'left';
            ctx.fillText(
              `${this.formatVal(value)}${input.valueSuffix ?? ''}`,
              padL + segW + 5,
              yPos + barH / 2 + 4,
            );
          }
        }
      }
    }

    this.drawAxes(ctx, padL, padT, plotW, plotH);

    return Buffer.from(canvas.toBuffer('image/png'));
  }

  private renderPieChart(input: {
    title: string;
    labels: string[];
    values: number[];
    colors: string[];
    total?: number;
    totalLabel?: string;
  }): Buffer {
    const canvas = createCanvas(CHART_W, CHART_H);
    const ctx = canvas.getContext('2d');

    this.fillBg(ctx);
    this.drawTitle(ctx, input.title);

    const sum = input.values.reduce((a, b) => a + b, 0);
    const padT = 70;

    if (sum <= 0) {
      this.drawNoData(ctx, 0, padT, CHART_W, CHART_H - padT - 30);
      return Buffer.from(canvas.toBuffer('image/png'));
    }

    const cx = CHART_W / 3;
    const cy = padT + (CHART_H - padT - 40) / 2;
    const radius = Math.min(cx, cy - padT) - 10;

    let startAngle = -Math.PI / 2;
    for (let i = 0; i < input.values.length; i++) {
      const v = input.values[i];
      if (v <= 0) continue;
      const slice = (v / sum) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, startAngle + slice);
      ctx.closePath();
      ctx.fillStyle = input.colors[i] ?? PALETTE[i % PALETTE.length];
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Percent label inside slice
      const midAngle = startAngle + slice / 2;
      const labelR = radius * 0.65;
      const lx = cx + Math.cos(midAngle) * labelR;
      const ly = cy + Math.sin(midAngle) * labelR;
      const pct = ((v / sum) * 100).toFixed(1);
      if (slice > 0.25) {
        ctx.fillStyle = '#ffffff';
        ctx.font = fontStr(13, true);
        ctx.textAlign = 'center';
        ctx.fillText(`${pct}%`, lx, ly + 4);
      }

      startAngle += slice;
    }

    // Legend on the right with values
    const legendX = CHART_W * 0.55;
    let legendY = padT + 10;
    ctx.font = fontStr(13);
    for (let i = 0; i < input.labels.length; i++) {
      const v = input.values[i];
      const pct = sum > 0 ? ((v / sum) * 100).toFixed(1) : '0.0';
      ctx.fillStyle = input.colors[i] ?? PALETTE[i % PALETTE.length];
      ctx.fillRect(legendX, legendY, 16, 16);
      ctx.fillStyle = '#111827';
      ctx.textAlign = 'left';
      ctx.fillText(
        `${input.labels[i]}: ${this.formatVal(v)} (${pct}%)`,
        legendX + 22,
        legendY + 13,
      );
      legendY += 26;
    }

    if (input.total !== undefined) {
      ctx.fillStyle = '#111827';
      ctx.font = fontStr(14, true);
      ctx.textAlign = 'center';
      ctx.fillText(
        `Total: ${this.formatVal(input.total)} ${input.totalLabel ?? ''}`,
        cx,
        cy + radius + 30,
      );
    }

    return Buffer.from(canvas.toBuffer('image/png'));
  }

  // ============== Drawing primitives ==============

  private fillBg(ctx: SKRSContext2D, height: number = CHART_H): void {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CHART_W, height);
  }

  private drawTitle(ctx: SKRSContext2D, title: string): void {
    ctx.fillStyle = '#111827';
    ctx.font = fontStr(18, true);
    ctx.textAlign = 'center';
    ctx.fillText(title, CHART_W / 2, 30);
  }

  private drawLegend(
    ctx: SKRSContext2D,
    items: Array<{ name: string; color: string }>,
  ): void {
    if (items.length === 0) return;
    const itemW = 140;
    const totalW = items.length * itemW;
    let x = (CHART_W - totalW) / 2;
    const y = 50;
    ctx.font = fontStr(12);
    for (const item of items) {
      ctx.fillStyle = item.color;
      ctx.fillRect(x, y, 14, 14);
      ctx.fillStyle = '#374151';
      ctx.textAlign = 'left';
      ctx.fillText(item.name, x + 20, y + 12);
      x += itemW;
    }
  }

  private drawYAxisGrid(
    ctx: SKRSContext2D,
    padL: number,
    padT: number,
    plotW: number,
    plotH: number,
    maxVal: number,
    steps: number,
    suffix?: string,
  ): void {
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#6b7280';
    ctx.font = fontStr(10);
    for (let i = 0; i <= steps; i++) {
      const yVal = (maxVal * i) / steps;
      const yPos = padT + plotH - (plotH * i) / steps;
      ctx.beginPath();
      ctx.moveTo(padL, yPos);
      ctx.lineTo(padL + plotW, yPos);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(
        `${this.formatVal(yVal)}${suffix ?? ''}`,
        padL - 6,
        yPos + 4,
      );
    }
  }

  private drawAxes(
    ctx: SKRSContext2D,
    padL: number,
    padT: number,
    plotW: number,
    plotH: number,
  ): void {
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + plotH);
    ctx.lineTo(padL + plotW, padT + plotH);
    ctx.stroke();
  }

  private drawNoData(
    ctx: SKRSContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#d1d5db';
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
    ctx.fillStyle = '#9ca3af';
    ctx.font = italicFontStr(16);
    ctx.textAlign = 'center';
    ctx.fillText('No data available for this period', x + w / 2, y + h / 2);
  }

  // ============== Utilities ==============

  private allZero(series: Series[]): boolean {
    return series.every((s) => s.data.every((v) => !v || v === 0));
  }

  private clampPercent(v: number): number {
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(100, v));
  }

  private formatVal(v: number): string {
    if (!Number.isFinite(v)) return '0';
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
    if (Number.isInteger(v)) return String(v);
    return v.toFixed(2);
  }

  private truncateLabel(label: string, maxLen: number): string {
    if (!label) return '';
    if (label.length <= maxLen) return label;
    return `${label.slice(0, Math.max(0, maxLen - 3))}...`;
  }

  private countBy<T>(
    items: T[],
    keyFn: (item: T) => string,
    keys: string[],
  ): number[] {
    const counts = new Map<string, number>();
    for (const k of keys) counts.set(k, 0);
    for (const item of items) {
      const k = keyFn(item);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return keys.map((k) => counts.get(k) ?? 0);
  }

  private applyColumns(sheet: ExcelJS.Worksheet, columns: ColumnDef[]): void {
    sheet.columns = columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width,
      style: col.numFmt ? { numFmt: col.numFmt } : undefined,
    }));
  }

  private styleHeader(sheet: ExcelJS.Worksheet): void {
    const header = sheet.getRow(1);
    header.font = { bold: true };
    header.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' },
    };
    header.alignment = { vertical: 'middle', horizontal: 'left' };
  }

  private toRatio(percent: number): number {
    if (!Number.isFinite(percent) || percent === 0) return 0;
    return percent / 100;
  }

  private embedImage(
    workbook: ExcelJS.Workbook,
    sheet: ExcelJS.Worksheet,
    buffer: Buffer,
    rowAnchor: number,
  ): void {
    const imageId = workbook.addImage({
      buffer: buffer as unknown as ExcelJS.Buffer,
      extension: 'png',
    });
    sheet.addImage(imageId, {
      tl: { col: 0, row: rowAnchor },
      ext: { width: CHART_W, height: CHART_H },
    });
  }
}

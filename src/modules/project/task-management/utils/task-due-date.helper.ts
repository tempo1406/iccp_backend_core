const DATE_ONLY_TIME_SQL = "time '00:00:00'";
const DAY_MS = 24 * 60 * 60 * 1000;

export function buildTaskDueCutoffSql(alias = 'task'): string {
  return `(CASE WHEN ${alias}.due_date::time = ${DATE_ONLY_TIME_SQL} THEN ${alias}.due_date + interval '1 day' ELSE ${alias}.due_date END)`;
}

export function buildTaskDoneOnTimeSql(alias = 'task'): string {
  return `(
    (${alias}.due_date::time = ${DATE_ONLY_TIME_SQL} AND ${alias}.completed_at < ${alias}.due_date + interval '1 day')
    OR (${alias}.due_date::time <> ${DATE_ONLY_TIME_SQL} AND ${alias}.completed_at <= ${alias}.due_date)
  )`;
}

export function buildTaskDoneLateSql(alias = 'task'): string {
  return `(
    (${alias}.due_date::time = ${DATE_ONLY_TIME_SQL} AND ${alias}.completed_at >= ${alias}.due_date + interval '1 day')
    OR (${alias}.due_date::time <> ${DATE_ONLY_TIME_SQL} AND ${alias}.completed_at > ${alias}.due_date)
  )`;
}

export function buildTaskDuePassedSql(
  alias = 'task',
  nowParam = ':now',
): string {
  return `(
    (${alias}.due_date::time = ${DATE_ONLY_TIME_SQL} AND ${alias}.due_date + interval '1 day' <= ${nowParam})
    OR (${alias}.due_date::time <> ${DATE_ONLY_TIME_SQL} AND ${alias}.due_date < ${nowParam})
  )`;
}

export function buildTaskDueSoonSql(
  alias = 'task',
  nowParam = ':now',
  dueSoonParam = ':dueSoonAt',
): string {
  const cutoff = buildTaskDueCutoffSql(alias);
  return `${cutoff} >= ${nowParam} AND ${cutoff} <= ${dueSoonParam}`;
}

export function buildTaskDueAfterSql(
  alias = 'task',
  dueSoonParam = ':dueSoonAt',
): string {
  return `${buildTaskDueCutoffSql(alias)} > ${dueSoonParam}`;
}

export function isDateOnlyDueDate(dueDate: Date): boolean {
  return (
    dueDate.getHours() === 0 &&
    dueDate.getMinutes() === 0 &&
    dueDate.getSeconds() === 0 &&
    dueDate.getMilliseconds() === 0
  );
}

export function resolveTaskDueCutoff(dueDate: Date): Date {
  if (!isDateOnlyDueDate(dueDate)) {
    return dueDate;
  }

  return new Date(dueDate.getTime() + DAY_MS);
}

export function isTaskCompletedOnTime(
  completedAt: Date,
  dueDate: Date,
): boolean {
  const cutoff = resolveTaskDueCutoff(dueDate);
  return isDateOnlyDueDate(dueDate)
    ? completedAt.getTime() < cutoff.getTime()
    : completedAt.getTime() <= cutoff.getTime();
}

export function isTaskDuePassed(dueDate: Date, now: Date | number): boolean {
  const nowMs = typeof now === 'number' ? now : now.getTime();
  const cutoff = resolveTaskDueCutoff(dueDate);
  return isDateOnlyDueDate(dueDate)
    ? cutoff.getTime() <= nowMs
    : cutoff.getTime() < nowMs;
}

export function localDateTime(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')),
    minute: Number(get('minute')),
  };
}

export function dueRunDates(
  cadence: 'daily' | 'weekly',
  runTime: string,
  weeklyRunDay: number | null,
  lastRunLocalDate: string | null,
  now: Date,
  timeZone: string,
) {
  const localNow = localDateTime(now, timeZone);
  const [runHour, runMinute] = runTime.split(':').map(Number);
  const today = new Date(`${localNow.date}T00:00:00.000Z`);
  const dates: string[] = [];
  const cursor = lastRunLocalDate
    ? new Date(`${lastRunLocalDate}T00:00:00.000Z`)
    : new Date(today.getTime() - 86_400_000);

  for (let day = new Date(cursor.getTime() + 86_400_000); day <= today; day = new Date(day.getTime() + 86_400_000)) {
    const date = day.toISOString().slice(0, 10);
    if (cadence === 'weekly' && day.getUTCDay() !== weeklyRunDay) continue;
    if (date === localNow.date && (localNow.hour < runHour || (localNow.hour === runHour && localNow.minute < runMinute))) {
      continue;
    }
    dates.push(date);
  }
  return dates;
}

export function followingWeekDates(runDate: string) {
  const date = new Date(`${runDate}T00:00:00.000Z`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  const monday = new Date(date.getTime() + (7 - mondayOffset) * 86_400_000);
  return Array.from({ length: 7 }, (_, index) =>
    new Date(monday.getTime() + index * 86_400_000).toISOString().slice(0, 10),
  );
}

export function validateTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

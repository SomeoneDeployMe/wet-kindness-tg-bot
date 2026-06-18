export function getMoscowHour(): number {
  const hourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Moscow',
    hour: 'numeric',
    hour12: false,
  }).format(new Date());

  return Number.parseInt(hourStr, 10);
}

export function getMoscowDateLine(): string {
  const now = new Date();
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Moscow',
    weekday: 'long',
  }).format(now);

  return `Today's date (Europe/Moscow): ${date} (${weekday}).`;
}

export function isWithinMoscowWindow(
  startHour: number,
  endHour: number
): boolean {
  const hour = getMoscowHour();

  return hour >= startHour && hour <= endHour;
}

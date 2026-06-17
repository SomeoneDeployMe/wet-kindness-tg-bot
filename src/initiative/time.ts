export function getMoscowHour(): number {
  const hourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Moscow',
    hour: 'numeric',
    hour12: false,
  }).format(new Date());

  return Number.parseInt(hourStr, 10);
}

export function isWithinMoscowWindow(
  startHour: number,
  endHour: number
): boolean {
  const hour = getMoscowHour();

  return hour >= startHour && hour <= endHour;
}

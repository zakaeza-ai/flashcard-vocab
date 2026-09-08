export function todayStr() {
  const d = new Date();
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

export function daysBetween(a, b) {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db - da) / 86400000);
}

export const TARGET_DAYS = 365;

export function currentDayIndex(startDate) {
  const n = daysBetween(startDate, todayStr()) + 1;
  return Math.min(Math.max(n, 1), TARGET_DAYS);
}

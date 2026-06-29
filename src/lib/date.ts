export function todayKey() {
  return dateKey(new Date());
}

export function addDays(baseDateKey: string, days: number) {
  const date = new Date(`${baseDateKey}T00:00:00`);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

export function weekDates(baseDateKey: string) {
  const date = new Date(`${baseDateKey}T00:00:00`);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return Array.from({ length: 7 }, (_, index) => addDays(baseDateKey, mondayOffset + index));
}

export function monthDates(baseDateKey: string) {
  const date = new Date(`${baseDateKey}T00:00:00`);
  const year = date.getFullYear();
  const month = date.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: lastDay }, (_, index) => dateKey(new Date(year, month, index + 1)));
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function koreanDate(dateKey: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${dateKey}T00:00:00`));
}

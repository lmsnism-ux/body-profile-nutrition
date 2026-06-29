export function todayKey() {
  return dateKey(new Date());
}

export function addDays(baseDateKey: string, days: number) {
  const date = new Date(`${baseDateKey}T00:00:00`);
  date.setDate(date.getDate() + days);
  return dateKey(date);
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

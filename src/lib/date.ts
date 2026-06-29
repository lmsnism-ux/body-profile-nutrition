export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function koreanDate(dateKey: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${dateKey}T00:00:00`));
}

export default function getBuildTime(): string {
  const d = new Date();

  const pad = (n: number) => String(n).padStart(2, "0");

  const date =
    `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";

  const hh = pad(Math.floor(Math.abs(offset) / 60));
  const mm = pad(Math.abs(offset) % 60);

  return `${date} UTC${sign}${hh}:${mm}`;
}

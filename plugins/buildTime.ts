export function formatBuildTime(): string {
    const date = new Date();

    const formatter = new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });

    const formatted = formatter.format(date);

    const offsetMinutes = -date.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const hours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(
        2,
        '0',
    );
    const minutes = String(Math.abs(offsetMinutes) % 60).padStart(2, '0');

    return `${formatted} UTC${sign}${hours}:${minutes}`;
}

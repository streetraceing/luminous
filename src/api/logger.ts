type LoggerLevel = "INFO" | "WARN" | "ERROR";
type LoggerChannel = "Main" | "Background" | "Canvas" | "Song";

export class Logger {
  private static disabledLevels = new Set<LoggerLevel>();
  private static disabledChannels = new Set<LoggerChannel>();

  private static levelStyles: Record<LoggerLevel, string> = {
    INFO: "color:#ccc",
    WARN: "color:#facc15",
    ERROR: "color:#ef4444",
  };

  private static channelStyles: Record<LoggerChannel, string> = {
    Main: "color:#d6d6d6",
    Background: "color:#60a5fa",
    Canvas: "color:#a78bfa",
    Song: "color:#34d399"
  };

  private static baseStyle = "color:#888";

  private static getTime(): string {
    return new Date().toLocaleTimeString("en-GB", { hour12: false });
  }

  private static shouldLog(level: LoggerLevel, channel: LoggerChannel) {
    return (
      !this.disabledLevels.has(level) && !this.disabledChannels.has(channel)
    );
  }

  private static format(channel: LoggerChannel) {
    return `Luminous/${channel}`;
  }

  static log(level: LoggerLevel, channel: LoggerChannel, ...data: any[]) {
    if (!this.shouldLog(level, channel)) return;

    console.log(
      `%c[${this.getTime()}] %c[${level}] %c[${this.format(channel)}]`,
      this.baseStyle,
      this.levelStyles[level],
      this.channelStyles[channel],
      ...data,
    );
  }

  static info(channel: LoggerChannel, ...data: any[]) {
    this.log("INFO", channel, ...data);
  }

  static warn(channel: LoggerChannel, ...data: any[]) {
    this.log("WARN", channel, ...data);
  }

  static error(channel: LoggerChannel, ...data: any[]) {
    this.log("ERROR", channel, ...data);
  }

  static enableLevel(level: LoggerLevel) {
    this.disabledLevels.delete(level);
  }

  static disableLevel(level: LoggerLevel) {
    this.disabledLevels.add(level);
  }

  static enableChannel(channel: LoggerChannel) {
    this.disabledChannels.delete(channel);
  }

  static disableChannel(channel: LoggerChannel) {
    this.disabledChannels.add(channel);
  }

  static printBanner() {
    console.log(
      `%c Luminous v${__APP_VERSION__} %c by ${__APP_AUTHOR__} `,
      "background:#1DB954;color:#000;padding:6px 12px;border-radius:8px 0 0 8px;font-weight:600;",
      "background:#181818;color:#1DB954;padding:6px 12px;border-radius:0 8px 8px 0;font-weight:500;",
    );

    console.log(`%c build: ${__BUILD_TIME__} `, "color:#888;font-size:12px;");
  }
}

type LoggerModule = 'Main' | 'BackgroundRenderer';

export class Logger {
    private static getTitle(module: LoggerModule = 'Main') {
        return `Luminous/${module}`;
    }

    private static getTime(): string {
        return new Date().toLocaleTimeString('en-GB', { hour12: false });
    }

    static info(message: string, module: LoggerModule = 'Main') {
        console.log(
            `[${Logger.getTime()}] [INFO] [${Logger.getTitle(module)}] ${message}`,
        );
    }

    static warn(message: string, module: LoggerModule = 'Main') {
        console.warn(
            `[${Logger.getTime()}] [WARN] [${Logger.getTitle(module)}] ${message}`,
        );
    }

    static error(message: string, module: LoggerModule = 'Main') {
        console.error(
            `[${Logger.getTime()}] [ERROR] [${Logger.getTitle(module)}] ${message}`,
        );
    }
}

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

export function printBanner() {
    const buildDate = new Date(__BUILD_TIME__).toLocaleString('en-GB', {
        hour12: false,
    });

    console.log(
        `%c Luminous v${__APP_VERSION__} %c by ${__APP_AUTHOR__} `,
        'background:#1DB954;color:#000;padding:6px 12px;border-radius:8px 0 0 8px;font-weight:600;',
        'background:#181818;color:#1DB954;padding:6px 12px;border-radius:0 8px 8px 0;font-weight:500;',
    );

    console.log(`%c build: ${buildDate} `, 'color:#888;font-size:12px;');
}

export function logInitComplete(duration: string) {
    console.log(
        `%c Luminous %c ready in ${duration}ms `,
        'background:#1DB954;color:#000;padding:4px 8px;border-radius:6px;font-weight:600;',
        'color:#1DB954;font-weight:500;',
    );
}

declare module 'node-statsd' {

    interface StatsDOptions {
        host?: string;
        port?: number;
        prefix?: string;
        suffix?: string;
        globalize?: boolean;
        cacheDns?: boolean;
        mock?: boolean;
        globalTags?: string[];
    }

    interface StatsD {
        increment(stat: string | string[], value?: number, sampleRate?: number, tags?: string[]): void;
        decrement(stat: string | string[], value?: number, sampleRate?: number, tags?: string[]): void;
        timing(stat: string | string[], time: number, sampleRate?: number, tags?: string[]): void;
        gauge(stat: string | string[], value: number, sampleRate?: number, tags?: string[]): void;
        histogram(stat: string | string[], value: number, sampleRate?: number, tags?: string[]): void;
        set(stat: string | string[], value: number, sampleRate?: number, tags?: string[]): void;
        unique(stat: string | string[], value: number, sampleRate?: number, tags?: string[]): void;

        socket?: {
            on: (event: string, callback: (...args: any[]) => void) => void;
        }
    }

    class StatsD {
        constructor(options?: StatsDOptions);
    }

    export = StatsD;
}
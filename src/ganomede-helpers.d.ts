declare module 'ganomede-helpers' {
    export namespace Notification {
        export function sendFn(version: number): (notification: any, callback: (err: Error | null) => void) => void;
    }

    export class Chat {
        constructor(ndata: any);
        sendFn(version: number): (chat: any, callback: (err: Error | null) => void) => void;
        static logError(format: any, ...params: any[]): void;
    }

    export namespace restify {
        export namespace middlewares {
            export namespace authdb {
                export function create(options: { authdbClient: any, secret: string }): (req: any, res: any, next: any) => void;
            }
        }
    }
}
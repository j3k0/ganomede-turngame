import bunyan from "bunyan";

export const log = bunyan.createLogger({ name: "turngame" });

// export class ElasticLogger {
//   log: typeof log;
//   error: typeof log.error;
//   warning: typeof log.warn;
//   info: typeof log.info;
//   debug: typeof log.debug;

//   constructor(config: any) {
//     this.log = log;
//     this.error = log.error.bind(log);
//     this.warning = log.warn.bind(log);
//     this.info = log.info.bind(log);
//     this.debug = log.debug.bind(log);
//   }

//   trace(method: string, requestUrl: string, body: any, responseBody: any, responseStatus: number) {
//     log.trace({
//       method: method,
//       requestUrl: requestUrl,
//       body: body,
//       responseBody: responseBody,
//       responseStatus: responseStatus,
//     });
//   }

//   // bunyan's loggers do not need to be closed
//   close() {
//     return undefined;
//   }
// }
// log.ElasticLogger = ElasticLogger;

export default log;


'use strict';

import * as restify from 'restify';
import logger from './log';
import config from './config';
import sendAuditStats from './send-audit-stats';

interface RequestWithGanomede extends restify.Request {
  _id?: string;
}

const setRequestId = (req: RequestWithGanomede, res: restify.Response, next: restify.Next): void => {
  res.setHeader('x-request-id', req.id());
  req.log = req.log.child({ req_id: req.id() });
  next();
};

const shouldLogRequest = (req: restify.Request): boolean =>
  req.url?.indexOf(`${config.http.prefix}/ping/_health_check`) !== 0;

const shouldLogResponse = (res: restify.Response): boolean =>
  (res && res.statusCode >= 500);

const filteredLogger = (errorsOnly: boolean, logger: (req: restify.Request, res: restify.Response) => void) => 
  (req: restify.Request, res: restify.Response, next: restify.Next): void => {
    const logError = errorsOnly && shouldLogResponse(res);
    const logInfo = !errorsOnly && (shouldLogRequest(req) || shouldLogResponse(res));
    if (logError || logInfo) logger(req, res);
    if (next && typeof next === 'function') next();
  };

const requestLogger = filteredLogger(false, (req: restify.Request) =>
  req.log.info({ req_id: req.id() }, `${req.method} ${req.url}`));

const createServer = (): restify.Server => {
  const server = restify.createServer({
    handleUncaughtExceptions: true,
    log: logger
  });

  server.use(setRequestId);
  server.use(requestLogger);
  server.use(restify.plugins.queryParser());
  server.use(restify.plugins.bodyParser());
  // server.use(initReqGanomede);

  server.on('after', sendAuditStats);
  server.on('after', filteredLogger(process.env.NODE_ENV === 'production',
    restify.plugins.auditLogger({ log: logger, body: true, event: 'after' })));

  return server;
};

export { createServer };

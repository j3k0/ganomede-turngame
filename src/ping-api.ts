import { Request, Response, Next, Server } from 'restify';

export function ping (req: Request, res: Response, next: Next): void  {
  res.send("pong/" + req.params.token);
  next();
};

export function addRoutes (prefix: string, server: Server): void {
  server.get(`/${prefix}/ping/:token`, ping);
  server.head(`/${prefix}/ping/:token`, ping);
};

export default { addRoutes };

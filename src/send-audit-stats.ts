// A restify server.on('after', ...) handler
//
// Will send requests statistics to a statsd server

'use strict';

import { Request, Response, Next } from 'restify';
import StatsD from './statsd-wrapper';

const stats = StatsD.createClient();

const cleanupStatsKey = (key: string): string => key.replace(/[-.]/g, '_').toLowerCase();

const sendAuditStats = (req: Request, res: Response, next: Next): void => {
  // send number of calls to this route (with response status code) with 10% sampling
  const routeName = 'route.' + (req.getRoute?.()?.name || 'invalid_route');
  stats.increment(routeName + '.status.' + res.statusCode, 1, 0.1);

  /*
  // send error statuses (with response status code) with 10% sampling
  if (res._body && res._body.restCode) {
    stats.increment(routeName + '.code.' + cleanupStatsKey(res._body.restCode), 1, 0.1);
  }

  // send timings with 1% sampling
  (req.timers || []).forEach((timer: { time: [number, number]; name: string }) => {
    const t = timer.time;
    const n = cleanupStatsKey(timer.name);
    stats.timing(routeName + '.timers.' + n, 1000000000 * t[0] + t[1], 0.01);
  });
  */

  if (typeof next === 'function') {
    next();
  }
};

export default sendAuditStats;

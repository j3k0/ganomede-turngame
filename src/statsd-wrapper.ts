'use strict';

import logMod from './log';
import StatsD from 'node-statsd';

interface DummyClient {
  increment: () => void;
  timing: () => void;
  decrement: () => void;
  histogram: () => void;
  gauge: () => void;
  set: () => void;
  unique: () => void;
}

const dummyClient = (): DummyClient => {
  return {
    increment: () => {},
    timing: () => {},
    decrement: () => {},
    histogram: () => {},
    gauge: () => {},
    set: () => {},
    unique: () => {}
  };
};

const requiredEnv = ['STATSD_HOST', 'STATSD_PORT', 'STATSD_PREFIX'];

const missingEnv = (): string | undefined => requiredEnv.find((e) => !process.env[e]);

const createClient = (logArg?: any): StatsD | DummyClient => {
  const log = logArg || logMod.child({ module: 'statsd' });
  const missing = missingEnv();
  if (missing) {
    log.warn(`Can't initialize statsd, missing env: ${missing}`);
    return dummyClient();
  }
  const client = new StatsD({
    host: process.env.STATSD_HOST,
    port: Number(process.env.STATSD_PORT),
    prefix: process.env.STATSD_PREFIX
  });
  client.socket?.on('error', (error: Error) => log.error('error in socket', error));
  return client;
};

export default { createClient, dummyClient };

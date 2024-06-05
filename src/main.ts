import log from "./log";
import aboutApi from "./about-api";
import pingApi from "./ping-api";
import turngameApi from './turngame';

type Server = any; // Replace with the actual type of your server

const addRoutes = (prefix: string, server: Server): void => {
  log.info(`adding routes to ${prefix}`);

  // Platform Availability
  pingApi.addRoutes(prefix, server);

  // About
  aboutApi.addRoutes(prefix, server);

  // Turngame
  const turngame = turngameApi();
  turngame(prefix, server);
};

const initialize = (callback?: () => void): void => {
  log.info("initializing backend");
  if (callback) callback();
};

const destroy = (): void => {
  log.info("destroying backend");
};

export default {
  initialize,
  destroy,
  addRoutes,
  log
};

// vim: ts=2:sw=2:et:


'use strict';

var pkg = require("./package.json");

module.exports = {
  port: +process.env.PORT || 8000,
  routePrefix: process.env.ROUTE_PREFIX || pkg.api,

  http: {
    port: +process.env.PORT || 8000,
    prefix: process.env.ROUTE_PREFIX || pkg.api,
  },

  apiSecret: process.env.hasOwnProperty('API_SECRET') && process.env.API_SECRET
    ? process.env.API_SECRET
    : null,

  chat: {
    host: process.env.CHAT_PORT_8080_TCP_ADDR || null,
    port: +process.env.CHAT_PORT_8080_TCP_PORT || 0
  },

  rules: {
    host: process.env.RULES_PORT_8080_TCP_ADDR || 'localhost',
    port: +process.env.RULES_PORT_8080_TCP_PORT || 8080
  },

  authdb: {
    host: process.env.REDIS_AUTH_PORT_6379_TCP_ADDR || 'localhost',
    port: +process.env.REDIS_AUTH_PORT_6379_TCP_PORT || 6379
  },

  redis: {
    host: process.env.REDIS_GAMES_PORT_6379_TCP_ADDR || 'localhost',
    port: +process.env.REDIS_GAMES_PORT_6379_TCP_PORT || 6379,
    prefix: pkg.api
  },

  notifyFullState: !!process.env.NOTIFY_FULL_STATE
// COUCH_GAMES_PORT_5984_TCP_ADDR - IP of the games couchdb
// COUCH_GAMES_PORT_5984_TCP_PORT
};

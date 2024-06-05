// Prevent creating new objects on each move

import restify from 'restify';
import RulesClient from './rules-client';
import config from '../config';
import urllib from 'url';
import axios from 'axios';

interface RulesClients {
  [key: string]: RulesClient;
}

const _rulesClients: RulesClients = {};

function rulesClients(type: string) {
  let ret = _rulesClients[type];
  if (ret) {
    return ret;
  }
  const axiosInstance = axios.create({
    baseURL: urllib.format({
      protocol: 'http',
      hostname: config.rules.host,
      port: config.rules.port,
      pathname: type,
    }),
  });
  return _rulesClients[type] = new RulesClient(axiosInstance);
}

export default rulesClients;

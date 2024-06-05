import axios from 'axios';
import ServiceEnv from './service-env';
import log from '../log';

export interface NotificationData {
  from: string;
  to: string;
  type: string;
  data?: any;
  push?: any;
  secret?: string;
}

export class Notification {
  static REQUIRED_KEYS: ['from', 'to', 'type'] = ['from', 'to', 'type'];
  static OPTIONAL_KEYS: ['data', 'push', 'secret'] = ['data', 'push', 'secret'];
  static SERVERSIDE_KEYS = ['id', 'timestamp'];

  from: string;
  to: string;
  type: string;
  data?: any;
  push?: any;
  secret?: string;

  constructor(options: NotificationData) {
    for (const key of Notification.REQUIRED_KEYS) {
      if (!options.hasOwnProperty(key)) {
        throw new Error(`Required key missing: \`${key}\``);
      }
    }
    this.from = options.from;
    this.to = options.to;
    this.type = options.type;

    for (const key of Notification.OPTIONAL_KEYS) {
      const keyAllowed = options.hasOwnProperty(key) &&
        Notification.SERVERSIDE_KEYS.indexOf(key) === -1;

      if (keyAllowed) {
        this[key] = options[key];
      }
    }
  }

  static async send(uri: string, notification: any, callback?: (err: any, res?: any) => void) {
    if (!notification.hasOwnProperty('secret')) {
      notification.secret = process.env.API_SECRET;
    }

    try {
      const response = await axios.post(uri, notification);
      if (callback) {
        process.nextTick(() => callback(null, response.data));
      }
    } catch (err: any) {
      log.warn({
        err: err,
        uri: uri,
        notification: notification,
        response: err.response ? err.response.data : undefined
      }, "Notification.send() failed:");
      if (callback) {
        process.nextTick(() => callback(err));
      }
    }
  }

  // If process.env has variables with NOTIFICATIONS service address,
  // returns Notification.send() bound to that address. Otherwise throws
  // an error or returns noop depending on @noopIfNotFound argument.
  //
  // Example:
  //   sendNotification = Notification.sendFn()
  //   // now you can use `sendNotification(notification, callback)` in your code:
  //   sendNotification(new Notification(...))
  //
  static sendFn(noopIfNotFound?: boolean) {
    if (!ServiceEnv.exists('NOTIFICATIONS', 8080)) {
      if (!noopIfNotFound) {
        throw new Error("Notification.sendFn() failed to find NOTIFICATIONS service address in environment variables");
      }

      // noop
      return (notification: any, callback?: (err: any, res?: any) => void) => {
        if (callback) {
          callback(null);
        }
      };
    }

    const baseURL = ServiceEnv.url('NOTIFICATIONS', 8080);
    const url = `${baseURL}/notifications/v1/messages`;
    return (notification: any, callback?: (err: any, res?: any) => void) => {
      Notification.send(url, notification, callback);
    };
  }
}

export default Notification;

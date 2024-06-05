import axios from 'axios';
import ServiceEnv from './service-env';
import log from '../log';

class Chat {
  private static REQUIRED_KEYS = ['users', 'type', 'message', 'timestamp'];
  private static logError = log.error.bind(log);

  users: string[];
  type: string;
  message: string;
  timestamp: string;

  /**
   * Constructs a new Chat instance.
   * @param options - The options to initialize the Chat instance.
   * @throws Will throw an error if a required key is missing.
   */
  constructor(options: { users: string[], type: string, message: string, timestamp: string }) {
    for (const key of Chat.REQUIRED_KEYS) {
      if (!options.hasOwnProperty(key)) {
        throw new Error(`Required key missing: \`${key}\``);
      }
    }
    this.users = options.users;
    this.type = options.type;
    this.message = options.message;
    this.timestamp = options.timestamp;
  }

  /**
   * Sends a chat message to the specified URI.
   * @param uri - The URI to send the chat message to.
   * @param chat - The chat message to send.
   * @param callback - The callback to execute after the request completes.
   */
  static async send(uri: string, chat: any, callback: (err: any, res?: any) => void) {
    try {
      const response = await axios.post(uri, chat);
      callback(null, response.data);
    } catch (err: any) {
      Chat.logError("Chat.send() failed", {
        err,
        uri,
        chat,
        response: err.response ? err.response.data : undefined
      });
      callback(err);
    }
  }

  /**
   * Returns a function to send chat messages to the CHAT service address.
   *
   * If process.env has variables with CHAT service address,
   * returns Chat.send() bound to that address. Otherwise throws
   * an error or returns noop depending on @noopIfNotFound argument.
   *
   * @example
   *   const sendChat = Chat.sendFn()
   *   # now you can use `sendChat(chat, callback)` in your code:
   *   sendChat(new Chat(...))
   * 
   * @param noopIfNotFound - If true, returns a no-op function if the CHAT service address is not found.
   * @returns A function to send chat messages or a no-op function.
   * @throws Will throw an error if the CHAT service address is not found and noopIfNotFound is false.
   */
  static sendFn(noopIfNotFound?: boolean) {
    if (!ServiceEnv.exists('CHAT', 8080)) {
      if (!noopIfNotFound) {
        throw new Error("Chat.sendFn() failed to find CHAT service address in environment variables");
      }

      // No-op function
      const noop = (...args: any[]) => {
        const callback = args[args.length - 1];
        if (typeof callback === 'function') {
          callback(null);
        }
      };
      noop.fname = "noop";
      noop.details = "Failed to find CHAT service address in environment variables";
      return noop;
    }

    const baseURL = ServiceEnv.url('CHAT', 8080);
    const url = `${baseURL}/chat/v1/auth/${process.env.API_SECRET}/system-messages`;
    const ret = (chat: any, callback: (err: any, res?: any) => void) => {
      Chat.send(url, chat, callback);
    };
    ret.fname = "send";
    ret.details = `Send to ${url}`;
    return ret;
  }
}

export default Chat;

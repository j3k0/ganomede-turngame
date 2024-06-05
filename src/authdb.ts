'use strict';

/**
 * const authdb = require("authdb");
 * 
 * const client = authdb.createClient({
 *     host: "127.0.0.1",
 *     port: 6379
 * });
 * 
 * client.getAccount(token, function(err, account) {
 *     if (err)
 *         console.dir(err);
 *     else
 *         console.dir(account);
 * });
 * 
 * client.addAccount(token, account, function(err, result) {
 *     if (err)
 *         console.dir(err);
 *     else
 *         console.dir(result);
 * });
 */

import { Redis } from 'ioredis';

export interface ClientOptions {
    redisClient?: Redis;
    host?: string;
    port?: number;
}

export class Client<Account extends Object> {
    redisClient: Redis;

    constructor(options: ClientOptions) {
        this.redisClient = options.redisClient || new Redis({
            host: options.host || "127.0.0.1",
            port: options.port || 6379,
        });
    }

    /**
     * Retrieve an user account from authentication token
     *
     * cb(err, account) will be called.
     *
     * account will be null if no account is found, i.e.
     * user has to login again.
     */
    async getAccount(token: string, cb: (err: Error | null, account: Account | null) => void): Promise<void> {
        try {
            const reply = await this.redisClient.get(token);
            // console.log('get account -> redis', reply);
            if (reply) {
                const account = JSON.parse(reply) as Account;
                cb(null, account);
            }
            else {
                cb(new Error("account not found"), null);
            }
        }
        catch (err) {
            cb(err as Error, null);
        }
    }

    /**
     * Adds an account into the authentication database
     *
     * cb(err, reply) will be called with result.
     */
    async addAccount(token: string, account: Account, cb?: (err: Error | null, reply: string) => void): Promise<void> {
        try {
            const reply = await this.redisClient.set(token, JSON.stringify(account));
            // console.log('add account -> redis', token, JSON.stringify(account), reply);
            this.redisClient.expire(token, 3600 * 24 * 365); // token will be valid for 365 days
            if (cb) process.nextTick(() => cb(null, reply || ''));
        }
        catch (err) {
            if (cb) cb(err as Error, '');
        }
    }

    /**
     * Removes an account from the authentication database.
     */
    async removeAccount(token: string, cb: (err: Error | null, reply: number) => void): Promise<void> {
        try {
            const reply = await this.redisClient.del(token);
        }
        catch (err) {
            cb(err as Error, 0);
        }
    }
}

/**
 * Module object
 *
 * @param options - The options for the client.
 * @returns The AuthDB client instance.
 */
export function authdb<Account extends Object>(options: ClientOptions): Client<Account> {
    // Don't fail on missing options.
    return new Client<Account>(options || {});
};

// Backwards compatible.
authdb.createClient = authdb;

// Export the module object.
export default authdb;


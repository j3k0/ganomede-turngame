import restify from 'restify';
import restifyErrors from 'restify-errors';
import bunyan from 'bunyan';
import { Client as AuthDbClient } from '../authdb';

const SECRET_SEPARATOR = '.';

/**
 * Populates req.params.user with value returned from authDb.getAccount()
 * or possibly faked account if options.secret is provided.
 *
 * Options object contains:
 *  - authdbClient // object // required
 *    The client object for the authentication database.
 *
 *  - log // object // optional (defaults noop)
 *    Logger with .error() method.
 *
 *  - secret // string // optional (defaults false)
 *    If specified, will try to check token against this first.
 */
export const create = (options: { authdbClient: AuthDbClient<any>, log?: bunyan, secret?: string }) => {
    // options.authdbClient is required
    const authdbClient = options.authdbClient;
    if (!authdbClient) {
        throw new Error("options.authdbClient is missing");
    }

    // authorizing via secret means that authToken is:
    //   process.env.API_SECRET + SECRET_SEPARATOR + username
    const secret = options.secret ? options.secret + SECRET_SEPARATOR : false;
    if (options.hasOwnProperty('secret')) {
        if (typeof options.secret !== 'string' || options.secret.length <= 0) {
            throw new Error("options.secret must be non-empty string");
        }
    }

    const parseUsernameFromSecretToken = (token: string): string | null => {
        // make sure we have both, secret and username parts
        const valid = (0 === token.indexOf(secret as string)) && (token.length > (secret as string).length);
        const username = valid ? token.slice((secret as string).length) : null;
        return username;
    };

    const log = options.log || { error: () => { } };

    return (req: restify.Request, res: restify.Response, next: restify.Next) => {
        // extract token
        const authToken = req.params.authToken;
        // console.log('authdb middleware', authToken);
        if (!authToken) {
            return next(new restifyErrors.InvalidContentError('invalid content'));
        }

        // check against secret
        if (secret) {
            const spoofUsername = parseUsernameFromSecretToken(authToken);
            if (spoofUsername) {
                req.params.user = {
                    _secret: true,
                    username: spoofUsername
                };
                return next();
            }
        }

        // check against authdb
        authdbClient.getAccount(authToken, (err: any, account: any) => {
            // console.log('authdb middleware', authToken, account);
            if (err || !account) {
                if (err) {
                    log.error({
                        err: err,
                        token: authToken
                    }, 'authdbClient.getAccount() failed');
                }
                return next(new restifyErrors.UnauthorizedError('not authorized'));
            }

            req.params.user = account;
            next();
        });
    };
};

export default { create };
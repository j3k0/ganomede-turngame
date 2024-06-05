'use strict';

import cluster from 'cluster';
import log from './src/log';
import config from './src/config';
import { Server } from 'restify';
import { InternalError } from 'restify-errors';
import main from './src/main';

if (cluster.isPrimary) {
    // master
    log.info("running with env", process.env);
    log.info("running with config", config);
    cluster.fork();
    cluster.fork(); // Start 2, so when 1 fails there's not downtime.
    cluster.on("disconnect", (worker) => {
        log.error("disconnect!");
        cluster.fork();
    });
} else {
    // worker
    const server: Server = require('./src/server').createServer();

    // Initialize backend, add routes
    main.initialize();
    main.addRoutes(config.routePrefix, server);

    // Handle uncaughtException, kill the worker
    server.on('uncaughtException', function (req, res, route, err: Error) {
        // Log the error
        log.error(err);

        // Note: we're in dangerous territory!
        // By definition, something unexpected occurred,
        // which we probably didn't want.
        // Anything can happen now!  Be very careful!
        try {
            // make sure we close down within 30 seconds
            setTimeout(function() {
                process.exit(1);
            }, 30000);

            // stop taking new requests
            server.close();

            // Let the master know we're dead.  This will trigger a
            // 'disconnect' in the cluster master, and then it will fork
            // a new worker.
            cluster.worker?.disconnect();

            res.send(new InternalError(err, err.message || 'unexpected error'));
        } catch (err2) {
            log.error("Error sending 500!");
            log.error(err2);
        }
    });

    // Start the server
    server.listen(config.port, function() {
        log.info(server.name + " listening at " + server.url);
    });
}

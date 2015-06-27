require('coffee-script/register');

// Use New Relic if LICENSE_KEY has been specified.
if (process.env.NEW_RELIC_LICENSE_KEY) {
    if (!process.env.NEW_RELIC_APP_NAME) {
        var pk = require('./package.json');
        process.env.NEW_RELIC_APP_NAME = pk.api;
    }
    require('newrelic');
}

var cluster = require("cluster");
var log = require("./src/log");
var config = require('./config');

if (cluster.isMaster) {

    // master
    log.info("running with env", process.env);
    log.info("running with config", config);
    cluster.fork();
    cluster.on("disconnect", function(worker) {
        log.error("disconnect!");
        cluster.fork();
    });
}
else {

    // worker
    var main = require("./src/main");
    var server = require('./src/server');

    // Intitialize backend, add routes
    main.initialize();
    main.addRoutes(config.routePrefix, server);

    // Handle uncaughtException, kill the worker
    server.on('uncaughtException', function (req, res, route, err) {

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
            cluster.worker.disconnect();

            var InternalError = require('restify').InternalError;
            res.send(new InternalError(err, err.message || 'unexpected error'));
        }
        catch (err2) {
            log.error("Error sending 500!");
            log.error(err2);
        }
    });

    // Start the server
    server.listen(config.port, function() {
        log.info(server.name + " listening at " + server.url);
    });
}

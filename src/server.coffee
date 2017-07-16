restify = require('restify')

server = restify.createServer()

server.use restify.plugins.queryParser()
server.use restify.plugins.bodyParser()
server.use restify.plugins.gzipResponse()

module.exports = server

supertest = require 'supertest'
fakeRedis = require 'fakeredis'
expect = require 'expect.js'
vasync = require 'vasync'
authdb = require 'authdb'
api = require '../../src/turngame'
Games = require '../../src/turngame/games'
config = require '../../config'
server = require '../../src/server'
samples = require './sample-data'

users = samples.users
game = samples.game
newgame = samples.newgame
moves = samples.moves

describe "turngame-api", ->
  redis = fakeRedis.createClient(__filename)
  authdb = authdb.createClient({
    redisClient: fakeRedis.createClient("#auth-{__filename}")
  })
  games = new Games(redis, config.redis.prefix)
  go = supertest.bind(supertest, server)
  substract = require "ganomede-substract-game"
  substractServer = substract.create()
  notificationsSent = {}
  chatSent = {}

  endpoint = (path) ->
    return "/#{config.routePrefix}#{path || ''}"

  before (done) ->
    for own username, accountInfo of users
      authdb.addAccount accountInfo.token, accountInfo

    sendNotification = (notification, callback) ->
      to = notification.to
      received = notificationsSent[to] = notificationsSent[to] || []
      received.push(notification)
      process.nextTick(callback.bind(null, null))

    sendChat = (chat, callback) ->
      chat.users.forEach (to) ->
        received = chatSent[to] = chatSent[to] || []
        received.push(chat)
      if callback
        process.nextTick(callback.bind(null, null))

    turngame = api
      authdbClient: authdb
      games: games
      sendNotification: sendNotification
      sendChat: sendChat

    turngame(config.routePrefix, server)

    # add game and moves to redis, listen on port
    vasync.parallel
      funcs: [
        redis.flushdb.bind(redis)
        server.listen.bind(server)
        substractServer.listen.bind(substractServer, 8080)
        games.setState.bind(games, game.id, game)
        (cb) -> vasync.forEachParallel
          func: games.addMove.bind(games, game.id, game)
          inputs: moves
        , cb
      ], done

  after (done) ->
    server.close ->
      substractServer.close() # Why doesn't this trigger a callback?
      done()

  describe 'Single Game', () ->
    describe 'GET /auth/:token/games/:id', () ->
      it 'retrieves game state by its ID', (done) ->
        go()
          .get endpoint("/auth/#{users.alice.token}/games/#{game.id}")
          .expect 200
          .end (err, res) ->
            expect(err).to.be(null)
            expect(res.body).to.eql(game)
            done()

      it 'requires valid authToken', (done) ->
        go()
          .get endpoint("/auth/invalid-token/games/#{game.id}")
          .expect 401, done

      it 'allows auth with API_SECRET', (done) ->
        theSecretToken = "#{process.env.API_SECRET}.#{users.alice.username}"
        go()
          .get(endpoint("/auth/#{theSecretToken}/games/#{game.id}"))
          .expect(200, done)

      it 'only game participants are allowed', (done) ->
        go()
          .get endpoint("/auth/#{users.jdoe.token}/games/#{game.id}")
          .expect 403, done

      it 'replies with http 404 if game was not found', (done) ->
        go()
          .get endpoint("/auth/#{users.jdoe.token}/games/bad-#{game.id}")
          .expect 404, done

    describe 'POST /auth/:token/games/:id', () ->
      it 'requires valid authToken', (done) ->
        go()
          .post endpoint("/auth/invalid-token/games/#{newgame.id}")
          .expect 401, done

      it 'only game participants are allowed', (done) ->
        go()
          .post endpoint("/auth/#{users.jdoe.token}/games/#{newgame.id}")
          .send newgame
          .expect 403, done

      it 'let us create games', (done) ->
        go()
          .post endpoint("/auth/#{users.alice.token}/games/#{newgame.id}")
          .send newgame
          .expect 200
          .end (err, res) ->
            expect(res.body).to.eql(samples.newgameOutcome)
            done()

    describe 'GET /auth/:token/games/:id/moves', () ->
      it 'retrieves moves made in a game', (done) ->
        go()
          .get endpoint("/auth/#{users.alice.token}/games/#{game.id}/moves")
          .expect 200
          .end (err, res) ->
            expect(err).to.be(null)
            expect(res.body).to.eql(moves)
            done()

      it 'requires valid authToken', (done) ->
        go()
          .get endpoint("/auth/invalid-token/games/#{game.id}/moves")
          .expect 401, done

      it 'only game participants are allowed', (done) ->
        go()
          .get endpoint("/auth/#{users.jdoe.token}/games/#{game.id}/moves")
          .expect 403, done

      it 'replies with http 404 if game was not found', (done) ->
        go()
          .get endpoint("/auth/#{users.jdoe.token}/games/bad-#{game.id}/moves")
          .expect 404, done

    # So the important thing here is that tests are run in order.
    describe 'POST /auth/:token/games/:id/moves', () ->
      # This will try to make a move as Alice when it is Bob's turn
      it 'checks that move is performed in compliance with gameState.turn',
      (done) ->
        go()
          .post endpoint("/auth/#{users.alice.token}/games/#{game.id}/moves")
          .send {moveData: samples.nextMove.moveData}
          .expect 400
          .end (err, res) ->
            expect(err).to.be(null)
            expect(res.body.message).to.be('WaitForYourTurn')
            done()

      # This will post a successful move as Bob and finish the game.
      # We will also check, that Alice received notification here.
      it 'adds move to a game and returns new game state', (done) ->
        go()
          .post endpoint("/auth/#{users.bob.token}/games/#{game.id}/moves")
          .send moveData: samples.nextMove.moveData
          .expect 200
          .end (err, res) ->
            # Correct move added, game updated.
            expect(err).to.be(null)
            expect(res.body).to.eql(samples.gameNew)
            # Alice got a notification
            received = notificationsSent[samples.users.alice.username]
            expect(received).to.be.an(Array)
            expect(received).to.have.length(1)
            notification = received[0]
            expect(notification.type).to.be('move')
            expect(notification.data.game).to.eql(samples.gameNew)
            # Done!
            done()

      it 'allows to send chat events', (done) ->
        go()
          .post endpoint("/auth/#{users.alice.token}/games/#{game.id}/moves")
          .send
            moveData: samples.thirdMove.moveData
            chatEvent: samples.thirdMove.chatEvent
          .expect 200
          .end (err, res) ->
            # Correct move added, game updated.
            expect(err).to.be(null)
            expect(res.body).to.eql(samples.gameThird)
            # Alice and bob received a chat for the move, one for gameover
            received = chatSent[samples.users.bob.username]
            expect(received).to.be.an(Array)
            expect(received).to.have.length(2)
            received = chatSent[samples.users.alice.username]
            expect(received).to.be.an(Array)
            expect(received).to.have.length(2)
            done()

      # This is ran after game is finished.
      it 'replies with http 423 when trying to make a move in a finished game',
      (done) ->
        go()
          .post endpoint("/auth/#{users.alice.token}/games/#{game.id}/moves")
          .send {moveData: samples.nextMove.moveData}
          .expect 423, done

      # Following test check some edge-cases which are in middleware
      # ran before any move verification logic takes place, so don't depend
      # on order.

      it 'replies with 400 in case of missing body.moveData', (done) ->
        go()
          .post endpoint("/auth/#{users.bob.token}/games/#{game.id}/moves")
          .send {}
          .expect 400, done

      it 'requires valid authToken', (done) ->
        go()
          .post endpoint("/auth/invalid-token/games/#{game.id}/moves")
          .expect 401, done

      it 'only game participants are allowed', (done) ->
        go()
          .post endpoint("/auth/#{users.jdoe.token}/games/#{game.id}/moves")
          .send {moveData: 'w/ever'}
          .expect 403, done

      it 'replies with http 404 if game was not found', (done) ->
        go()
          .post endpoint("/auth/#{users.jdoe.token}/games/bad-#{game.id}/moves")
          .expect 404, done

# vim: ts=2:sw=2:et:

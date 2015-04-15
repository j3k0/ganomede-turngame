supertest = require 'supertest'
fakeRedis = require 'fakeredis'
expect = require 'expect.js'
vasync = require 'vasync'
api = require '../../src/turngame'
Games = require '../../src/turngame/games'
config = require '../../config'
server = require '../../src/server'
fakeAuthDb = require '../fake-authdb'
samples = require './sample-data'

users = samples.users
game = samples.game
newgame = samples.newgame
moves = samples.moves

describe "turngame-api", ->
  redis = fakeRedis.createClient(__filename)
  authdb = fakeAuthDb.createClient()
  games = new Games(redis, config.redis.prefix)
  go = supertest.bind(supertest, server)
  substract = require "ganomede-substract-game"
  substractServer = substract.create()

  endpoint = (path) ->
    return "/#{config.routePrefix}#{path || ''}"

  before (done) ->
    for own username, accountInfo of users
      authdb.addAccount accountInfo.token, accountInfo

    turngame = api
      authdbClient: authdb
      games: games

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

      # This will post a successful move as Bob and finish the game
      it 'adds move to a game and returns new game state', (done) ->
        go()
          .post endpoint("/auth/#{users.bob.token}/games/#{game.id}/moves")
          .send {moveData: samples.nextMove.moveData}
          .expect 200
          .end (err, res) ->
            expect(err).to.be(null)
            expect(res.body).to.eql(samples.gameNew)
            done()

      # This is ran after game is finished.
      it 'replies with http 423 when trying to make a move in a finished game',
      (done) ->
        go()
          .post endpoint("/auth/#{users.bob.token}/games/#{game.id}/moves")
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

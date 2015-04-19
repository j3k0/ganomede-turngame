fakeRedis = require 'fakeredis'
expect = require 'expect.js'
Games = require '../../src/turngame/games'
config = require '../../config'
samples = require './sample-data'

describe 'Games', () ->
  redis = fakeRedis.createClient(__filename)
  games = new Games(redis, config.redis.prefix)
  game = samples.game
  moves = samples.moves

  before (done) ->
    redis.flushdb(done)

  it '#key() generates redis keys', () ->
    key = games.key(game.id)
    movesKey = games.key(game.id, 'moves')
    expectedKey = [config.redis.prefix, 'games', game.id].join ':'
    expectedMovesKey = [config.redis.prefix, 'games', game.id, 'moves'].join ':'

    expect(key).to.be(expectedKey)
    expect(movesKey).to.be(expectedMovesKey)

  describe '#setState()', () ->
    it 'updates state of game by game ID', (done) ->
      games.setState game.id, game, (err) ->
        expect(err).to.be(null)
        done()

  describe '#state()', () ->
    it 'retrieves game\'s state from redis by game ID', (done) ->
      games.state game.id, (err, state) ->
        expect(err).to.be(null)
        expect(state).to.eql(game)
        done()

  describe '#addMove()', () ->
    it '#addMove() adds move to game by game ID', (done) ->
      games.addMove game.id, game, moves[0], (err) ->
        expect(err).to.be(null)
        done()

  describe '#moves()', () ->
    it 'retrieves game\'s moves from redis by game ID', (done) ->
      games.moves game.id, (err, movesReturned) ->
        expect(err).to.be(null)
        expect(movesReturned).to.eql(moves)
        done()

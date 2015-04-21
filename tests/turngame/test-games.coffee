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

  # callback(err, gameToExpireSeconds, movesToExpireSeconds)
  readExpire = (gameId, callback) ->
    redis.multi()
      .ttl(games.key(gameId))
      .ttl(games.key(gameId, Games.MOVES_POSTFIX))
      .exec (err, expires) ->
        if err then callback(err) else callback(null, expires[0], expires[1])

  testExpire = (expectedSecondsState, expectedSecondsMoves) ->
    it 'resets expire date to Games.EXPIRE_SECONDS', (done) ->
      readExpire game.id, (err, gameSeconds, moveSeconds) ->
        expect(err).to.be(null)
        expect(gameSeconds).to.be(expectedSecondsState)
        expect(moveSeconds).to.be(expectedSecondsMoves)
        done()

  before (done) ->
    redis.flushdb(done)

  it '#key() generates redis keys', () ->
    key = games.key(game.id)
    movesKey = games.key(game.id, Games.MOVES_POSTFIX)
    expectedKey = [config.redis.prefix, 'games', game.id].join ':'
    expectedMovesKey = [config.redis.prefix, 'games', game.id, 'moves'].join ':'

    expect(key).to.be(expectedKey)
    expect(movesKey).to.be(expectedMovesKey)

  describe '#setState()', () ->
    it 'updates state of game by game ID', (done) ->
      games.setState game.id, game, (err) ->
        expect(err).to.be(null)
        done()

    # State should have expire, but since we have no move list for now,
    # we expect -2 (key does not exists) for expireSeconds of move list.
    #
    # CAUTION:
    # In older redis versions (before 2.8), -1 is returned in both cases:
    # when key does not exists or has no expire.
    # Seems to be the case with fakeredis, so we'll expect -1 here
    # (https://github.com/hdachev/fakeredis#implemented-subset).
    testExpire(Games.EXPIRE_SECONDS, -1)

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

    testExpire(Games.EXPIRE_SECONDS, Games.EXPIRE_SECONDS)

  describe '#moves()', () ->
    it 'retrieves game\'s moves from redis by game ID', (done) ->
      games.moves game.id, (err, movesReturned) ->
        expect(err).to.be(null)
        expect(movesReturned).to.eql(moves)
        done()

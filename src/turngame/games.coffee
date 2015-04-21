log = require '../log'

PREFIX_SEPARATOR = ':'

class Games
  constructor: (redis, prefix) ->
    @redis = redis
    @prefix = prefix

  multi: () ->
    @redis.multi()

  key: (gameId, parts...) ->
    [@prefix, 'games', gameId].concat(parts).join(PREFIX_SEPARATOR)

  _updateExpire: (multi, id) ->
    multi
      .expire(@key(id), Games.EXPIRE_SECONDS)
      .expire(@key(id, Games.MOVES_POSTFIX), Games.EXPIRE_SECONDS)

  # Save game state to redis and set EXPIRE of state and movelist
  _setState: (multi, id, state) ->
    multi.set(@key(id), JSON.stringify(state))
    @_updateExpire(multi, id)

  setState: (id, state, callback) ->
    @_setState(@multi(), id, state).exec (err, replies) ->
      if (err)
        log.error 'Games.setState() failed',
          err: err
          id: id
          state: state

      callback(err)

  # Get game state from redis
  _state: (multi, id) ->
    multi.get(@key(id))

  state: (id, callback) ->
    @_state(@multi(), id).exec (err, replies) ->
      if (err)
        log.error 'Games.state() failed',
          err: err
          id: id
        return callback(err)

      json = replies[0]
      callback(null, if json then JSON.parse(json) else null)

  # Add move to a game
  # (Also updates state as a part of a MULTI transaction.)
  _addMove: (multi, id, state, move) ->
    multi.rpush(@key(id, Games.MOVES_POSTFIX), JSON.stringify(move))
    @_setState(multi, id, state)

  addMove: (id, newState, move, callback) ->
    @_addMove(@multi(), id, newState, move).exec (err, replies) ->
      if (err)
        log.error 'Games.addMove() failed',
          err: err
          id: id
          newState: newState
          move: move

      callback(err)

  # Retrives list of moves made in game
  _moves: (multi, id) ->
    multi.lrange @key(id, Games.MOVES_POSTFIX), 0, -1

  moves: (id, callback) ->
    @_moves(@multi(), id).exec (err, replies) ->
      if (err)
        log.error 'Games.moves() failed',
          err: err
          id: id
        return callback(err)

      moves = replies[0]
      callback(null, moves.map (move) -> JSON.parse(move))

  @EXPIRE_SECONDS: 30 * 24 * 3600 # 30 days
  @MOVES_POSTFIX: 'moves'

module.exports = Games

#
# Talks to rules server
#

vasync = require 'vasync'
restify = require 'restify'
log = require '../log'

clone = (obj) ->
  JSON.parse(JSON.stringify(obj))

class RulesClient
  constructor: (jsonClient) ->
    if !jsonClient
      throw new Error('jsonClient required')

    @client = jsonClient
    @log = log.child rulesClient:@client.url?.pathname
    @log.info { pathname:@client.url?.pathname }, "RulesClient created"

  endpoint: (subpath) ->
    return "#{@client.url?.pathname || ''}#{subpath}"

  # This simply retrieves clean `gameData` for creating new challenges,
  # which don't really care about `id` or `players`.
  gameData: (callback) ->
    @games {id: 'whatever', players: ['whoever']}, (err, state) ->
      callback(err, state?.gameData)

  games: (game, callback) ->
    url = @endpoint('/games')
    # @log.info { url:url }, "post /games"
    @client.post url, game, (err, req, res, body) =>
      if (err)
        @log.error "failed to generate game", err
        return callback(err)

      if (res.statusCode != 200)
        @log.error "game generated with code", {code:res.statusCode}
        return callback(new Error "HTTP#{res.statusCode}")

      @copyGameFields game, body
      callback(null, body)

  # POST /moves
  # @game should contain moveData to post
  # callback(err, rulesError, newState)
  moves: (game, callback) ->
    url = @endpoint('/moves')
    # @log.info { url:url }, "post /moves"
    @client.post url, game, (err, req, res, body) =>
      if (err)
        restifyError = body && (err instanceof restify.RestError)
        if restifyError
          @log.warn 'RulesClient.moves() rejected move with rules error',
            err: err
            rulesErr: body
            game: game
          return callback(null, err)
        else
          @log.error 'RulesClient.moves() failed',
            err: err
            game: game
          return callback(err)

      @copyGameFields game, body
      callback(null, null, body)

  copyGameFields: (src, dst) ->
    dst.id = src.id
    dst.type = src.type
    dst.players = src.players
    if src.gameConfig then dst.gameConfig = src.gameConfig

  # This takes in an initial state, and sends a buhch of moves to rules service.
  # Returns new game state after all the moves if every move is correct one
  # or error if one of the moves is incorrect.
  #
  # moves is an array of {move: moveData, timestamp: when move was made}
  # callback(err, finalState)
  replay: (initialState, moves, callback) ->
    # We need a copy of this so we won't screw up any data up the stack.
    state = clone(initialState)

    sendMove = (move, cb) =>
      state.moveData = move
      @moves state, (err, response) ->
        state = response
        cb(err, state)

    vasync.forEachPipeline
      func: sendMove
      inputs: moves.map (m) -> return m.move
    , (err, results) ->
      if (err)
        return callback(err)

      finalState = results.operations[moves.length - 1].result
      callback(err, finalState)

module.exports = RulesClient

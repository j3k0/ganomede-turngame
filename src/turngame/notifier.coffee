vasync = require 'vasync'
helpers = require 'ganomede-helpers'
log = require '../log'
pkg = require '../../package.json'

Notification = helpers.Notification
noop = () ->

# Sends `move` notification to every player participating in a game, except
# the one who made a move.
#
# sendNotification: function with URI bound: `send(notification, callback)`
# player: username of the player who made a move
# newState: gameState to send
moveMade = (sendNotification, player, newState, callback) ->
  receivers = newState.players.filter (username) ->
    return username != player

  send = (username, cb) ->

    ndata =
      from: pkg.api
      to: username
      type: moveMade.NOTIFICATION_TYPE
      data:
        game: newState

    # Push notification
    log.info "push-notification",
      username: username
      turn: newState.turn
      state: newState.state
    if username == newState.turn
      pushLocKeys =
        active: "your_turn"
        gameover: "game_over"
      pushData = (state) ->
        app: newState.type
        title: [ "#{pushLocKeys[state]}_title" ]
        message: [ "#{pushLocKeys[state]}_message", player ]
      if pushLocKeys[newState.state]
        ndata.push = pushData(newState.state)
    log.info "notification", ndata

    notification = new Notification ndata

    sendNotification notification, (err) ->
      if (err)
        log.error 'notifier.moveMade(): send() failed:',
          error: err
          notification: notification

      cb(err)

  vasync.forEachParallel
    func: send
    inputs: receivers
  , callback || noop

moveMade.NOTIFICATION_TYPE = 'move'

module.exports =
  moveMade: moveMade

# vim: ts=2:sw=2:et:

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
      status: newState.status
    if username == newState.turn
      pushLocKeys =
        active: "your_turn"
        gameover: "game_over"
      pushData = (status) ->
        app: newState.type
        title: [ "#{pushLocKeys[status]}_title" ]
        message: [ "#{pushLocKeys[status]}_message", player ]
      if pushLocKeys[newState.status]
        ndata.push = pushData(newState.status)
    log.info "push-notification", ndata

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

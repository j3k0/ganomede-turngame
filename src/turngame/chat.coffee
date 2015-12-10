vasync = require 'vasync'
helpers = require 'ganomede-helpers'
log = require '../log'
pkg = require '../../package.json'

Chat = helpers.Chat
Chat.logError = log.error.bind(log)

# Sends chat event to this game's chatroom.
#
# sendChat: function with URI bound: `send(chat, callback)`
# chatEvent: the chat message
# newState: gameState to send
moveMade = (sendChat, chatEvent, newState, callback) ->

  unless chatEvent
    return callback?()

  sendChatData = (ndata, cb) ->
    chat = new Chat ndata
    sendChat chat, (err) ->
      if (err)
        log.error 'chat.moveMade(): send() failed:',
          error: err
          data: ndata
      cb?(err)

  sendChatData
    type: newState.type
    users: newState.players
    timestamp: Date.now()
    message: chatEvent
  , if newState.status == "gameover" then undefined else callback

  if newState.status == "gameover"
    # XXX we check if gameData has a player array with scores
    # this is a shortcut to have this work quickly with a specific
    # game in mind...
    pws = newState.gameData?.players || []
    scores = pws.map (p) -> p.score
    message = "gameover:" +
      newState.players.join(",") +
      ":" + scores.join(",")
    sendChatData
      type: newState.type
      users: newState.players
      timestamp: Date.now()
      message: message
    , callback

module.exports =
  moveMade: moveMade

# vim: ts=2:sw=2:et:


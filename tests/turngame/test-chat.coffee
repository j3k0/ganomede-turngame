Chat = require '../../src/turngame/chat'
expect = require 'expect.js'

describe 'Chat', () ->

  # Set CHAT_PORT_8080_TCP_ADDR and PORT to enable chat
  saveAddr = process.env.CHAT_PORT_8080_TCP_ADDR
  savePort = process.env.CHAT_PORT_8080_TCP_PORT
  before () ->
    process.env.CHAT_PORT_8080_TCP_ADDR = 'localhost'
    process.env.CHAT_PORT_8080_TCP_PORT = 80
  after () ->
    process.env.CHAT_PORT_8080_TCP_ADDR = saveAddr
    process.env.CHAT_PORT_8080_TCP_PORT = savePort

  it 'should trigger a gameover event when the game is over', (done) ->
    sent = []
    sendChat = (chat, cb) ->
      sent.push chat
      cb()
    Chat.moveMade sendChat, 'test', {
      players: [ 'alice', 'bob' ]
      status: 'gameover'
      gameData:
        players: [
          { score: 12 },
          { score: 13 }
        ]
    }, () ->
      expect(sent.length).to.be 2
      expect(sent[0].message).to.be "test"
      expect(sent[1].message).to.be "gameover:alice,bob:12,13"
      done()

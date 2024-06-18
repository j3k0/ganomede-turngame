import expect from 'expect.js';
import Chat from '../../src/turngame/chat';

describe('Chat', () => {
  // Set CHAT_PORT_8080_TCP_ADDR and PORT to enable chat
  const saveAddr = process.env.CHAT_PORT_8080_TCP_ADDR;
  const savePort = process.env.CHAT_PORT_8080_TCP_PORT;

  before(() => {
    process.env.CHAT_PORT_8080_TCP_ADDR = 'localhost';
    process.env.CHAT_PORT_8080_TCP_PORT = '80';
  });

  after(() => {
    process.env.CHAT_PORT_8080_TCP_ADDR = saveAddr;
    process.env.CHAT_PORT_8080_TCP_PORT = savePort;
  });

  it('should trigger a gameover event when the game is over', (done) => {
    const sent: { message: string }[] = [];
    const sendChat = (chat: { message: string }, cb: () => void) => {
      sent.push(chat);
      cb();
    };

    Chat.moveMade(sendChat, 'test', {
      id: 'game123',
      type: 'turnbased',
      players: ['alice', 'bob'],
      scores: [12, 13],
      turn: '',
      status: 'gameover',
      gameData: {
      },
    }, () => {
      expect(sent.length).to.be(2);
      expect(sent[0].message).to.be('test');
      expect(sent[1].message).to.be('gameover:alice,bob:12,13');
      done();
    });
  });
});

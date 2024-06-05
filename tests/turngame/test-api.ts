import supertest from 'supertest';
import expect from 'expect.js';
import Redis from 'ioredis-mock';
import authdb from '../../src/authdb';
import api from '../../src/turngame';
import Games from '../../src/turngame/games';
import config from '../../src/config';
import { createServer } from '../../src/server';
import samples from './sample-data';
import { describe } from 'mocha';
import restify from 'restify';
import * as substract from 'ganomede-substract-game';

const users = samples.users;
const game = samples.game;
const newgame = samples.newgame;
const moves = samples.moves;

describe("turngame-api", () => {
  const authdbClient = authdb.createClient({
    redisClient: new Redis(10928)
  });
  const games = new Games(new Redis(10927), config.redis.prefix);
  const server = createServer();
  const go = () => supertest(server);
  const substractServer: restify.Server = substract.create();
  let notificationsSent: Record<string, any[]> = {};
  let chatSent: Record<string, any[]> = {};

  const endpoint = (path: string) => `/${config.routePrefix}${path || ''}`;

  before(async () => {
    for (const username in users) {
      // console.log('add account', users[username]);
      await authdbClient.addAccount(users[username].token, users[username]);
    }

    const sendNotification = (notification: any, callback: () => void) => {
      const to = notification.to;
      const received = notificationsSent[to] = notificationsSent[to] || [];
      received.push(notification);
      process.nextTick(callback);
    };

    const sendChat = (chat: any, callback: () => void) => {
      chat.users.forEach((to: string) => {
        const received = chatSent[to] = chatSent[to] || [];
        received.push(chat);
      });
      if (callback) process.nextTick(callback);
    };
    sendChat.fname = "testSendChat";
    sendChat.details = "sendChat test function";

    const turngame = api({
      authdbClient,
      games,
      sendNotification,
      sendChat
    });

    turngame(config.routePrefix, server);

    await Promise.all([
      // redisClient.flushdb(),
      new Promise(resolve => {
        server.listen(() => {
          // console.log('test server listening');
          resolve(null);
        });
      }),
      new Promise(resolve => substractServer.listen(8080, resolve)),
      new Promise(resolve => games.setState(game.id, game, resolve)),
    ].concat(moves.map(move => new Promise(resolve => {
      games.addMove(game.id, game, move, resolve);
    }))));
  });

  after((done) => {
    server.close(() => {
      substractServer.close(() => {
        done();
      });
    });
  });

  describe('Single Game', () => {
    describe('GET /auth/:token/games/:id', () => {
      it('retrieves game state by its ID', (done) => {
        // console.log(endpoint(`/auth/${users.alice.token}/games/${game.id}`));
        go()
          .get(endpoint(`/auth/${users.alice.token}/games/${game.id}`))
          .expect(200)
          .end((err: any, res: any) => {
            expect(err).to.be(null);
            // console.log('game', game);
            // console.log('res.body', res.body);
            expect(res.body).to.eql(game);
            done();
          });
      });

      it('requires valid authToken', (done) => {
        go()
          .get(endpoint(`/auth/invalid-token/games/${game.id}`))
          .expect(401, done);
      });

      it('allows auth with API_SECRET', (done) => {
        const theSecretToken = `${process.env.API_SECRET}.${users.alice.username}`;
        go()
          .get(endpoint(`/auth/${theSecretToken}/games/${game.id}`))
          .expect(200, done);
      });

      it('only game participants are allowed', (done) => {
        go()
          .get(endpoint(`/auth/${users.jdoe.token}/games/${game.id}`))
          .expect(403, done);
      });

      it('replies with http 404 if game was not found', (done) => {
        go()
          .get(endpoint(`/auth/${users.jdoe.token}/games/bad-${game.id}`))
          .expect(404, done);
      });
    });

    describe('POST /auth/:token/games/:id', () => {
      it('requires valid authToken', (done) => {
        go()
          .post(endpoint(`/auth/invalid-token/games/${newgame.id}`))
          .expect(401, done);
      });

      it('only game participants are allowed', (done) => {
        go()
          .post(endpoint(`/auth/${users.jdoe.token}/games/${newgame.id}`))
          .send(newgame)
          .expect(403, done);
      });

      it('let us create games', (done) => {
        go()
          .post(endpoint(`/auth/${users.alice.token}/games/${newgame.id}`))
          .send(newgame)
          .expect(200)
          .end((err: any, res: any) => {
            expect(res.body).to.eql(samples.newgameOutcome);
            done();
          });
      });
    });

    describe('GET /auth/:token/games/:id/moves', () => {
      it('retrieves moves made in a game', (done) => {
        go()
          .get(endpoint(`/auth/${users.alice.token}/games/${game.id}/moves`))
          .expect(200)
          .end((err: any, res: any) => {
            expect(err).to.be(null);
            expect(res.body).to.eql(moves);
            done();
          });
      });

      it('requires valid authToken', (done) => {
        go()
          .get(endpoint(`/auth/invalid-token/games/${game.id}/moves`))
          .expect(401, done);
      });

      it('only game participants are allowed', (done) => {
        go()
          .get(endpoint(`/auth/${users.jdoe.token}/games/${game.id}/moves`))
          .expect(403, done);
      });

      it('replies with http 404 if game was not found', (done) => {
        go()
          .get(endpoint(`/auth/${users.jdoe.token}/games/bad-${game.id}/moves`))
          .expect(404, done);
      });
    });

    describe('POST /auth/:token/games/:id/moves', () => {
      it('checks that move is performed in compliance with gameState.turn', (done) => {
        go()
          .post(endpoint(`/auth/${users.alice.token}/games/${game.id}/moves`))
          .send({ moveData: samples.nextMove.moveData })
          .expect(400)
          .end((err: any, res: any) => {
            expect(err).to.be(null);
            expect(res.body.message).to.be('WaitForYourTurn');
            done();
          });
      });

      it('adds move to a game and returns new game state', (done) => {
        go()
          .post(endpoint(`/auth/${users.bob.token}/games/${game.id}/moves`))
          .send({ moveData: samples.nextMove.moveData })
          .expect(200)
          .end((err: any, res: any) => {
            expect(err).to.be(null);
            // console.log('game', samples.game);
            // console.log('body', res.body);
            expect(res.body).to.eql(samples.gameNew);
            const received = notificationsSent[samples.users.alice.username];
            expect(received).to.be.an(Array);
            expect(received).to.have.length(1);
            const notification = received[0];
            expect(notification.type).to.be('move');
            expect(notification.data.game).to.eql(samples.gameNew);
            done();
          });
      });

      it('allows to send chat events', (done) => {
        go()
          .post(endpoint(`/auth/${users.alice.token}/games/${game.id}/moves`))
          .send({
            moveData: samples.thirdMove.moveData,
            chatEvent: samples.thirdMove.chatEvent
          })
          .expect(200)
          .end((err: any, res: any) => {
            expect(err).to.be(null);
            expect(res.body).to.eql(samples.gameThird);
            let received = chatSent[samples.users.bob.username];
            expect(received).to.be.an(Array);
            expect(received).to.have.length(2);
            received = chatSent[samples.users.alice.username];
            expect(received).to.be.an(Array);
            expect(received).to.have.length(2);
            done();
          });
      });

      it('replies with http 423 when trying to make a move in a finished game', (done) => {
        go()
          .post(endpoint(`/auth/${users.alice.token}/games/${game.id}/moves`))
          .send({ moveData: samples.nextMove.moveData })
          .expect(423, done);
      });

      it('replies with 400 in case of missing body.moveData', (done) => {
        go()
          .post(endpoint(`/auth/${users.bob.token}/games/${game.id}/moves`))
          .send({})
          .expect(400, done);
      });

      it('requires valid authToken', (done) => {
        go()
          .post(endpoint(`/auth/invalid-token/games/${game.id}/moves`))
          .expect(401, done);
      });

      it('only game participants are allowed', (done) => {
        go()
          .post(endpoint(`/auth/${users.jdoe.token}/games/${game.id}/moves`))
          .send({ moveData: 'w/ever' })
          .expect(403, done);
      });

      it('replies with http 404 if game was not found', (done) => {
        go()
          .post(endpoint(`/auth/${users.jdoe.token}/games/bad-${game.id}/moves`))
          .expect(404, done);
      });
    });
  });
});

import Redis from 'ioredis-mock';
import { Games } from '../../src/turngame/games';
import config from '../../src/config';
import samples from './sample-data';
import expect from 'expect.js';

describe('Games', () => {
  const redis = new Redis({
    data: {
    }
  });
  const games = new Games(redis, config.redis.prefix);
  const game = samples.game;
  const moves = samples.moves;

  // callback(err, gameToExpireSeconds, movesToExpireSeconds)
  async function readExpire(gameId: string, callback: (err: Error | null, gameToExpireSeconds: number, movesToExpireSeconds: number) => void) {
    try {
      const ttl0 = await redis.ttl(games.key(gameId));
      const ttl1 = await redis.ttl(games.key(gameId, Games.MOVES_POSTFIX));
      process.nextTick(() => {
        callback(null, ttl0, ttl1);
      });
    }
    catch (err) {
      process.nextTick(() => {
        callback(err as Error, 0, 0);
      });
    }
  }

  const testExpire = (expectedStateTTL: number, expectedMoveTTL: number) => {
    it('resets expire date to Games.EXPIRE_SECONDS', (done) => {
      readExpire(game.id, (err, stateTTL, moveTTL) => {
        expect(err).to.be(null);
        expect(stateTTL).to.be(expectedStateTTL);
        expect(moveTTL).to.be(expectedMoveTTL);
        done();
      });
    });
  };

  before((done) => {
    redis.flushdb(done);
  });

  it('#key() generates redis keys', () => {
    const key = games.key(game.id);
    const movesKey = games.key(game.id, Games.MOVES_POSTFIX);
    const expectedKey = [config.redis.prefix, 'games', game.id].join(':');
    const expectedMovesKey = [config.redis.prefix, 'games', game.id, 'moves'].join(':');

    expect(key).to.be(expectedKey);
    expect(movesKey).to.be(expectedMovesKey);
  });

  describe('#setState()', () => {
    it('updates state of game by game ID', (done) => {
      games.setState(game.id, game, (err) => {
        expect(err).to.be(null);
        done();
      });
    });

    // State should have expire, but since we have no move list for now,
    // we expect -2 (key does not exists) for expireSeconds of move list.
    //
    // CAUTION:
    // In older redis versions (before 2.8), -1 is returned in both cases:
    // when key does not exists or has no expire.
    testExpire(Games.EXPIRE_SECONDS, -2);
  });

  describe('#state()', () => {
    it('retrieves game\'s state from redis by game ID', (done) => {
      games.state(game.id, (err, state) => {
        expect(err).to.be(null);
        expect(state).to.eql(game);
        done();
      });
    });
  });

  describe('#addMove()', () => {
    it('#addMove() adds move to game by game ID', (done) => {
      games.addMove(game.id, game, moves[0], (err) => {
        expect(err).to.be(null);
        done();
      });
    });

    testExpire(Games.EXPIRE_SECONDS, Games.EXPIRE_SECONDS);
  });

  describe('#moves()', () => {
    it('retrieves game\'s moves from redis by game ID', (done) => {
      games.moves(game.id, (err, movesReturned) => {
        expect(err).to.be(null);
        expect(movesReturned).to.eql(moves);
        done();
      });
    });
  });
});

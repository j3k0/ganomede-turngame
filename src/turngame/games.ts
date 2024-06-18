import { Redis } from 'ioredis';
import log from '../log';
import { GameState } from '../types';
import { Move } from '../types';

const PREFIX_SEPARATOR = ':';

export class Games {
  private redis: Redis;
  private prefix: string;
  static EXPIRE_SECONDS = 30 * 24 * 3600; // 30 days
  static MOVES_POSTFIX = 'moves';

  constructor(redis: Redis, prefix: string) {
    this.redis = redis;
    this.prefix = prefix;
  }

  key(gameId: string, ...parts: string[]): string {
    return [this.prefix, 'games', gameId, ...parts].join(PREFIX_SEPARATOR);
  }

  private async _updateExpire(id: string): Promise<void> {
    await this.redis.expire(this.key(id), Games.EXPIRE_SECONDS);
    await this.redis.expire(this.key(id, Games.MOVES_POSTFIX), Games.EXPIRE_SECONDS);
  }

  private async _setState(id: string, state: GameState): Promise<void> {
    await this.redis.set(this.key(id), JSON.stringify(state));
    await this._updateExpire(id);
  }

  async setState(id: string, state: GameState, callback: (err: Error | null) => void): Promise<void> {
    try {
      await this._setState(id, state);
      process.nextTick(() => callback(null));
    }
    catch (err) {
      log.error('Games.setState() failed', { err, id, state });
      callback(err as Error);
    }
  }

  private _state(id: string): Promise<string | null> {
    return this.redis.get(this.key(id));
  }

  async state(id: string, callback: (err: Error | null, state?: GameState) => void): Promise<void> {
    try {
      const json = await this._state(id);
      callback(null, json ? JSON.parse(json) : null);
    }
    catch (err) {
      log.error('Games.state() failed', { err, id });
      return callback(err as Error);
    }
  }

  private async _addMove(id: string, state: GameState, move: Move): Promise<void> {
    await this.redis.rpush(this.key(id, Games.MOVES_POSTFIX), JSON.stringify(move));
    await this._setState(id, state);
  }

  async addMove(id: string, newState: GameState, move: Move, callback: (err: Error | null) => void): Promise<void> {
    try {
      await this._addMove(id, newState, move);
      callback(null);
    }
    catch (err) {
      log.error('Games.addMove() failed', { err, id, newState, move });
      callback(err as Error);
    }
  }

  private _moves(id: string): Promise<string[]> {
    return this.redis.lrange(this.key(id, Games.MOVES_POSTFIX), 0, -1);
  }

  async moves(id: string, callback: (err: Error | null, moves?: Move[]) => void): Promise<void> {
    try {
      const moves = await this._moves(id);
      callback(null, moves.map((move: string) => JSON.parse(move)));
    }
    catch (err) {
      log.error('Games.moves() failed', { err, id });
      return callback(err as Error);
    }
  }
}

export default Games;


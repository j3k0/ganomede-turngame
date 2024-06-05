import axios, { AxiosInstance } from 'axios';
import log from '../log';
import { RestError } from 'restify-errors';
import { GameState, GameStateWithMove, GameCreationData, BaseMoveData, Move } from '../types';

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export class RulesClient {
  private client: AxiosInstance;
  private log: any;

  constructor(client: AxiosInstance) {
    if (!client) {
      throw new Error('client required');
    }

    this.client = client;
    this.log = log.child({ rulesClient: this.client.defaults.baseURL });
    this.log.info({ baseURL: this.client.defaults.baseURL }, "RulesClient created");
  }

  private endpoint(subpath: string): string {
    return `${this.client.defaults.baseURL || ''}${subpath}`;
  }

  /**
   * This simply retrieves clean `gameData` for creating new challenges,
   * which don't really care about `id` or `players`.
   */
  gameData(callback: (err: Error | null, gameData?: GameState["gameData"]) => void): void {
    this.games({ id: 'whatever', players: ['whoever'] }, (err, state) => {
      callback(err, state?.gameData);
    });
  }

  games(game: GameCreationData, callback: (err: Error | null, body?: GameState) => void): void {
    const url = this.endpoint('/games');
    this.client.post(url, game)
      .then(response => {
        const state = response.data;
        this.copyGameFields(game, state);
        // if (state.scores === undefined) state.scores = state.players.map(() => 0);
        callback(null, state);
      })
      .catch(error => {
        this.log.error("failed to generate game", error);
        if (error.response) {
          this.log.error("game generated with code", { code: error.response.status });
          return callback(new Error(`HTTP${error.response.status}`));
        }
        callback(error);
      });
  }

  /**
   * POST /moves
   * 
   * @param game - should contain moveData to post
   * @param callback - callback(err, rulesError, newState)
   * @param canRetry - optional, defaults to true, indicates if the request can be retried
   */
  moves(game: GameStateWithMove, callback: (err: Error | null, rulesError?: any, newState?: GameState) => void, canRetry = true): void {
    const url = this.endpoint('/moves');
    this.client.post(url, game)
      .then(response => {
        this.copyGameFields(game, response.data);
        callback(null, null, response.data);
      })
      .catch(error => {
        const restifyError = error.response && error instanceof RestError;
        if (restifyError) {
          this.log.warn('RulesClient.moves() rejected move with rules error', {
            err: error,
            rulesErr: error.body,
            game: game
          });
          return callback(null, error.body);
        } else {
          this.log.warn({
            err: error,
            game: game
          }, 'RulesClient.moves() failed');
          if (error.code === 'ECONNRESET' && canRetry) {
            this.log.warn('Retrying the request');
            return this.moves(game, callback, false);
          }
          return callback(error);
        }
      });
  }

  private copyGameFields(src: GameCreationData, dst: GameState): void {
    dst.id = src.id;
    dst.players = src.players;
    if (src.type) dst.type = src.type;
    if (src.gameConfig) dst.gameConfig = src.gameConfig;
  }

  /**
   * This takes in an initial state, and sends a bunch of moves to the rules service.
   * Returns the new game state after all the moves if every move is correct,
   * or an error if one of the moves is incorrect.
   *
   * @param initialState - The initial state of the game.
   * @param moves - An array of moves, each containing moveData and a timestamp of when the move was made.
   * @param callback - A callback function that takes an error and the final state.
   */
  async replay<MoveData extends BaseMoveData = BaseMoveData>(initialState: GameState, moves: MoveData[], callback: (err: Error | null, finalState?: GameState) => void): Promise<void> {
    let state: GameStateWithMove = clone(initialState);

    try {
      for (const move of moves) {
        state.moveData = move;
        state = await new Promise<GameState>((resolve, reject) => {
          this.moves(state, (err, _, newState) => {
            if (err) {
              return reject(err);
            }
            resolve(newState!);
          });
        });
      }
      process.nextTick(() => callback(null, state));
    } catch (err) {
      process.nextTick(() => callback(err as Error));
    }
  }
}

export default RulesClient;

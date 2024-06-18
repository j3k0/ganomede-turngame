import restify from 'restify';
import authdb from '../authdb';
import { Redis } from 'ioredis';
import config from '../config';
import log from '../log';
import Games from './games';
import rulesClients from './rules-clients';
import notifier from './notifier';
import chat from './chat';
import { BadRequestError, ForbiddenError, InternalServerError, InvalidContentError, LockedError, NotFoundError, RestError } from 'restify-errors';
import Notification from '../helpers/notification';
import Chat from '../helpers/chat';
import authdbMiddleware from '../helpers/authdb-middleware';
import { Client as AuthDbClient } from '../authdb';
import { GameCreationData, GameState, GameStateWithMove, Move, MoveData } from '../types';

function clone<T>(obj: T): T { return JSON.parse(JSON.stringify(obj)); }

export interface TurnGameApiOptions {
  authdbClient?: AuthDbClient<any>;
  games?: Games;
  sendNotification?: (...args: any[]) => any;
  sendChat?: ReturnType<typeof Chat.sendFn>;
}

export function turnGameApi(options: TurnGameApiOptions = {}) {
  //
  // Initialization
  //

  const authdbClient = options.authdbClient || authdb.createClient({
    host: config.authdb.host,
    port: config.authdb.port
  });

  const games = options.games || new Games(
    new Redis({ host: config.redis.host, port: config.redis.port }),
    config.redis.prefix
  );

  const sendNotification = options.sendNotification || Notification.sendFn(true);

  const sendChat = options.sendChat || Chat.sendFn(true);
  log.info("sendChat:", {
    name: sendChat.fname,
    details: sendChat.details
  });

  //
  // Middlewares
  //

  // Populates req.params.user with value returned from authDb.getAccount()
  const authMiddleware = authdbMiddleware.create({
    authdbClient,
    secret: config.apiSecret
  });

  // Populates req.params.game with game's state based in req.params.gameId
  const retrieveGameMiddleware = (req: restify.Request, res: restify.Response, next: restify.Next) => {
    // console.log('retrieveGameMiddleware');
    const gameId = req.params.gameId;
    if (!gameId) {
      return next(new InvalidContentError('invalid content'));
    }

    games.state(gameId, (err: Error | null, state?: GameState) => {
      if (err) {
        log.error(err);
        return next(new InternalServerError());
      }

      if (!state) {
        req.log.warn({gameId}, 'Game Not Found');
        return next(new NotFoundError());
      }

      req.params.game = state;
      next();
    });
  };

  // Checks that user is participant in req.params.game. Sends 403 otherwise.
  const participantsOnly = (req: restify.Request, res: restify.Response, next: restify.Next) => {
    const participant = req.params.game.players.indexOf(req.params.user.username) >= 0;
    if (participant) {
      next();
    } else {
      next(new ForbiddenError());
    }
  };

  //
  // Routes
  //

  /**
   * Handler for creating a new game.
   */
  const createGame = (req: restify.Request, res: restify.Response, next: restify.Next) => {
    const gameId = req.params.gameId;
    const type = req.body?.type;
    const players = req.body?.players;
    const gameConfig = req.body?.gameConfig;
    if (!gameId) {
      return next(new BadRequestError('MissingGameId'));
    }
    if (!type || typeof type !== 'string') {
      return next(new BadRequestError('MissingType'));
    }
    if (!players || !players.length) {
      return next(new BadRequestError('MissingPlayers'));
    }
    const game:GameCreationData = {
      id: gameId,
      type: type,
      players: players,
      gameConfig: gameConfig
    };

    const participant = players.indexOf(req.params.user.username) >= 0;
    if (!participant) {
      return next(new ForbiddenError());
    }

    const rules = rulesClients(game.type!);
    rules.games(game, (err: Error | null, state?: GameState) => {
      if (err) {
        return next(err);
      }
      if (!state) {
        return next(new Error('Game not found'));
      }
      games.setState(gameId, state, (err: Error | null) => {
        if (err) {
          return next(err);
        }
        res.send(state);
        next();
      });
    });
  };

  /**
   * Handler for sending the state of a game as JSON.
   */
  const sendGameJson = (req: restify.Request, res: restify.Response, next: restify.Next) => {
    res.json(req.params.game);
    next();
  };

  /**
   * Handler for sending the moves of a game as JSON.
   */
  const sendGameMovesJson = (req: restify.Request, res: restify.Response, next: restify.Next) => {
    games.moves(req.params.game.id, (err: Error | null, moves?: Move[]) => {
      if (err) {
        log.error(err);
        return next(new InternalServerError());
      }
      res.json(moves);
      next();
    });
  };

  /**
   * Checks basic sanity of move being performed.
   * 
   * (game must not be over, whose turn it is, etc.)
   */
  function validateMoveData(req: restify.Request, res: restify.Response, next: restify.Next) {
    const game: GameState = req.params.game;
    const move: MoveData | undefined = req.body?.moveData;
    const user = req.params.user;

    if (!move) {
      return next(new BadRequestError('MissingMoveData'));
    }

    if (game.status === 'gameover') {
      return next(new LockedError('GameOver'));
    }

    // Endgame actions are handled directly.
    if (isEndgameAction(move.action)) {
      return next();
    }

    if (game.turn !== user.username) {
      return next(new BadRequestError('WaitForYourTurn'));
    }

    next();
  };

  const isEndgameAction = (action?: MoveData['action']) => {
    return action === 'kickOut' || action === 'resign';
  };

  // When a player is kicked out, remove the player from the game.
  // If there is only one player left, set the game to gameover.
  const kickOut = (game: any) => {
    const turnIndex = game.players.indexOf(game.turn);
    const nextPlayer = game.players[(turnIndex + 1) % game.players.length];
    game.players = game.players.filter((player: string) => player !== game.turn);
    if (game.players.length === 2) {
      game.gameData.endTime = Date.now();
      game.gameData.lastMoveTime = Date.now();
      game.status = 'gameover';
      game.turn = null;
    } else {
      const turnIndex = game.players.indexOf(game.turn);
      const nextPlayer = game.players[(turnIndex + 1) % game.players.length];
      game.players = game.players.filter((player: string) => player !== game.turn);
    }
  };

  // Checks move req.body.moveData via RulesService and in case it is valid,
  // populates req.params.newGameState and calls next().
  const verifyMove = (req: restify.Request, res: restify.Response, next: restify.Next) => {
    const game: GameStateWithMove = clone(req.params.game);
    game.moveData = req.body.moveData;
    // If this is an player-removal move, handle it directly without using the rules client.
    // But only if the game supports it (has maxMoveTime defined)
    // Why would we do that though? Can't we just delegate this to the rules client?
    // I thing we should, so let's get rid of the below.
    // TODO: delegate this to the rules client.
    if (game.gameData?.lastMoveTime && game.gameConfig?.maxMoveTime) {
      if (game.moveData.action === 'kickOut') {
        if (game.gameData.lastMoveTime + game.gameConfig.maxMoveTime < Date.now()) {
          return next(new BadRequestError('KickOutTooEarly'));
        }
        kickOut(game);
      } else if (game.moveData.action === 'resign') {
        // TODO implement resign
      }
    }

    const rules = rulesClients(game.type);
    rules.moves(game, (err: Error | null, rulesErr?: any, newState?: GameState) => {
      // console.log('rules.moves()', err, game, rulesErr, newState);
      if (err) {
        log.error(err);
        return next(new InternalServerError());
      }

      if (rulesErr) {
        if (!(rulesErr instanceof RestError)) {
          log.warn('addMove(): RulesClient.moves() returned Rules Error of unexpected type', { rulesErr: rulesErr });
        }
        return next(rulesErr);
      }

      req.params.newGameState = newState;
      req.params.newMove = {
        player: game.turn,
        date: new Date().toISOString(),
        moveData: game.moveData
      } as Move;

      next();
    });
  };

  const addMove = (req: restify.Request, res: restify.Response, next: restify.Next) => {
    const newState = req.params.newGameState;
    const move = req.params.newMove;
    // console.log('adding move', move, newState);

    games.addMove(newState.id, newState, move, (err: Error | null) => {
      if (err) {
        log.error(err);
        return next(new InternalServerError());
      }

      // console.log('moveMade', newState);
      notifier.moveMade(sendNotification, move.player, newState);

      chat.moveMade(sendChat, req.body.chatEvent, newState);

      res.json(newState);
      next();
    });
  };

  return (prefix: string, server: restify.Server) => {
    // Single Game
    // console.log('register turngame api under ' + prefix);
    server.post(`/${prefix}/auth/:authToken/games/:gameId`, authMiddleware, createGame);
    server.get(`/${prefix}/auth/:authToken/games/:gameId`, authMiddleware, retrieveGameMiddleware, participantsOnly, sendGameJson);
    server.get(`/${prefix}/auth/:authToken/games/:gameId/moves`, authMiddleware, retrieveGameMiddleware, participantsOnly, sendGameMovesJson);
    server.post(`/${prefix}/auth/:authToken/games/:gameId/moves`, authMiddleware, retrieveGameMiddleware, participantsOnly, validateMoveData, verifyMove, addMove);
  };
};

export default turnGameApi;
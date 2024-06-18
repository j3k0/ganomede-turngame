import { GameCreationData, GameState, Move } from "../../src/types";

type User = {
  username: string;
  token: string;
};

interface GameData {
  total: number;
  nMoves: number;
};

type TestGameState = GameState & {
    /** Game data corresponds to the state of the game in the "rules" service. */
    gameData?: GameData;
};

// type Game = {
//   id: string;
//   type: string;
//   players: string[];
//   scores: number[];
//   turn: string;
//   status: string;
//   gameData: GameData;
// };

export type TestMove = Move & {
  moveData: {
    action?: string;
    number: number;
  };
  chatEvent?: string;
};
//   player: string;
//   moveData: {
//   };
//   chatEvent?: string;
// };

const clone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

const users: Record<string, User> = {
  alice: { username: 'alice', token: 'alice-token' },
  bob: { username: 'bob', token: 'bob-token' },
  jdoe: { username: 'jdoe', token: 'jdoe-token' },
};

const game: TestGameState = {
  id: 'game-id',
  type: 'substract-game/v1',
  players: ['alice', 'bob'],
  turn: 'bob',
  status: 'active',
  gameData: {
    total: 90,
    nMoves: 1,
  },
};

const newgame: GameCreationData = {
  id: 'newgame-id',
  type: 'substract-game/v1',
  players: ['alice', 'bob'],
};

const newgameOutcome: TestGameState = {
  id: 'newgame-id',
  type: 'substract-game/v1',
  players: ['alice', 'bob'],
  turn: 'alice',
  status: 'active',
  gameData: { total: 200, nMoves: 0 },
};

const moves: TestMove[] = [
  {
    player: game.players[0],
    date: new Date('2024-01-01').toISOString(),
    moveData: { number: 10 }
  },
];

const nextMove: TestMove = {
  player: game.players[1],
  date: new Date('2024-01-02').toISOString(),
  moveData: { number: 89 },
};

const gameNew: TestGameState = clone(game);
gameNew.scores = [0, 0];
gameNew.turn = game.players[0];
gameNew.gameData = {
  total: (game.gameData?.total ?? 0) - nextMove.moveData.number,
  nMoves: (game.gameData?.nMoves ?? 0) + 1,
};

const thirdMove: TestMove = {
  player: game.players[0],
  date: new Date('2024-01-03').toISOString(),
  moveData: { number: 1 },
  chatEvent: 'small_move',
};

const gameThird = clone(gameNew);
gameThird.status = 'gameover';
gameThird.scores = [30, 0];
gameThird.gameData = {
  total: gameNew.gameData.total - thirdMove.moveData.number,
  nMoves: gameNew.gameData.nMoves + 1,
};

export default {
  users,
  game,
  newgame,
  newgameOutcome,
  gameNew,
  moves,
  nextMove,
  thirdMove,
  gameThird,
};

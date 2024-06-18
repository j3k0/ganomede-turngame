
/**
 * Rules specific move specification.
 * 
 * No constraints.
 */
export type MoveData = any;

/**
 * Rules specific game specification.
 * 
 * No constraints.
 */
export type GameConfig = any;

/**
 * Rules specific dynamic game state (that changes every move)
 */
export type GameData = any;

/**
 * Move sent to the turngame server
 */
export interface Move {
    /** Player that made the move (if applicable) */
    player?: string;

    /** Date-Time the move was made in ISO-8601 format (will be missing in legacy games while we migrate) */
    date: string;

    /** Rules specific move specification */
    moveData: MoveData;
}

/**
 * State of a game stored by the turngame server.
 */
export interface GameState {
    /** Unique identifier */
    id: string;
    /** Game rules type */
    type: string;
    /** List of participant in that game */
    players: string[];
    /** Scores set when the game is over */
    scores?: number[];
    /** Current player */
    turn: string;
    /** Status of the game */
    status?: 'active' | 'gameover';
    /**
     * Game specification
     * 
     * i.e. Things one can customize when creating the game
     */
    gameConfig?: GameConfig;
    /** Game data corresponds to the state of the game in the "rules" service. */
    gameData?: GameData;
}

export interface GameStateWithMove extends GameState {
    /** Date-time the move was made in ISO-8601 format */
    moveDate: string;
    moveData?: MoveData;
}

export interface GameCreationData {
    id: string;
    players: string[];
    type?: string;
    gameConfig?: GameConfig;
}

export interface BaseMoveData {
    action?: 'kickOut' | 'resign' | string;
}

export interface BaseGameConfig {
}

export interface BaseGameData {
    players?: { score: number }[];
}

export interface Move<MoveData extends BaseMoveData = BaseMoveData> {
    player?: string; // Assuming player information might be included
    moveData: MoveData;
}

export interface GameState<GameConfig extends BaseGameConfig = BaseGameConfig, GameData extends BaseGameData = BaseGameData> {
    id: string;
    type: string;
    players: string[];
    /** Scores are set when the game is over */
    scores?: number[];
    turn: string;
    status: string;
    gameConfig?: GameConfig;
    gameData?: GameData;
}

export interface GameStateWithMove<GameConfig extends BaseGameConfig = BaseGameConfig, GameData extends BaseGameData = BaseGameData, MoveData extends BaseMoveData = BaseMoveData> extends GameState<GameConfig, GameData> {
    moveData?: MoveData;
}

export interface GameCreationData<GameConfig extends BaseGameConfig = BaseGameConfig> {
    id: string;
    players: string[];
    type?: string;
    gameConfig?: GameConfig;
}

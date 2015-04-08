clone = (obj) -> JSON.parse(JSON.stringify(obj))

users =
  'alice': {username: 'alice', token: 'alice-token'}
  'bob': {username: 'bob', token: 'bob-token'}
  'jdoe': {username: 'jdoe', token: 'jdoe-token'}

# This is a game state with moves made.
game =
  id: 'game-id'
  type: 'substract-game/v1'
  players: ['alice', 'bob']
  scores: [0, 0]
  turn: 'bob'
  status: 'active'
  gameData:
    total: 90
    nMoves: 1

newgame =
  id: 'newgame-id'
  type: 'substract-game/v1'
  players: ['alice', 'bob']
newgameOutcome =
  id: 'newgame-id'
  type: 'substract-game/v1'
  players: [ 'alice', 'bob' ]
  turn: 'alice'
  status: 'active'
  gameData: { total: 200, nMoves: 0 }

moves = [
  {player: game.players[0], move: {number: 10}}
]

# This is a new move someone makes.
nextMove =
  player: game.players[1]
  move: {number: 90}

# This is a game state after nextMove was made.
gameNew = clone(game)
gameNew.status = 'gameover'
gameNew.scores = [0, 20]
gameNew.turn
gameNew.gameData =
  total: game.gameData.total - nextMove.move.number
  nMoves: game.gameData.nMoves + 1

module.exports =
  users: users
  game: game
  newgame: newgame
  newgameOutcome: newgameOutcome
  gameNew: gameNew
  moves: moves
  nextMove: nextMove

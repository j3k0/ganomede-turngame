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
  {player: game.players[0], moveData: {number: 10}}
]

# This is a new move someone makes.
nextMove =
  player: game.players[1]
  moveData: {number: 89}

# This is a game state after nextMove was made.
gameNew = clone(game)
gameNew.scores = [0, 0]
gameNew.turn = game.players[0]
gameNew.gameData =
  total: game.gameData.total - nextMove.moveData.number
  nMoves: game.gameData.nMoves + 1

# This is a third move someone makes.
thirdMove =
  player: game.players[0]
  moveData: {number: 1}
  chatEvent: 'small_move'

# This is a game state after thirdMove was made.
gameThird = clone(gameNew)
gameThird.status = 'gameover'
gameThird.scores = [30, 0]
gameThird.gameData =
  total: gameNew.gameData.total - thirdMove.moveData.number
  nMoves: gameNew.gameData.nMoves + 1

module.exports =
  users: users
  game: game
  newgame: newgame
  newgameOutcome: newgameOutcome
  gameNew: gameNew
  moves: moves
  nextMove: nextMove
  thirdMove: thirdMove
  gameThird: gameThird

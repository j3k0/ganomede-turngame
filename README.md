Turn-Game
---------

Manage a turn based game session.

Relations
---------

The turn-game module will:

 * Manage in-progress games in the `redis_games` redis database.
 * Perform moves requested by clients using rules-api services, update `redis_games`.
 * Use the `redis_auth` database to check requester identity.

Configuration
-------------

 * `RULES_PORT_8080_TCP_ADDR` - IP of the rules service
 * `RULES_PORT_8080_TCP_PORT` - Port of the rules service
 * `NOTIFICATIONS_PORT_8080_TCP_ADDR` - IP of the notifications service
 * `NOTIFICATIONS_PORT_8080_TCP_PORT` - Port of the notifications service
 * `API_SECRET` - Secret key used to send notifications
 * `REDIS_AUTH_PORT_6379_TCP_ADDR` - IP of the AuthDB redis
 * `REDIS_AUTH_PORT_6379_TCP_PORT` - Port of the AuthDB redis
 * `REDIS_GAMES_PORT_6379_TCP_ADDR` - IP of the games redis
 * `REDIS_GAMES_PORT_6379_TCP_PORT` - Port of the games redis

API
---

All requests made to the turngame API require an auth token, passed in the request URL.

# Single Game [/turngame/v1/auth/:token/games/:id]

    + Parameters
        + token (string) ... User authentication token
        + id (string) ... ID of the game

## Retrieve a game state [GET]

### response [200] OK

    {
        "id": "ab12345789",
        "type": "triominos/v1",
        "players": [ "some_username_1", "some_username_2" ],
        "turn": "some_username_1",
        "status": "active",
        "gameData": { ... }
    }

Possible status:

 * `inactive`
 * `active`
 * `gameover`

## Create a game [POST]

Use the appropriate `rules-api` service to initiate a new game.

### body (application/json)

    {
        "type": "triominos/v1",
        "players": [ "some_username_1", "some_username_2" ],
        "gameConfig": {
            ... game specific data to be passed to the rules-api ...
        }
    }

### response [200] OK

    {
        "id": "1234",
        "type": "triominos/v1",
        "players": [ "some_username", "other_username" ],
        "turn": "some_username",
        "status": "inactive",
        "gameData": {
            ... game specific data ...
        }
    }

# Moves Collection [/turngame/v1/auth/:token/games/:id/moves]

    + Parameters
        + token (string) ... Authentication token
        + id (string) ... ID of the game

## Add a move to a game [POST]

### body (application/json)

    {
        "moveData": { ... }
    }

### response [200] OK

    {
        "id": "string",
        "type": "triominos/v1",
        "players": [ "some_username", "other_username" ],
        "turn": "other_username",
        "status": "active",
        "gameData": {
            ... game specific data ...
        },
        "moveResult" {
            ... game specific data ...
        }
    }

### response [400] Bad Request

    {
        "code": "InvalidPosition"
    }

List of codes will be application dependent, as returned by the `rules-api`

## List moves made on the given game [GET]

### response [200] OK

    [
        {
            "player": "some_username",
            "move": { ... }
        },
        {
            "player": "other_username",
            "move": { ... }
        },
        {
            "player": "some_username",
            "move": { ... }
        }
    ]

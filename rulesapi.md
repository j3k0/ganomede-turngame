Rules API
---------

This is the protocol to implement by "rules" services, used by `ganomede-turngame`.

Rules services have no persistance, they should be pure compute services.

# Game

A game has the following fields:

 * `id`
 * `players`: Array of players username
 * `turn`: username of the next player
 * `status`: one of
   * `active`
   * `gameover`
 * `gameData`: game specific data

# Moves

`moveData` and `moveResult` are game specific.

# /{type}/games [POST]

+ Parameters
    + type (string) ... Type of game

## body (application/json)

    {
        "id": "string",
        "players": [ "some_username", "other_username" ],
        "gameConfig": {
            "rules": "original"
        }
    }

## response [200] OK

    {
        "id": "string",
        "players": [ "some_username", "other_username" ],
        "turn": "some_username",
        "status": "active",
        "gameData": {
            "rules": "original"
        }
    }

## /{type}/moves [POST]

+ Parameters
    + type (string) ... Type of game

## body (application/json)

    {
        "id": "string",
        "players": [ "some_username", "other_username" ],
        "turn": "some_username",
        "status": "active",
        "gameData": {
            ... game specific data ...
        },
        "moveData": {
            ... game specific data ...
        }
    }

## response [200] OK

    {
        "id": "string",
        "players": [ "some_username", "other_username" ],
        "turn": "other_username",
        "status": "active",
        "gameData": {
            ... more game specific data ...
        },
        "moveResult" {
            ... game specific data ...
        }
    }

## response [400] Bad Request

    {
        "code": "InvalidPosition"
    }

List of codes will be application dependent.

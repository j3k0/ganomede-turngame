import log from '../log';
import pkg from '../../package.json';
import config from '../config';
import { Notification } from '../helpers/notification';
import { GameState } from '../types';

const noop = () => {};

// export interface NotificationData {
//   from: string;
//   to: string;
//   type: string;
//   data: any;
//   push?: any;
// }

/**
 * Sends `move` notification to every player participating in a game, except
 * the one who made a move.
 *
 * @param sendNotification - function with URI bound: `send(notification, callback)`
 * @param player - username of the player who made a move
 * @param newState - gameState to send
 * @param callback - optional callback function
 */
export async function moveMade (
  sendNotification: (notification: Notification, callback: (err: Error | null) => void) => void,
  player: string,
  newState: GameState,
  callback?: (err: Error | null) => void
) {
  const receivers = newState.players.filter((username: string) => username !== player);

  const send = async (username: string) => {
    // console.log('send', username);
    let game = newState;
    if (!config.notifyFullState) {
      // console.log('NOT notifying full state');
      game = {
        id: newState.id,
        players: newState.players,
        status: newState.status,
        turn: newState.turn,
        type: newState.type,
      };
    }

    const ndata: any = {
      from: pkg.api,
      to: username,
      type: moveMade.NOTIFICATION_TYPE,
      data: {
        game: game,
      },
    };

    if (newState.status === 'active' && username === newState.turn) {
      // console.log('pushing your turn');
      ndata.push = {
        app: newState.type,
        title: ['your_turn_title'],
        message: ['your_turn_message', player],
        messageArgsTypes: ['directory:name'],
      };
    } else if (newState.status === 'gameover') {
      // console.log('pushing game over');
      ndata.push = {
        app: newState.type,
        title: ['game_over_title'],
        message: ['game_over_message', player],
        messageArgsTypes: ['directory:name'],
      };
    }

    const notification = new Notification(ndata);

    return new Promise<void>((resolve, reject) => {
      // console.log('sending', notification);
      sendNotification(notification, (err: Error | null) => {
        if (err) {
          log.error('notifier.moveMade(): send() failed:', {
            error: err,
            notification: notification,
          });
          return reject(err);
        }
        resolve();
      });
    });
  };

  try {
    await Promise.all(receivers.map(send));
    if (callback) callback(null);
  } catch (err) {
    if (callback) callback(err as Error);
  }
};

moveMade.NOTIFICATION_TYPE = 'move';

export default { moveMade };

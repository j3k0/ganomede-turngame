import { Chat as HelpersChat } from 'ganomede-helpers';
import log from '../log';
import { GameState } from '../types';

const Chat = HelpersChat;

export interface ChatData {
    type: string;
    users: string[];
    timestamp: number;
    message: string;
}

// export interface ChatMessage {
//   from: string;
//   to: string;
//   data: {
//     game: {
//       id: string;
//       players: string[];
//       status: string;
//       turn: string;
//       type: string;
//     };
//   };
//   push?: {
//     app: string;
//     title: string[];
//     message: string[];
//     messageArgsTypes: string[];
//   };
// }

/**
 * A function used to send a chat message to the other players.
 * 
 * @param chat - The chat message to send.
 * @param callback - The callback to call when the message is sent.
 */
type SendChat = (chat: any, callback: (err?: Error) => void) => void;

/**
 * Listen to move events, send chat messages to the other players.
 * 
 * @param sendChat - Function to send the chat message.
 * @param chatEvent - Chat message to send.
 * @param newState - State of the game after the move.
 * @param callback - Callback to call when the message is sent.
 */
export function moveMade (
  sendChat: SendChat,
  chatEvent: string,
  newState: GameState,
  callback?: (err?: Error) => void
): void {
  if (!chatEvent) {
    return callback?.();
  }

  const sendChatData = (ndata: ChatData, cb?: (err?: Error) => void) => {
    const chat = new Chat(ndata);
    sendChat(chat, (err) => {
      if (err) {
        log.error('chat.moveMade(): send() failed:', {
          error: err,
          data: ndata,
        });
      }
      cb?.(err);
    });
  };

  // Send a chat message about the move.
  sendChatData({
    type: newState.type,
    users: newState.players,
    timestamp: Date.now(),
    message: chatEvent,
  }, newState.status === 'gameover' ? undefined : callback);

  // Send a chat message informing the other players that the game is over.
  if (newState.status === 'gameover') {
    // const pws = newState.players || [];
    let scores = newState?.scores || [];
    const players = newState?.players || [];
    const message = `gameover:${players.join(',')}:${scores.join(',')}`;
    sendChatData({
      type: newState.type,
      users: newState.players,
      timestamp: Date.now(),
      message: message,
    }, callback);
  }
};

export default { moveMade };


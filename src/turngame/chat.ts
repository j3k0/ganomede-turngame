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

type SendChat = (chat: any, callback: (err?: Error) => void) => void;

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

  sendChatData(
    {
      type: newState.type,
      users: newState.players,
      timestamp: Date.now(),
      message: chatEvent,
    },
    newState.status === 'gameover' ? undefined : callback
  );

  if (newState.status === 'gameover') {
    const pws = newState.gameData?.players || [];
    const scores = pws.map((p) => p.score);
    const message = `gameover:${newState.players.join(',')}:${scores.join(',')}`;
    sendChatData(
      {
        type: newState.type,
        users: newState.players,
        timestamp: Date.now(),
        message: message,
      },
      callback
    );
  }
};

export default { moveMade };


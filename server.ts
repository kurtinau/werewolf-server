import * as dotenv from "dotenv";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { Server, Socket } from "socket.io";
import winston from "winston";
import * as Shared from "./Shared";
import { getGameName } from "./utils";

dotenv.config();

if (!process.env.PORT) {
  process.exit(1);
}

const PORT: number = parseInt(process.env.PORT as string, 10);

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

const isProduction = process.env.NODE_ENV;

// winston logging
const myFormat = winston.format.printf((logEntryObj) => {
  return `${logEntryObj.timestamp} ${logEntryObj.level}: ${logEntryObj.message}`;
});
const combinedFormat = winston.format.combine(
  winston.format.timestamp(),
  myFormat
);
const logger = winston.createLogger({
  level: "info",
  format: combinedFormat,
  transports: [new winston.transports.File({ filename: "combined.log" })],
});
if (!isProduction) {
  logger.add(
    new winston.transports.Console({
      format: combinedFormat,
    })
  );
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  // ...
});
const userToSocketMap: { [K in string]: Socket } = {};
const startedGames = {}; // games that have started
const lobbyGames: { [K in string]: LobbyGameState } = {}; // games in lobby that have not started
const userToGameMap: { [K in string]: string } = {}; // user to game name, not game object
const lobbyGamesSeats: { [K in string]: { [K in number]: string } } = {};

class LobbyGameState {
  maxPlayers: number;
  numWerewolves: number;
  players: Set<string>;
  owner: string;
  constructor(maxPlayers: number, numWerewolves: number) {
    this.maxPlayers = maxPlayers;
    this.numWerewolves = numWerewolves;
    this.players = new Set<string>();
    this.owner = "";
  }

  serialize() {
    const serializedState = new Shared.LobbyGameState();
    serializedState.maxPlayers = this.maxPlayers;
    serializedState.numWerewolves = this.numWerewolves;
    serializedState.players = Array.from(this.players);
    serializedState.owner = this.owner;
    return serializedState;
  }

  checkIfPlayersIsFull() {
    return this.maxPlayers === this.players.size;
  }
}

io.on("connection", (socket: Socket) => {
  const username = socket.handshake.query.username?.toString();
  if (username) {
    userToSocketMap[username] = socket;
    socket.on("disconnect", () => {
      console.log("user disconnected");
      delete userToSocketMap[username];
    });

    //on INITIAL_STATUS_REQUEST
    socket.on(Shared.ClientSocketEvent.INITIALSTATUSREQUEST, () => {
      console.log("on INITIALSTATUSREQUEST");
      const gameName = userToGameMap[username];
      if (gameName) {
        if (gameName in lobbyGames) {
          socket.emit(Shared.ServerSocketEvent.INITIALSTATUSREPLY, {
            type: Shared.StatusType.INLOBBYGAME,
            gameName: gameName,
          });
        } else {
          socket.emit(Shared.ServerSocketEvent.INITIALSTATUSREPLY, {
            type: Shared.StatusType.INGAME,
            gameName: gameName,
          });
        }
      } else {
        socket.emit(Shared.ServerSocketEvent.INITIALSTATUSREPLY, {
          type: Shared.StatusType.INLOBBY,
        });
      }
    });

    //on STATUSREQUEST
    socket.on(Shared.ClientSocketEvent.STATUSREQUEST, () => {
      console.log("on STATUSREQUEST");
      const gameName = userToGameMap[username];
      if (gameName) {
        if (gameName in lobbyGames) {
          socket.emit(Shared.ServerSocketEvent.STATUSREPLY, {
            type: Shared.StatusType.INLOBBYGAME,
            gameName: gameName,
            gameState: lobbyGames[gameName].serialize(),
            lobbyGamesSeats: lobbyGamesSeats[gameName],
          });
          socket.join(gameName);
        } else {
          socket.emit(Shared.ServerSocketEvent.STATUSREPLY, {
            type: Shared.StatusType.INGAME,
            gameName: gameName,
            // gameState: startedGames[gameName].rawGameStateUpdateForPlayer(username)
          });
        }
      } else {
        socket.emit(Shared.ServerSocketEvent.STATUSREPLY, {
          type: Shared.StatusType.INLOBBY,
          // lobbyState: getSerializedLobbyState()
        });
      }
    });

    //on CREATE-GAME event
    socket.on(Shared.ClientSocketEvent.CREATEGAME, function (data) {
      if (data && data.numPlayers && data.numWerewolves) {
        if (username in userToGameMap) {
          socket.emit(Shared.ServerSocketEvent.CREATEGAMEOUTCOME, {
            type: Shared.CreateGameOutcome.ALREADYINGAME,
          });
        } else if (data.numPlayers < 4) {
          socket.emit(Shared.ServerSocketEvent.CREATEGAMEOUTCOME, {
            type: Shared.CreateGameOutcome.NOTENOUGHPLAYERS,
          });
        } else if (data.numPlayers <= data.numWerewolves * 2) {
          socket.emit(Shared.ServerSocketEvent.CREATEGAMEOUTCOME, {
            type: Shared.CreateGameOutcome.TOOMANYWEREWOLVES,
          });
        } else if (data.numWerewolves < 1) {
          socket.emit(Shared.ServerSocketEvent.CREATEGAMEOUTCOME, {
            type: Shared.CreateGameOutcome.NOTENOUGHWEREWOLVES,
          });
        } else {
          console.log("ssdfgdata::: ", data);
          //TODO check if game num already exist
          const gameNum = getGameName();
          const currentGame = (lobbyGames[gameNum] = new LobbyGameState(
            data.numPlayers,
            data.numWerewolves
          ));
          currentGame.players.add(username);
          currentGame.owner = username;
          userToGameMap[username] = gameNum;
          //set seat number for player
          lobbyGamesSeats[gameNum] = {};
          // console.log('current game players:: ', currentGame.serialize().players);
          socket.join(gameNum);
          socket.emit(Shared.ServerSocketEvent.CREATEGAMEOUTCOME, {
            type: Shared.CreateGameOutcome.SUCCESS,
            gameName: gameNum,
            gameState: currentGame.serialize(),
            lobbyGamesSeats: lobbyGamesSeats[gameNum],
          });
        }
      } else {
        socket.emit(Shared.ServerSocketEvent.CREATEGAMEOUTCOME, {
          type: Shared.CreateGameOutcome.MISSINGINFO,
        });
      }
    });

    //on Join Game
    socket.on(Shared.ClientSocketEvent.JOINGAME, (data) => {
      const { roomNum } = data;
      if (data && roomNum) {
        if (userToGameMap[username]) {
          socket.emit(Shared.ServerSocketEvent.JOINGAMEOUTCOME, {
            type: Shared.JoinGameOutcome.ALREADYINGAME,
          });
        } else if (roomNum in lobbyGames) {
          //room number exist in looby games that have not started yet
          const currentGame = lobbyGames[roomNum];
          //check if any places left
          if (currentGame.checkIfPlayersIsFull()) {
            // game is full, try join other games
            socket.emit(Shared.ServerSocketEvent.JOINGAMEOUTCOME, {
              type: Shared.JoinGameOutcome.GAMEFULL,
            });
          } else {
            //join game room
            currentGame.players.add(username);
            userToGameMap[username] = roomNum;
            socket.join(roomNum);
            socket.emit(Shared.ServerSocketEvent.JOINGAMEOUTCOME, {
              type: Shared.JoinGameOutcome.SUCCESS,
              gameState: currentGame.serialize(),
              lobbyGamesSeats: lobbyGamesSeats[roomNum],
              gameName: roomNum,
            });
            io.to(roomNum).emit(Shared.ServerSocketEvent.LOBBYGAMEUPDATE, {
              type: Shared.LobbyGameUpdate.PLAYERJOINED,
              player: username,
            });
          }
        } else if (roomNum in startedGames) {
          socket.emit(Shared.ServerSocketEvent.JOINGAMEOUTCOME, {
            type: Shared.JoinGameOutcome.GAMESTARTED,
          });
        } else {
          socket.emit(Shared.ServerSocketEvent.JOINGAMEOUTCOME, {
            type: Shared.JoinGameOutcome.DOESNOTEXIST,
          });
        }
      } else {
        socket.emit(Shared.ServerSocketEvent.JOINGAMEOUTCOME, {
          type: Shared.JoinGameOutcome.MISSINGINFO,
        });
      }
    });

    //on Toggle a seat
    socket.on(Shared.ClientSocketEvent.LOBBYGAMETOGGLEASEAT, function (data) {
      console.log("on Lobby Game Toggle a Seat");
      if (data && data.seatNum) {
        console.log("Sit at ", data);
        lobbyGamesSeats[data.gameNum][data.seatNum] = username;
        io.to(data.gameNum).emit(
          Shared.ServerSocketEvent.LOBBYGAMESEATSUPDATE,
          {
            lobbyGamesSeats: lobbyGamesSeats[data.gameNum],
          }
        );
      } else {
        console.log("Stand up ");
        const seatsObj = lobbyGamesSeats[data.gameNum];
        const seatKey = Object.keys(seatsObj).splice(
          Object.values(seatsObj).indexOf(username),
          1
        );
        console.log("seatKey::: ", seatKey);
        delete lobbyGamesSeats[data.gameNum][+seatKey[0]];
        console.log("update seats: ", lobbyGamesSeats[data.gameNum]);
        io.to(data.gameNum).emit(
          Shared.ServerSocketEvent.LOBBYGAMESEATSUPDATE,
          {
            lobbyGamesSeats: lobbyGamesSeats[data.gameNum],
          }
        );
      }
    });
  } else {
    socket.emit(
      "Shared.ServerSocketEvent.SYSTEMNOTICE",
      "Unable to determine your user account. Disconnecting."
    );
    socket.disconnect(true);
    logger.warn("User connected without session information.");
  }
});

httpServer.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

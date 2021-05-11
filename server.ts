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
    return serializedState;
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
          const gameNum = getGameName();
          const currentGame = (lobbyGames[gameNum] = new LobbyGameState(
            data.numPlayers,
            data.numWerewolves
          ));
          currentGame.players.add(username);
          currentGame.owner = username;
          userToGameMap[username] = gameNum;
          // console.log('current game players:: ', currentGame.serialize().players);
          socket.join(gameNum);
          socket.emit(Shared.ServerSocketEvent.CREATEGAMEOUTCOME, {
            type: Shared.CreateGameOutcome.SUCCESS,
            gameName: gameNum,
            gameState: currentGame.serialize(),
          });
          io.to(gameNum).emit(Shared.ServerSocketEvent.LOBBYUPDATE, {
            type: Shared.LobbyUpdate.GAMECREATED,
            game: data.name,
            numPlayers: data.numPlayers,
            numWerewolves: data.numWerewolves,
            player: username,
          });
        }
      } else {
        socket.emit(Shared.ServerSocketEvent.CREATEGAMEOUTCOME, {
          type: Shared.CreateGameOutcome.MISSINGINFO,
        });
      }
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
    socket.on(Shared.ClientSocketEvent.STATUSREQUEST, function () {
      console.log("on STATUSREQUEST");
      const gameName = userToGameMap[username];
      if (gameName) {
        if (gameName in lobbyGames) {
          socket.emit(Shared.ServerSocketEvent.STATUSREPLY, {
            type: Shared.StatusType.INLOBBYGAME,
            gameName: gameName,
            // gameState: lobbyGames[gameName].serialize()
          });
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

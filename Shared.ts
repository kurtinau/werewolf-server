export const Phases = {
  STARTED: "started",
  DAYTIME: "daytime",
  DAYTIMEVOTING: "daytimeVoting",
  ENDOFDAY: "endOfDay",
  DAYTIMEVOTEFAILED: "daytimeVoteFailed",
  NIGHTTIME: "nighttime",
  NIGHTTIMEVOTING: "nighttimeVoting",
  NIGHTTIMEVOTEFAILED: "nighttimeVoteFailed",
  ENDOFNIGHT: "endOfNight",
  OVER: "over",
};

export const Skills = {
  Elixir: {
    CANNOTSAVEYOURSELF: "canNotSaveYourself",
    CANSAVEYOURSELF: "canSaveYourself",
    CANSAVEYOURSELFONLY1STNIGHT: "canSaveYourselfOnly1stNight",
  },
  Poison: {
    CANUSEWITHELIXIR: "canUseWithElixir",
    CANNOTUSEWITHELIXIR: "canNotUseWithElixir",
  },
  Bodyguard: {
    DEADWHENGUARDANDSAVE: "deadWhenGuardAndSave",
    NOTDEADWHENGUARDANDSAVE: "notDeadWhenGuardAndSave",
  },
};

export const ServerSocketEvent = {
  // SYSTEMNOTICE: "systemNotice", // notices from server unrelated to the happenings inside the game
  INITIALSTATUSREPLY: "initialStatusReply", // excludes state details
  STATUSREPLY: "statusReply", // reply to STATUSREQUEST by client containing game information
  // GAMEACTION: "gameAction", // action related to the context of the game itself
  LOBBYUPDATE: "lobbyUpdate", // update to the status of the game lobby (e.g. a player joins/leaves a game)
  // LOBBYSTATEREPLY: "lobbyState", // message containing complete state of lobby
  // LOBBYGAMESTATEREPLY: "lobbyGameState", // message containing complete state of a lobby game
  // LOBBYUPDATESSUBSCRIBED: "lobbyUpdatesSubscribed", // confirmation that lobby updates room has been joined
  // LOBBYUPDATESUNSUBSCRIBED: "lobbyUpdatesUnsubscribed",
  CREATEGAMEOUTCOME: "createGameOutcome", // outcome of a create game request, enumerated in CreateGameOutcome
  // LEAVEGAMEOUTCOME: "leaveGameOutcome",
  // JOINGAMEOUTCOME: "joinGameOutcome",
  // GAMESTARTED: "gameStarted", // sent when the last player joins a lobby game and the game controller is created
  // // clients must request initial status update via GAMEACTION message
  // GAMEENDED: "gameEnded", // clients are notified of the start to a game via GAMEACTION messages
  // REMOVEDFROMGAME: "removedFromGame", // removed from game due to exceptional circumstances
  // LOBBYGAMECHATMESSAGE: "lobbyGameChatMessage",
  // LOBBYGAMESTATEUPDATE: "lobbyGameStateUpdate"
  USEREXISTED: "usernameExisted",
  CONNECTSUCCESS: "connectSuccess",
};

export const ClientSocketEvent = {
  // GAMEACTION: "gameAction", // action related to the context of the game itself
  INITIALSTATUSREQUEST: "initialStatusRequest", // request for reply that excludes state details
  STATUSREQUEST: "statusRequest", // request from client asking for the client's status (e.g. whether it is in a game)
  // LOBBYSTATEREQUEST: "lobbyStateRequest", // client message asking for complete state of lobby
  // LOBBYGAMESTATEREQUEST: "lobbyGameStateRequest",
  // SUBSCRIBELOBBYUPDATES: "subscribeLobbyUpdates", // request to join lobby updates room
  UNSUBSCRIBELOBBYUPDATES: "unsubscribeLobbyUpdates",
  // JOINGAME: "joinGame",
  CREATEGAME: "createGame",
  // LEAVEGAME: "leaveGame", // leave game in lobby before it has started. Currenlty no way to leave started games.
  // LOBBYGAMECHATMESSAGE: "lobbyGameChatMessage"
};

export const CreateGameOutcome = {
  ALREADYINGAME: "alreadyInGame",
  MISSINGINFO: "missingInfo",
  NAMEEXISTS: "nameExists",
  NOTENOUGHPLAYERS: "notEnoughPlayers",
  TOOMANYWEREWOLVES: "tooManyWerewolves",
  NOTENOUGHWEREWOLVES: "notEnoughWerewolves",
  INTERNALERROR: "internalError",
  SUCCESS: "success",
};

export const StatusType = {
  INGAME: "inGame",
  INLOBBYGAME: "inLobbyGame",
  INLOBBY: "inLobby",
};

export const LobbyUpdate = {
  GAMECREATED: "gameCreated",
  PLAYERLEFT: "playerLeft",
  PLAYERJOINED: "playerJoined",
  GAMEDELETED: "gameDeleted",
  GAMESTARTED: "gameStarted",
};

export class Player {}

export class LobbyGameState {
  maxPlayers: number;
  numWerewolves: number;
  players: Array<string>;
  owner: string;
  constructor() {
    this.maxPlayers = 0;
    this.numWerewolves = 0;
    this.players = [];
    this.owner = "";
  }
}

import { Server as SocketIOServer, Socket } from 'socket.io';
import { createServer, Server as HTTPServer } from 'http';
import { v4 as uuidv4 } from 'uuid';

// --- Game Constants ---
const GRAVITY = 0.25; // Adjusted to match single-player
const JUMP_STRENGTH = -7; // Adjusted to match single-player
const GAME_UPDATE_INTERVAL = 16; // ms - Reduced to ~60 FPS for smoother gameplay
const BIRD_START_Y = 250;
const GAME_AREA_HEIGHT = 500;
const TOP_BOUNDARY = 0;
const BOTTOM_BOUNDARY = GAME_AREA_HEIGHT - 24; // Adjusted for bird height

// --- Bird Constants ---
const FIXED_BIRD_X_POSITION = 50; // Bird's fixed X position on the canvas
const BIRD_WIDTH = 34;  // Width of the bird
const BIRD_HEIGHT = 24; // Height of the bird

// --- Obstacle Constants ---
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = GAME_AREA_HEIGHT;
const OBSTACLE_WIDTH = 50;
const OBSTACLE_GAP_SIZE = 200; // Increased to match singleplayer
const OBSTACLE_SPEED = 3; // Increased to match singleplayer
const OBSTACLE_GENERATION_INTERVAL_X = 300; // Adjusted to match singleplayer
const MIN_PIPE_HEIGHT = 50;

// --- Interfaces and Data Structures ---
interface Player {
  id: string; // This is socket.id
  customName?: string; // Added for custom player names
  birdY: number;
  velocity: number;
  score: number;
  gameOver: boolean;
  passedObstacles: Set<string>; // Store IDs of passed obstacles
}

interface Obstacle {
  id: string;
  x: number;
  topPipeHeight: number;
}

interface Lobby {
  id: string;
  players: Record<string, Player>;
  gameState: 'waiting' | 'active' | 'finished';
  obstacles: Obstacle[];
  gameLoopIntervalId: NodeJS.Timeout | null;
  nextObstacleId: number;
}

const lobbies: Record<string, Lobby> = {};
const MAX_PLAYERS_PER_LOBBY = 2;

const httpServer: HTTPServer = createServer();
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*", // Allow connections from any origin
    methods: ["GET", "POST"],
    credentials: true // Often needed
  }
});

const PORT = process.env.SOCKET_PORT ? parseInt(process.env.SOCKET_PORT, 10) : 3001;

// Add an error listener to the httpServer itself
httpServer.on('error', (error) => { 
  console.error('HTTP Server Error:', error); 
});

// --- Utility Functions ---
function generateUniqueLobbyId(): string {
  let newLobbyId;
  do {
    newLobbyId = uuidv4().substring(0, 8);
  } while (lobbies[newLobbyId]);
  return newLobbyId;
}

function generateUniqueObstacleId(lobby: Lobby): string {
  const id = lobby.nextObstacleId.toString();
  lobby.nextObstacleId++;
  return id;
}

function getLobbyState(lobbyId: string): Lobby | null {
  const lobby = lobbies[lobbyId];
  if (!lobby) return null;
  try {
    const { gameLoopIntervalId, ...lobbyStateForClient } = lobby;
    // Convert Set to Array for JSON stringification
    const playersForClient: Record<string, any> = {};
    for (const playerId in lobbyStateForClient.players) {
        const player = lobbyStateForClient.players[playerId];
        playersForClient[playerId] = {
            ...player,
            passedObstacles: Array.from(player.passedObstacles || [])
        };
    }
    const finalState = { ...lobbyStateForClient, players: playersForClient };
    return JSON.parse(JSON.stringify(finalState));
  } catch (error) {
    console.error("Error deep copying lobby state:", error, lobby);
    return null;
  }
}

function initializePlayer(id: string, customName?: string): Player {
  return {
    id,
    customName: customName || `P-${id.substring(0, 5)}`, // Use provided name or generate default
    birdY: BIRD_START_Y,
    velocity: 0,
    score: 0,
    gameOver: false,
    passedObstacles: new Set<string>(), // Initialize passedObstacles
  };
}

function generateNewObstacle(lobby: Lobby, xPosition: number): Obstacle {
  const topPipeHeight = Math.random() * (CANVAS_HEIGHT - OBSTACLE_GAP_SIZE - MIN_PIPE_HEIGHT * 2) + MIN_PIPE_HEIGHT;
  return {
    id: generateUniqueObstacleId(lobby),
    x: xPosition,
    topPipeHeight: topPipeHeight,
  };
}

// --- Server-Side Game Loop ---
function startGameLoop(lobbyId: string) {
  const lobby = lobbies[lobbyId];
  if (!lobby) return;

  if (lobby.gameLoopIntervalId) {
    clearInterval(lobby.gameLoopIntervalId);
  }

  lobby.gameState = 'active';
  lobby.nextObstacleId = 0;

  Object.values(lobby.players).forEach(player => {
    // Preserve customName if it exists, otherwise re-initialize with a default or new one if provided
    const existingCustomName = player.customName;
    const newPlayerState = initializePlayer(player.id, existingCustomName);
    lobby.players[player.id] = { ...newPlayerState }; // Completely replace with new state
  });
  
  lobby.obstacles = [];
  for (let i = 0; i < 2; i++) {
    lobby.obstacles.push(generateNewObstacle(lobby, CANVAS_WIDTH + i * OBSTACLE_GENERATION_INTERVAL_X));
  }

  io.to(lobbyId).emit('gameStarted', getLobbyState(lobbyId));

  lobby.gameLoopIntervalId = setInterval(() => {
    const currentLobby = lobbies[lobbyId];
    if (!currentLobby || currentLobby.gameState !== 'active') {
      if (currentLobby && currentLobby.gameLoopIntervalId) {
        clearInterval(currentLobby.gameLoopIntervalId);
        currentLobby.gameLoopIntervalId = null;
      }
      return;
    }

    // Move Obstacles
    currentLobby.obstacles.forEach(obstacle => obstacle.x -= OBSTACLE_SPEED);

    // Remove Off-Screen Obstacles & Generate New Ones
    currentLobby.obstacles = currentLobby.obstacles.filter(o => o.x + OBSTACLE_WIDTH > 0);
    const lastObstacle = currentLobby.obstacles[currentLobby.obstacles.length - 1];
    if (!lastObstacle || lastObstacle.x < CANVAS_WIDTH - OBSTACLE_GENERATION_INTERVAL_X) {
      currentLobby.obstacles.push(generateNewObstacle(currentLobby, CANVAS_WIDTH));
    }
    
    let allPlayersGameOver = true;
    for (const playerId in currentLobby.players) {
      const player = currentLobby.players[playerId];
      if (player.gameOver) continue;
      allPlayersGameOver = false;

      // Apply physics
      player.velocity += GRAVITY;
      player.birdY += player.velocity;

      // Bird's bounding box
      const birdTop = player.birdY - BIRD_HEIGHT / 2;
      const birdBottom = player.birdY + BIRD_HEIGHT / 2;
      const birdLeft = FIXED_BIRD_X_POSITION - BIRD_WIDTH / 2;
      const birdRight = FIXED_BIRD_X_POSITION + BIRD_WIDTH / 2;

      // Boundary Checks (ground and ceiling)
      if (birdBottom >= BOTTOM_BOUNDARY) {
        player.birdY = BOTTOM_BOUNDARY - BIRD_HEIGHT / 2;
        player.gameOver = true;
        player.velocity = 0;
        io.to(lobbyId).emit('playerGameOver', player.id, "hit_ground");
      }
      if (birdTop <= TOP_BOUNDARY) {
        player.birdY = TOP_BOUNDARY + BIRD_HEIGHT / 2;
        player.gameOver = true; // Typically Flappy Bird ends on ceiling hit too
        player.velocity = 0;
        io.to(lobbyId).emit('playerGameOver', player.id, "hit_ceiling");
      }

      // Collision Detection with Obstacles
      if (!player.gameOver) { // Only check collisions if not already game over by boundary
        for (const obstacle of currentLobby.obstacles) {
          const obstacleLeft = obstacle.x;
          const obstacleRight = obstacle.x + OBSTACLE_WIDTH;
          const topPipeBottom = obstacle.topPipeHeight;
          const bottomPipeTop = obstacle.topPipeHeight + OBSTACLE_GAP_SIZE;

          if (birdRight > obstacleLeft && birdLeft < obstacleRight) {
            if (birdTop < topPipeBottom || birdBottom > bottomPipeTop) {
              player.gameOver = true;
              player.velocity = 0; // Stop further movement
              console.log(`Player ${player.id} collided with obstacle ${obstacle.id}`);
              io.to(lobbyId).emit('playerCollision', { playerId: player.id, obstacleId: obstacle.id });
              io.to(lobbyId).emit('playerGameOver', player.id, "hit_obstacle"); // More specific game over
              break; // No need to check other obstacles for this player
            }
          }
        }
      }

      // Scoring Logic
      if (!player.gameOver) {
        for (const obstacle of currentLobby.obstacles) {
          if (!player.passedObstacles.has(obstacle.id)) {
            // Bird's center X (FIXED_BIRD_X_POSITION) passed obstacle's right edge
            if (FIXED_BIRD_X_POSITION > obstacle.x + OBSTACLE_WIDTH) {
              player.passedObstacles.add(obstacle.id);
              player.score += 1;
              console.log(`Player ${player.id} scored! New score: ${player.score}`);
            }
          }
        }
      }
    } // End player loop

    io.to(lobbyId).emit('gameStateUpdate', getLobbyState(lobbyId));

    if (allPlayersGameOver && currentLobby.gameState === 'active') {
      currentLobby.gameState = 'finished';
      if (currentLobby.gameLoopIntervalId) {
        clearInterval(currentLobby.gameLoopIntervalId);
        currentLobby.gameLoopIntervalId = null;
      }
      io.to(lobbyId).emit('gameFinished', getLobbyState(lobbyId));
    }
  }, GAME_UPDATE_INTERVAL);
}

// --- Event Handlers for Restart Game ---
function restartGame(lobbyId: string) {
  const lobby = lobbies[lobbyId];
  if (!lobby) return false;
  
  // Only allow restart if game is finished
  if (lobby.gameState !== 'finished') return false;
  
  // Reset lobby to 'waiting' state and restart game
  lobby.gameState = 'waiting';
  
  // Reset player states but keep names and connections
  Object.keys(lobby.players).forEach(playerId => {
    const customName = lobby.players[playerId].customName;
    lobby.players[playerId] = initializePlayer(playerId, customName);
  });
  
  // Clear obstacles
  lobby.obstacles = [];
  
  // Notify all players of game restart
  io.to(lobbyId).emit('gameRestarted', getLobbyState(lobbyId));
  
  // Start game if there are enough players
  if (Object.keys(lobby.players).length >= 2) {
    startGameLoop(lobbyId);
  } else {
    io.to(lobbyId).emit('waitingForPlayers', getLobbyState(lobbyId));
  }
  
  return true;
}

// --- Socket Event Handlers (largely unchanged, ensure initializePlayer is used) ---
io.on('connection', (socket: Socket) => {
  console.log(`New client connected: ${socket.id} from ${socket.handshake.address}`);
  socket.data.lobbyId = null;

  socket.on('createLobby', (data: { customName?: string }) => {
    const playerId = socket.id;
    if (Object.values(lobbies).some(l => l.players[playerId])) {
      const existingLobby = Object.values(lobbies).find(l => l.players[playerId]);
      if (existingLobby) {
        socket.emit('alreadyInLobby', existingLobby.id);
        return;
      }
    }

    const lobbyId = generateUniqueLobbyId();
    const player = initializePlayer(playerId, data.customName); // Pass customName here
    lobbies[lobbyId] = {
      id: lobbyId,
      players: { [playerId]: player },
      gameState: 'waiting',
      obstacles: [],
      gameLoopIntervalId: null,
      nextObstacleId: 0,
    };
    socket.join(lobbyId);
    socket.data.lobbyId = lobbyId; // Set the lobbyId in socket data
    socket.emit('lobbyCreated', lobbyId);
    io.to(lobbyId).emit('lobbyStateUpdated', getLobbyState(lobbyId));
    console.log(`Player ${player.customName} (ID: ${playerId}) created lobby ${lobbyId}`);
  });

  socket.on('joinLobby', (data: { lobbyIdToJoin: string, customName?: string }) => {
    const { lobbyIdToJoin, customName } = data;
    const playerId = socket.id;
    const lobby = lobbies[lobbyIdToJoin];

    if (!lobby) {
      socket.emit('lobbyNotFound', lobbyIdToJoin);
      return;
    }
    if (Object.values(lobby.players).length >= MAX_PLAYERS_PER_LOBBY) {
      socket.emit('lobbyFull', lobbyIdToJoin);
      return;
    }
    if (lobby.players[playerId]) {
      socket.emit('alreadyInLobby', lobbyIdToJoin); // Or just resend state
      io.to(lobbyIdToJoin).emit('lobbyStateUpdated', getLobbyState(lobbyIdToJoin));
      return;
    }

    const player = initializePlayer(playerId, customName); // Pass customName here
    lobby.players[playerId] = player;
    socket.join(lobbyIdToJoin);
    socket.data.lobbyId = lobbyIdToJoin; // Set the lobbyId in socket data
    socket.emit('lobbyJoined', lobbyIdToJoin, getLobbyState(lobbyIdToJoin));
    io.to(lobbyIdToJoin).emit('lobbyStateUpdated', getLobbyState(lobbyIdToJoin)); // Inform others
    console.log(`Player ${player.customName} (ID: ${playerId}) joined lobby ${lobbyIdToJoin}`);

    // Start game if lobby is now full
    if (Object.values(lobby.players).length === MAX_PLAYERS_PER_LOBBY && lobby.gameState === 'waiting') {
      console.log(`Lobby ${lobbyIdToJoin} is full, starting game...`);
      startGameLoop(lobbyIdToJoin);
    }
  });

  // Add a handler for explicit tracking
  socket.on('trackLobby', (lobbyId: string) => {
    const lobby = lobbies[lobbyId];
    if (lobby && lobby.players[socket.id]) {
      socket.data.lobbyId = lobbyId;
      console.log(`Socket ${socket.id} now explicitly tracking lobby ${lobbyId}`);
    }
  });

  socket.on('playerJump', (explicitLobbyId?: string) => {
    // Try explicit lobby ID first, then fallback to socket.data
    const lobbyId = explicitLobbyId || socket.data.lobbyId;
    const playerId = socket.id;
    
    // Log received jump command
    console.log(`Received jump from ${playerId} for lobby ${lobbyId}`);
    
    if (lobbyId && lobbies[lobbyId] && lobbies[lobbyId].players[playerId]) {
      const lobby = lobbies[lobbyId];
      const player = lobby.players[playerId];
      if (lobby.gameState === 'active' && !player.gameOver) {
        player.velocity = JUMP_STRENGTH;
        console.log(`Player ${player.customName} jumped!`);
      } else {
        console.log(`Jump rejected: gameState=${lobby.gameState}, playerGameOver=${player.gameOver}`);
      }
    } else {
      console.log(`Jump failed: lobbyId=${lobbyId}, player in lobby=${lobbyId && lobbies[lobbyId] && lobbies[lobbyId].players[playerId]}`);
    }
  });

  socket.on('disconnect', (reason: string) => {
    const lobbyId = socket.data.lobbyId;
    if (lobbyId && lobbies[lobbyId]) {
      const lobby = lobbies[lobbyId];
      delete lobby.players[socket.id];
      if (Object.keys(lobby.players).length === 0) {
        if (lobby.gameLoopIntervalId) clearInterval(lobby.gameLoopIntervalId);
        delete lobbies[lobbyId];
      } else {
        io.to(lobbyId).emit('playerLeft', socket.id, getLobbyState(lobbyId));
        io.to(lobbyId).emit('lobbyStateUpdated', getLobbyState(lobbyId));
        const activePlayers = Object.values(lobby.players).filter(p => !p.gameOver);
        if (activePlayers.length === 0 && lobby.gameState === 'active') {
          lobby.gameState = 'finished';
          if (lobby.gameLoopIntervalId) clearInterval(lobby.gameLoopIntervalId);
          io.to(lobbyId).emit('gameFinished', getLobbyState(lobbyId));
        }
      }
    }
    socket.data.lobbyId = null;
  });

  socket.on('leaveLobby', () => {
    const lobbyId = socket.data.lobbyId;
    const playerId = socket.id;
    if (lobbyId && lobbies[lobbyId] && lobbies[lobbyId].players[playerId]) {
      const lobby = lobbies[lobbyId];
      delete lobby.players[playerId];
      socket.leave(lobbyId);
      socket.data.lobbyId = null;
      socket.emit('leftLobbySuccess');
      if (Object.keys(lobby.players).length === 0) {
        if (lobby.gameLoopIntervalId) clearInterval(lobby.gameLoopIntervalId);
        delete lobbies[lobbyId];
      } else {
        io.to(lobbyId).emit('playerLeft', playerId, getLobbyState(lobbyId));
        io.to(lobbyId).emit('lobbyStateUpdated', getLobbyState(lobbyId));
        if (lobby.gameState === 'active') {
          const activePlayers = Object.values(lobby.players).filter(p => !p.gameOver);
          if (activePlayers.length === 0) {
            lobby.gameState = 'finished';
            if (lobby.gameLoopIntervalId) clearInterval(lobby.gameLoopIntervalId);
            io.to(lobbyId).emit('gameFinished', getLobbyState(lobbyId));
          }
        }
      }
    } else {
      socket.emit('errorLeavingLobby', 'You are not currently in a lobby or data mismatch.');
    }
  });

  // Handle restart game request
  socket.on('restartGame', () => {
    const lobbyId = socket.data.lobbyId;
    const playerId = socket.id;
    
    if (!lobbyId || !lobbies[lobbyId]) {
      socket.emit('restartGameError', 'Lobby not found');
      return;
    }
    
    const lobby = lobbies[lobbyId];
    
    // Only allow the "host" (first player who created the lobby) to restart the game
    const playerIds = Object.keys(lobby.players);
    const isHost = playerIds.length > 0 && playerIds[0] === playerId;
    
    if (!isHost) {
      socket.emit('restartGameError', 'Only the lobby host can restart the game');
      return;
    }
    
    if (lobby.gameState !== 'finished') {
      socket.emit('restartGameError', 'Game can only be restarted when finished');
      return;
    }
    
    const success = restartGame(lobbyId);
    if (success) {
      console.log(`Game restarted in lobby ${lobbyId} by host ${playerId}`);
    } else {
      socket.emit('restartGameError', 'Failed to restart game');
    }
  });
});

console.log(`Socket.IO server attempting to listen on port ${PORT}`);
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Socket.IO server listening on 0.0.0.0:${PORT} (all network interfaces)`);
});

export { io, httpServer };

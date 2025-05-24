"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useRef, useState, useCallback } from "react";
import io, { Socket } from "socket.io-client";

// Interfaces
interface Obstacle { id: string; x: number; topPipeHeight: number; passed?: boolean; }
interface Cloud { x: number; y: number; width: number; speed: number; }
interface PlayerState {
  id: string;
  customName?: string;
  birdY: number;
  velocity: number; // Server might not send this, used for client-side rotation if desired
  score: number;
  gameOver: boolean;
}
interface LobbyState { id: string; players: Record<string, PlayerState>; gameState: "waiting" | "active" | "finished"; obstacles: Obstacle[]; }

// Function to determine socket server URL based on environment
const getSocketServerUrl = () => {
  // Get the hostname from the current browser URL (works across network)
  const hostname = window.location.hostname;
  
  // Check if running in localhost (development)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  
  // For network connections, use the external IP address
  // This assumes the server is running on the same machine as the Next.js app
  return `http://${hostname}:3001`;
};

// Constants for drawing (consistent with single-player)
const BIRD_WIDTH = 34;
const BIRD_HEIGHT = 24;
const OBSTACLE_WIDTH = 50;
// const OBSTACLE_GAP = 200; // Server controls this (OBSTACLE_GAP_SIZE)
const BIRD_COLOR = "coral";
const OBSTACLE_COLOR = "green";
const SCORE_COLOR = "coral";
const BACKGROUND_COLOR = "#87CEEB";
const FRAMES_PER_ANIMATION = 10; // For bird wing flapping
const JUMP_STRENGTH = -7; // Match server-side for client-side prediction

// Helper to create a cloud (now needs canvas dimensions or pass them)
const createNewCloud = (canvasWidth: number, canvasHeight: number): Cloud => ({
  x: canvasWidth,
  y: Math.random() * (canvasHeight / 2),
  width: Math.random() * 50 + 30,
  speed: Math.random() * 0.5 + 0.5, // Increased speed to match singleplayer
});

export default function MultiplayerPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [playerIdInput, setPlayerIdInput] = useState<string>(""); // Renamed to avoid confusion with socket.id
  const [lobbyId, setLobbyId] = useState<string>("");
  const [currentLobbyIdInput, setCurrentLobbyIdInput] = useState<string>("");
  const [lobbyState, setLobbyState] = useState<LobbyState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [canvasHeight, setCanvasHeight] = useState(0);

  // Refs for animation state managed outside React state updates per frame
  const localCloudsRef = useRef<Cloud[]>([]);
  const birdFramesRef = useRef<Record<string, number>>({}); // Stores animation frame for each bird
  const lobbyStateRef = useRef(lobbyState); // Ref to current lobbyState for animation loop

  useEffect(() => {
    lobbyStateRef.current = lobbyState;
  }, [lobbyState]);

  // Socket Connection and Event Handlers
  useEffect(() => {
    const socketServerUrl = getSocketServerUrl();
    console.log("Connecting to socket server at:", socketServerUrl);
    
    // Add connection options for better reliability across networks
    const newSocket = io(socketServerUrl, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      transports: ['websocket', 'polling'] // Try websocket first, fallback to polling
    });
    
    setSocket(newSocket);

    // Connection events with better logging
    newSocket.on("connect", () => {
      console.log("Connected to socket server:", newSocket.id);
      setError(null);
      setMessage("Connected to game server");
    });
    
    newSocket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
      setError(`Connection error: ${err.message}. Retrying...`);
    });
    
    newSocket.on("connect_timeout", () => {
      console.error("Socket connection timeout");
      setError("Connection timeout. Check your network.");
    });
    
    newSocket.on("reconnect", (attemptNumber) => {
      console.log(`Reconnected to socket server after ${attemptNumber} attempts`);
      setError(null);
      setMessage("Reconnected to game server");
    });
    
    newSocket.on("reconnect_failed", () => {
      console.error("Socket reconnection failed");
      setError("Failed to reconnect. Please refresh the page.");
    });
    
    newSocket.on("disconnect", () => {
      console.log("Disconnected from socket server");
      setError("Disconnected from server. Attempting to reconnect...");
    });
    
    newSocket.on("error", (err: any) => {
      console.error("Socket error:", err);
      setError(err.message || "A socket error occurred.");
    });

    // Lobby Events
    newSocket.on("lobbyCreated", (newLobbyId: string) => {
      setMessage(`Lobby created: ${newLobbyId}`);
      setLobbyId(newLobbyId);
      setError(null);
      // Tell server to track this socket in the lobby
      newSocket.emit("trackLobby", newLobbyId);
    });
    newSocket.on("lobbyJoined", (joinedLobbyId: string, currentLobbyState: LobbyState) => {
      setMessage(`Joined lobby: ${joinedLobbyId}`);
      setLobbyId(joinedLobbyId);
      setLobbyState(currentLobbyState);
      setError(null);
      // Tell server to track this socket in the lobby
      newSocket.emit("trackLobby", joinedLobbyId);
    });
    newSocket.on("lobbyNotFound", (notFoundLobbyId: string) => setError(`Lobby ${notFoundLobbyId} not found.`));
    newSocket.on("lobbyFull", (fullLobbyId: string) => setError(`Lobby ${fullLobbyId} is full.`));
    newSocket.on("alreadyInLobby", (currentLobby: string) => {
      setError(`You are already in lobby: ${currentLobby}`);
      setLobbyId(currentLobby);
    });
    newSocket.on("leftLobbySuccess", () => {
      setMessage("Successfully left the lobby.");
      setLobbyId("");
      setLobbyState(null);
    });
    newSocket.on("errorLeavingLobby", (errMsg: string) => setError(`Error leaving lobby: ${errMsg}`));

    // Game State Events
    newSocket.on("lobbyStateUpdated", (updatedLobbyState: LobbyState) => setLobbyState(updatedLobbyState));
    newSocket.on("gameStateUpdate", (updatedLobbyState: LobbyState) => setLobbyState(updatedLobbyState));
    newSocket.on("gameStarted", (initialLobbyState: LobbyState) => {
      setMessage("Game started!");
      setLobbyState(initialLobbyState);
      birdFramesRef.current = {}; // Reset bird frames on new game
    });
    newSocket.on("gameRestarted", (initialLobbyState: LobbyState) => {
      setMessage("Game restarted!");
      setLobbyState(initialLobbyState);
      birdFramesRef.current = {}; // Reset bird frames on game restart
      setError(null); // Clear any existing errors
    });
    newSocket.on("restartGameError", (errorMessage: string) => {
      setError(`Error restarting game: ${errorMessage}`);
    });
    newSocket.on("waitingForPlayers", (updatedLobbyState: LobbyState) => {
      setMessage("Waiting for more players to join...");
      setLobbyState(updatedLobbyState);
    });
    newSocket.on("playerGameOver", (pId: string, reason: string) => console.log(`Player ${pId} game over: ${reason}`));
    newSocket.on("playerCollision", (data: { playerId: string, obstacleId: string }) => console.log(`Player ${data.playerId} collided with ${data.obstacleId}`));
    newSocket.on("gameFinished", (finalLobbyState: LobbyState) => {
      setMessage("Game finished!");
      setLobbyState(finalLobbyState);
    });
    newSocket.on("playerLeft", (leftPlayerId: string, updatedLobbyState: LobbyState) => {
      setMessage(`Player ${leftPlayerId} left the lobby.`);
      setLobbyState(updatedLobbyState);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []); // Empty dependency array means this effect runs once on mount and cleanup on unmount

  // Canvas Setup and Resize Handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const calculatedWidth = Math.min(window.innerWidth * 0.9, 600);
      canvas.width = calculatedWidth;
      canvas.height = 400;
      setCanvasWidth(canvas.width);
      setCanvasHeight(canvas.height);
      // Initialize clouds when canvas is first sized
      if (localCloudsRef.current.length === 0 && canvas.width > 0) {
        localCloudsRef.current = Array(5).fill(null).map(() => createNewCloud(canvas.width, canvas.height));
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []); // Runs once on mount to setup canvas and resizer

  // Main Game Loop (using requestAnimationFrame)
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || canvasWidth === 0 || canvasHeight === 0) return; // Ensure canvas is ready

    let animationFrameId: number;

    // --- Drawing Functions (defined stably or passed ctx and data) ---
    const drawBird = (context: CanvasRenderingContext2D, player: PlayerState, frame: number) => {
      const x = 50;
      const y = player.birdY;
      context.save();
      context.translate(x, y);
      // Rotate based on velocity (like in singleplayer)
      const rotation = Math.min(Math.max(player.velocity / 10, -0.5), 0.5);
      context.rotate(rotation);
      context.fillStyle = BIRD_COLOR;
      context.beginPath();
      context.ellipse(0, 0, BIRD_WIDTH / 2, BIRD_HEIGHT / 2, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#FF5000";
      const wingOffset = Math.sin(frame / 5) * 3;
      context.beginPath();
      context.ellipse(-5, wingOffset, BIRD_WIDTH / 4, BIRD_HEIGHT / 3, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "white";
      context.beginPath();
      context.arc(BIRD_WIDTH / 4, -BIRD_HEIGHT / 6, BIRD_WIDTH / 10, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "black";
      context.beginPath();
      context.arc(BIRD_WIDTH / 4 + 1, -BIRD_HEIGHT / 6, BIRD_WIDTH / 20, 0, Math.PI * 2);
      context.fill();
      context.restore();
    };

    const drawObstacle = (context: CanvasRenderingContext2D, obstacle: Obstacle) => {
      const pipeBodyColor = OBSTACLE_COLOR;
      const pipeBorderColor = "#006400";
      const pipeCapHeight = 20;
      const pipeCapWidth = OBSTACLE_WIDTH + 10;
      context.fillStyle = pipeBodyColor;
      context.fillRect(obstacle.x, 0, OBSTACLE_WIDTH, obstacle.topPipeHeight - pipeCapHeight);
      context.fillStyle = pipeBorderColor;
      context.fillRect(obstacle.x - 5, obstacle.topPipeHeight - pipeCapHeight, pipeCapWidth, pipeCapHeight);
      const gapBottom = obstacle.topPipeHeight + 150; // Assuming 150 is server's OBSTACLE_GAP_SIZE
      context.fillStyle = pipeBodyColor;
      context.fillRect(obstacle.x, gapBottom + pipeCapHeight, OBSTACLE_WIDTH, canvasHeight - gapBottom - pipeCapHeight);
      context.fillStyle = pipeBorderColor;
      context.fillRect(obstacle.x - 5, gapBottom, pipeCapWidth, pipeCapHeight);
    };

    const drawBackground = (context: CanvasRenderingContext2D, cloudsToDraw: Cloud[]) => {
      context.fillStyle = BACKGROUND_COLOR;
      context.fillRect(0, 0, canvasWidth, canvasHeight);
      const groundHeight = 20;
      context.fillStyle = "#8B4513";
      context.fillRect(0, canvasHeight - groundHeight, canvasWidth, groundHeight);
      context.fillStyle = "#567d46";
      context.fillRect(0, canvasHeight - groundHeight, canvasWidth, 5);
      context.fillStyle = "rgba(255, 255, 255, 0.8)";
      cloudsToDraw.forEach(cloud => {
        context.beginPath();
        context.arc(cloud.x, cloud.y, cloud.width / 3, 0, Math.PI * 2);
        context.arc(cloud.x + cloud.width / 4, cloud.y - cloud.width / 4, cloud.width / 4, 0, Math.PI * 2);
        context.arc(cloud.x + cloud.width / 3, cloud.y, cloud.width / 3.5, 0, Math.PI * 2);
        context.arc(cloud.x + cloud.width / 1.5, cloud.y, cloud.width / 4, 0, Math.PI * 2);
        context.fill();
      });
    };

    const drawScoresDisplay = (context: CanvasRenderingContext2D, currentLobby: LobbyState | null) => {
      if (!currentLobby) return;
      context.fillStyle = SCORE_COLOR;
      context.font = "16px Arial";
      let yPos = canvasHeight - 70;
      const xPos = 10;
      const lineHeight = 20;

      Object.values(currentLobby.players).forEach(p => {
        const displayName = p.customName || `Player ${p.id.substring(0, 6)}`;
        const scoreText = `${displayName} - Score: ${p.score}`;
        context.fillText(scoreText, xPos, yPos);
        if (p.gameOver) {
          context.fillStyle = "red";
          const gameOverText = "(Game Over)";
          const scoreTextWidth = context.measureText(scoreText).width;
          if (xPos + scoreTextWidth + context.measureText(gameOverText).width + 5 > canvasWidth) {
            context.fillText(gameOverText, xPos, yPos + lineHeight / 2); // Draw on next logical line if cramped
          } else {
            context.fillText(gameOverText, xPos + scoreTextWidth + 5, yPos);
          }
          context.fillStyle = SCORE_COLOR;
        }
        yPos += lineHeight;
      });
    };

    const gameLoop = () => {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Update cloud positions (mutate ref)
      localCloudsRef.current.forEach(cloud => { cloud.x -= cloud.speed; });
      localCloudsRef.current = localCloudsRef.current.filter(c => c.x + c.width > 0);
      if (localCloudsRef.current.length < 5 && Math.random() < 0.02 && canvasWidth > 0) { // Increased frequency to match singleplayer
        localCloudsRef.current.push(createNewCloud(canvasWidth, canvasHeight));
      }
      drawBackground(ctx, localCloudsRef.current);

      const currentLobby = lobbyStateRef.current;
      if (currentLobby) {
        if (currentLobby.gameState === "active") {
          currentLobby.obstacles.forEach(obs => drawObstacle(ctx, obs));
          Object.values(currentLobby.players).forEach(player => {
            birdFramesRef.current[player.id] = ((birdFramesRef.current[player.id] || 0) + 1) % (FRAMES_PER_ANIMATION * 2);
            drawBird(ctx, player, birdFramesRef.current[player.id]);
          });
        } else if (currentLobby.gameState === "finished") {
          ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);
          ctx.fillStyle = "white";
          ctx.font = "bold 48px Arial";
          ctx.textAlign = "center";
          ctx.fillText("GAME FINISHED", canvasWidth / 2, canvasHeight / 2 - 50);
          
          // Display restart instructions
          ctx.font = "bold 20px Arial";
          if (socket?.id && Object.keys(currentLobby.players).length > 0 && Object.keys(currentLobby.players)[0] === socket.id) {
            ctx.fillText("Press the Restart Game button below", canvasWidth / 2, canvasHeight / 2 + 10);
          } else {
            ctx.fillText("Waiting for the host to restart...", canvasWidth / 2, canvasHeight / 2 + 10);
          }
          
          ctx.textAlign = "start"; // Reset alignment
        } else if (currentLobby.gameState === "waiting") {
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);
          ctx.fillStyle = "white";
          ctx.font = "bold 30px Arial";
          ctx.textAlign = "center";
          ctx.fillText("Waiting for players...", canvasWidth / 2, canvasHeight / 2);
          if (lobbyId) ctx.fillText(`Lobby ID: ${lobbyId}`, canvasWidth / 2, canvasHeight / 2 + 40);
          ctx.textAlign = "start"; // Reset alignment
        }
        drawScoresDisplay(ctx, currentLobby);
      }
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    gameLoop();
    return () => cancelAnimationFrame(animationFrameId);
  // Dependencies: lobbyState (for game logic), canvasWidth/Height (for dimensions)
  // Drawing functions are defined inside this effect's scope but are stable if their code doesn't change.
  // If they were outside and memoized, that would be cleaner.
  }, [canvasWidth, canvasHeight, lobbyId]); // lobbyState removed previously, which is correct for game loop

  // Action Handlers
  const handleCreateLobby = () => {
    if (socket) {
      socket.emit("createLobby", { customName: playerIdInput || undefined }); // Send undefined if empty
      setMessage("Creating lobby...");
      setError(null);
    }
  };

  const handleJoinLobby = () => {
    if (socket && currentLobbyIdInput) {
      socket.emit("joinLobby", { lobbyIdToJoin: currentLobbyIdInput, customName: playerIdInput || undefined });
      setMessage(`Joining lobby ${currentLobbyIdInput}...`);
      setError(null);
    } else if (!currentLobbyIdInput) {
      setError("Please enter a Lobby ID to join.");
    }
  };

  const handleLeaveLobby = () => {
    if (socket && lobbyId) socket.emit("leaveLobby");
  };

  const handleRestartGame = () => {
    if (socket && lobbyId && lobbyState?.gameState === "finished") {
      socket.emit("restartGame");
      setMessage("Requesting game restart...");
      setError(null);
    }
  };

  const handleJump = useCallback(() => {
    // Simplify jump logic - don't rely on lobbyState
    if (!socket || !lobbyId) {
      return;
    }

    // Provide immediate visual feedback locally before server confirms
    // This creates the appearance of more responsive controls
    if (lobbyStateRef.current?.players && socket.id && lobbyStateRef.current.players[socket.id]) {
      // Apply a temporary local velocity change for responsive feel
      const player = lobbyStateRef.current.players[socket.id];
      if (player && !player.gameOver) {
        player.velocity = -7; // Match JUMP_STRENGTH
        player.birdY += player.velocity; // Move bird immediately for visual feedback
      }
    }

    // Send the jump command with the lobby ID for redundancy
    socket.emit("playerJump", lobbyId);
  }, [socket, lobbyId]); // Removed lobbyState as a dependency to prevent stale jumps

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") handleJump();
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleJump]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("click", handleJump);
    return () => canvas.removeEventListener("click", handleJump);
  }, [handleJump]);

  // UI Rendering
  const renderLobbyControls = () => (
    <div className="p-4 space-y-4 bg-white shadow-md rounded-lg my-4">
      <h1 className="text-3xl font-bold text-center text-gray-700">Flappy Buddies Multiplayer</h1>
      {error && <p className="text-red-600 bg-red-100 p-3 rounded-md border border-red-300">Error: {error}</p>}
      {message && <p className="text-blue-600 bg-blue-100 p-3 rounded-md border border-blue-300">Status: {message}</p>}
      {!lobbyId ? (
        <div className="space-y-3">
          <div>
            <Input
              type="text"
              placeholder="Enter Your Player Name (Optional)"
              value={playerIdInput}
              onChange={(e) => setPlayerIdInput(e.target.value)}
              className="mb-2 w-full"
            />
          </div>
          <Button onClick={handleCreateLobby} className="w-full bg-green-500 hover:bg-green-600 text-white">Create New Lobby</Button>
          <div className="flex items-center space-x-2 mt-2">
            <Input
              type="text"
              placeholder="Enter Lobby ID to Join"
              value={currentLobbyIdInput}
              onChange={(e) => setCurrentLobbyIdInput(e.target.value)}
              className="flex-grow"
            />
            <Button onClick={handleJoinLobby} className="bg-blue-500 hover:bg-blue-600 text-white">Join Lobby</Button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <p className="font-semibold text-gray-700">In Lobby: <span className="font-normal text-indigo-600">{lobbyId}</span></p>
          <Button onClick={handleLeaveLobby} variant="outline" className="w-full mt-3 border-red-500 text-red-500 hover:bg-red-50">Leave Lobby</Button>
        </div>
      )}
    </div>
  );

  const renderGameInfo = () => {
    if (!lobbyState) return null;
    return (
      <div className="p-4 text-sm bg-white shadow-md rounded-lg mt-4 w-full max-w-md text-gray-700">
        <h2 className="text-xl font-semibold mb-2">Lobby: {lobbyState.id}</h2>
        <p className="mb-1">Game State: <span className="font-medium text-indigo-600">{lobbyState.gameState}</span></p>
        <h3 className="font-semibold mt-3 mb-1">Players:</h3>
        <ul className="list-disc list-inside space-y-1">
          {Object.values(lobbyState.players).map((p) => (
            <li key={p.id} className={`${p.id === socket?.id ? "font-bold text-blue-700" : "text-gray-600"} ${p.gameOver ? "line-through text-red-500" : ""}`}>
              {p.customName || `Player ${p.id.substring(0, 6)}`} - Score: {p.score}
            </li>
          ))}
        </ul>
        {lobbyState.gameState === "finished" && (
          <div className="mt-4 text-center border-t pt-3">
            <p className="text-lg font-bold text-gray-800">Game Over!</p>
            
            {/* Check if this player is the host (first player) */}
            {socket && Object.keys(lobbyState.players).length > 0 && Object.keys(lobbyState.players)[0] === socket.id ? (
              <div className="mt-2">
                <Button 
                  onClick={handleRestartGame} 
                  className="w-full bg-green-500 hover:bg-green-600 text-white"
                >
                  Restart Game
                </Button>
                <p className="mt-1 text-xs text-gray-500">As the host, you can restart the game for all players.</p>
              </div>
            ) : (
              <p className="mt-1 text-xs text-gray-500">
                Only the lobby host can restart the game. Wait for them to restart or leave and create/join a new lobby.
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-sky-100 p-4">
      {renderLobbyControls()}
      <canvas ref={canvasRef} className="border-2 border-gray-300 shadow-lg rounded-md" />
      {lobbyState && renderGameInfo()}
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";

// --- Interfaces (matching server-side structures) ---
interface PlayerFromServer {
  id: string;
  birdY: number;
  score: number;
  gameOver: boolean;
  velocity?: number;
}

// Obstacle interface as received from the server
interface ObstacleFromServer {
    id: string;
    x: number;
    topPipeHeight: number;
}

interface LobbyFromServer {
  id: string;
  players: Record<string, PlayerFromServer>;
  gameState: 'waiting' | 'active' | 'finished';
  obstacles: ObstacleFromServer[]; 
}

// --- Game Constants (client-side for rendering) ---
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 500;
const BIRD_X_POSITION = 50; // Bird's fixed X position
const BIRD_WIDTH = 34;    // Client-side bird width (matches server)
const BIRD_HEIGHT = 24;   // Client-side bird height (matches server)

// --- Obstacle Constants (client-side for rendering) ---
const OBSTACLE_WIDTH_CLIENT = 50; // Must match server's OBSTACLE_WIDTH
const OBSTACLE_GAP_SIZE_CLIENT = 150; // Must match server's OBSTACLE_GAP_SIZE
const OBSTACLE_COLOR = '#228B22'; // Green color for obstacles

// Helper function to draw a single obstacle (top and bottom pipes)
const drawObstacle = (
    ctx: CanvasRenderingContext2D,
    obstacle: ObstacleFromServer,
    canvasHeight: number // This is CANVAS_HEIGHT
) => {
    ctx.fillStyle = OBSTACLE_COLOR;
    // Draw top pipe
    ctx.fillRect(obstacle.x, 0, OBSTACLE_WIDTH_CLIENT, obstacle.topPipeHeight);
    // Draw bottom pipe
    const bottomPipeTopY = obstacle.topPipeHeight + OBSTACLE_GAP_SIZE_CLIENT;
    ctx.fillRect(obstacle.x, bottomPipeTopY, OBSTACLE_WIDTH_CLIENT, canvasHeight - bottomPipeTopY);
};


export default function MultiplayerPage() {
  // Lobby and connection state
  const [lobbyIdInput, setLobbyIdInput] = useState("");
  const [isCreatingLobby, setIsCreatingLobby] = useState(false);
  const [isJoiningLobby, setIsJoiningLobby] = useState(false);
  const [lobbyMessage, setLobbyMessage] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);

  // Game state
  const [players, setPlayers] = useState<Record<string, PlayerFromServer>>({});
  const [obstacles, setObstacles] = useState<ObstacleFromServer[]>([]); // Typed correctly
  const [currentLobbyDetails, setCurrentLobbyDetails] = useState<LobbyFromServer | null>(null);
  const [isGameActive, setIsGameActive] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setLocalPlayerId(newSocket.id || null);
      setLobbyMessage("Connected. Ready to create/join lobby.");
    });

    newSocket.on('disconnect', () => {
      setLobbyMessage("Disconnected. Please refresh.");
      setIsGameActive(false); setCurrentLobbyDetails(null); setPlayers({}); setObstacles([]);
    });

    newSocket.on('connect_error', (err: any) => { // Add 'any' type for err.data if not typed by socket.io-client
      console.error('Socket connection error:', err);
      console.error('Error type:', err.constructor.name); // e.g., Error, TypeError
      console.error('Error message:', err.message);
      if (err.data) { // Additional context often in err.data
        console.error('Error data:', err.data);
      }
      setLobbyMessage(`Connection Failed: ${err.message}. Ensure server is running & check console.`);
      setIsCreatingLobby(false); // Reset loading states
      setIsJoiningLobby(false);
    });

    newSocket.on('error', (err: any) => { // Add 'any' type for err.data if not typed by socket.io-client
      console.error('Socket general error:', err);
      setLobbyMessage(`Socket Error: ${err.message}. Check console.`);
    });

    // Lobby events
    newSocket.on('lobbyCreated', (newLobbyId: string) => {
      setLobbyIdInput(newLobbyId);
      setLobbyMessage(`Lobby created: ${newLobbyId}. Waiting for players...`);
      setIsCreatingLobby(false);
    });

    newSocket.on('lobbyJoined', (joinedLobbyId: string, initialLobbyState: LobbyFromServer) => {
      setLobbyMessage(`Joined lobby: ${joinedLobbyId}`);
      setCurrentLobbyDetails(initialLobbyState);
      setPlayers(initialLobbyState.players);
      setObstacles(initialLobbyState.obstacles || []); // Ensure obstacles is always an array
      setLobbyIdInput(joinedLobbyId);
      setIsJoiningLobby(false);
      setIsGameActive(initialLobbyState.gameState === 'active');
    });
    
    newSocket.on('lobbyStateUpdated', (lobbyState: LobbyFromServer) => {
      setCurrentLobbyDetails(lobbyState);
      setPlayers(lobbyState.players);
      setObstacles(lobbyState.obstacles || []); // Ensure obstacles is always an array
      setIsGameActive(lobbyState.gameState === 'active');
      if (lobbyState.gameState === 'finished') {
        setLobbyMessage("Game finished. View scores.");
      }
    });
    
    newSocket.on('playerLeft', (playerId: string, updatedLobbyState: LobbyFromServer) => {
        setLobbyMessage(`Player ${playerId.substring(0,6)} left.`);
        setCurrentLobbyDetails(updatedLobbyState);
        setPlayers(updatedLobbyState.players);
        setObstacles(updatedLobbyState.obstacles || []);
        setIsGameActive(updatedLobbyState.gameState === 'active');
    });

    newSocket.on('lobbyNotFound', (id: string) => { setLobbyMessage(`Lobby ${id} not found.`); setIsJoiningLobby(false); });
    newSocket.on('lobbyFull', (id: string) => { setLobbyMessage(`Lobby ${id} is full.`); setIsJoiningLobby(false); });
    newSocket.on('alreadyInLobby', (id: string) => { setLobbyMessage(`Already in lobby ${id}.`); setIsCreatingLobby(false); setIsJoiningLobby(false);});
    newSocket.on('leftLobbySuccess', () => {
        setLobbyMessage("You left the lobby.");
        setCurrentLobbyDetails(null); setPlayers({}); setObstacles([]); setIsGameActive(false); setLobbyIdInput("");
    });
    newSocket.on('errorLeavingLobby', (message: string) => setLobbyMessage(`Error leaving: ${message}`));


    // Game events
    newSocket.on('gameStateUpdate', (lobbyState: LobbyFromServer) => {
      setPlayers(lobbyState.players);
      setObstacles(lobbyState.obstacles || []); // Ensure obstacles is always an array
      setCurrentLobbyDetails(lobbyState);
      if (lobbyState.gameState === 'active' && !isGameActive) setIsGameActive(true);
      else if (lobbyState.gameState !== 'active' && isGameActive) {
        setIsGameActive(false);
        if (lobbyState.gameState === 'finished') setLobbyMessage("Game Over! Final scores shown.");
      }
    });

    newSocket.on('gameStarted', (initialLobbyState: LobbyFromServer) => {
      setLobbyMessage("Game started!");
      setCurrentLobbyDetails(initialLobbyState);
      setPlayers(initialLobbyState.players);
      setObstacles(initialLobbyState.obstacles || []);
      setIsGameActive(true);
    });
    
    newSocket.on('playerGameOver', (gameOverPlayerId: string, reason: string) => {
        if (gameOverPlayerId === localPlayerId) {
            setLobbyMessage(`Game Over! You ${reason.replace('_', ' ')}.`);
        }
    });
    newSocket.on('playerCollision', (data: {playerId: string, obstacleId: string}) => {
        // Can be used for sound effects or specific visual feedback
        console.log(`Player ${data.playerId} collided with obstacle ${data.obstacleId}`);
    });


    newSocket.on('gameFinished', (finalLobbyState: LobbyFromServer) => {
      setLobbyMessage("Game finished! Final scores:");
      setCurrentLobbyDetails(finalLobbyState);
      setPlayers(finalLobbyState.players);
      setObstacles(finalLobbyState.obstacles || []);
      setIsGameActive(false);
    });

    return () => {
      newSocket.disconnect();
      // Remove all specific listeners by not listing them individually, or list all
      newSocket.offAny();
    };
  }, []);

  useEffect(() => {
    if (isGameActive && canvasRef.current && currentLobbyDetails) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      const renderLoop = () => {
        if (!isGameActive || !currentLobbyDetails) return;
        
        context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        context.fillStyle = '#70c5ce';
        context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw Obstacles
        (obstacles || []).forEach(obstacle => { // Ensure obstacles is an array before iterating
            drawObstacle(context, obstacle, CANVAS_HEIGHT);
        });

        // Draw Players
        Object.values(players).forEach(player => {
          // Bird's Y is its center, adjust for fillRect's top-left origin
          const birdDrawY = player.birdY - BIRD_HEIGHT / 2; 
          const birdDrawX = BIRD_X_POSITION - BIRD_WIDTH / 2;

          context.fillStyle = player.id === localPlayerId ? 'yellow' : '#ff8c00'; // Yellow for local, Orange for others
          if (player.gameOver) {
            context.globalAlpha = 0.5; // Make game over birds semi-transparent
          }
          context.fillRect(birdDrawX, birdDrawY, BIRD_WIDTH, BIRD_HEIGHT);
          context.globalAlpha = 1.0; // Reset alpha

          // Draw score near bird
          context.fillStyle = 'black';
          context.font = '12px Arial';
          context.fillText(`${player.score}`, birdDrawX + BIRD_WIDTH / 2 - 5, birdDrawY - 5);
        });
        
        if (isGameActive) requestAnimationFrame(renderLoop);
      };
      requestAnimationFrame(renderLoop);
    }
  }, [isGameActive, players, localPlayerId, currentLobbyDetails, obstacles]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if ((event.code === 'Space' || event.code === 'ArrowUp') && socket && isGameActive && localPlayerId && players[localPlayerId] && !players[localPlayerId].gameOver) {
        socket.emit('playerJump');
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [socket, isGameActive, localPlayerId, players]);

  const handleCreateLobby = () => { if (socket?.connected && !currentLobbyDetails) { setIsCreatingLobby(true); setLobbyMessage("Creating..."); socket.emit('createLobby'); }};
  const handleJoinLobby = () => { if (socket?.connected && lobbyIdInput && !currentLobbyDetails) { setIsJoiningLobby(true); setLobbyMessage(`Joining ${lobbyIdInput}...`); socket.emit('joinLobby', lobbyIdInput); }};
  const handleLeaveLobby = () => { if (socket?.connected && currentLobbyDetails) { socket.emit('leaveLobby'); }};

  const renderLobbyUI = () => (
    <>
      <div className="mt-6">
        <Card className="w-full max-w-md">
          <CardHeader><CardTitle>Create Lobby</CardTitle></CardHeader>
          <CardContent>
            <Button onClick={handleCreateLobby} disabled={isCreatingLobby || !socket?.connected || !!currentLobbyDetails}>Create</Button>
          </CardContent>
        </Card>
      </div>
      <div className="mt-6">
        <Card className="w-full max-w-md">
          <CardHeader><CardTitle>Join Lobby</CardTitle></CardHeader>
          <CardContent>
            <Input type="text" placeholder="Lobby ID" value={lobbyIdInput} onChange={(e) => setLobbyIdInput(e.target.value.trim())} disabled={isJoiningLobby || !socket?.connected || !!currentLobbyDetails} />
            <Button onClick={handleJoinLobby} disabled={!lobbyIdInput || isJoiningLobby || !socket?.connected || !!currentLobbyDetails} className="mt-2">Join</Button>
          </CardContent>
        </Card>
      </div>
      {currentLobbyDetails && <Button className="mt-4" onClick={handleLeaveLobby}>Leave Lobby</Button>}
    </>
  );

  const renderGameUI = () => (
    <div className="mt-6 flex flex-col items-center">
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="border border-gray-700 shadow-lg"></canvas>
      <p className="mt-2 text-sm">Lobby: {currentLobbyDetails?.id} | Press Space/Up to Jump</p>
      {Object.values(players).map(p => (
        <p key={p.id} className="text-xs">Player {p.id === localPlayerId ? '(You)' : p.id.substring(0,6)}: {p.score} {p.gameOver ? '(Game Over)' : ''}</p>
      ))}
       {currentLobbyDetails && currentLobbyDetails.gameState !== 'active' && /* Show leave button if game is not active but still in game UI (e.g. stuck state) */
            <Button className="mt-4" onClick={handleLeaveLobby}>Leave Lobby</Button>
       }
    </div>
  );

  const renderFinishedUI = () => (
    <div className="mt-6">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Game Finished!</CardTitle></CardHeader>
        <CardContent>
          <p>Lobby: {currentLobbyDetails?.id}</p>
          <h3 className="font-semibold mt-2">Final Scores:</h3>
          {Object.values(players).map(player => ( <p key={player.id}>{player.id === localPlayerId ? 'You' : `Player ${player.id.substring(0,6)}`}: {player.score}</p> ))}
          <Button className="mt-4" onClick={handleLeaveLobby}>Back to Lobby Selection</Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-100">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-4 sm:px-20 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-blue-600">Multiplayer Flappy Bird</h1>
        {lobbyMessage && (
          <div className="mt-4 p-2 bg-blue-100 text-blue-700 rounded-md shadow text-sm max-w-md w-full">
            <p>{lobbyMessage}</p>
          </div>
        )}
        {!socket?.connected && <p className="text-red-500 mt-4">Connecting to server...</p>}

        {isGameActive && currentLobbyDetails?.gameState === 'active' ? renderGameUI() : 
         !isGameActive && currentLobbyDetails?.gameState === 'finished' ? renderFinishedUI() : 
         renderLobbyUI()
        }
      </main>
    </div>
  );
}

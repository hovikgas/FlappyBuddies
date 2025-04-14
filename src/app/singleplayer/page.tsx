"use client";

import {Button} from "@/components/ui/button";
import {useEffect, useRef, useState} from "react";

interface Obstacle {
  x: number;
  height: number;
  passed: boolean;
}

interface Cloud {
  x: number;
  y: number;
  width: number;
  speed: number;
}

export default function SinglePlayerPage() {
  try {
    const [birdY, setBirdY] = useState(200);
    const [velocity, setVelocity] = useState(0);
    const [obstacles, setObstacles] = useState<Obstacle[]>([]);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [canvasWidth, setCanvasWidth] = useState(0);
    const [canvasHeight, setCanvasHeight] = useState(0);
    const [gameInitialized, setGameInitialized] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [highScore, setHighScore] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const canvasRef = useRef(null);
    
    // Add refs for immediate state access during animation
    const birdYRef = useRef(birdY);
    const velocityRef = useRef(velocity);
    const gameOverRef = useRef(gameOver);
    const obstaclesRef = useRef(obstacles);

    const gravity = 0.25;
    const jumpStrength = -7;
    const obstacleSpeed = 3;
    const obstacleWidth = 50;
    const obstacleGap = 200;
    const birdX = 50;

    const newObstacleDistance = 300;

    const birdWidth = 34;
    const birdHeight = 24;

    // Bird animation state
    const [birdFrame, setBirdFrame] = useState(0);
    const [clouds, setClouds] = useState<Cloud[]>([]);
    
    const framesPerAnimation = 10; // Adjust for animation speed

    const obstacleColor = "green";
    const scoreColor = "coral";
    const birdColor = "coral";
    const backgroundColor = "#87CEEB"; // Sky blue background

    useEffect(() => {
      birdYRef.current = birdY;
    }, [birdY]);

    useEffect(() => {
      velocityRef.current = velocity;
    }, [velocity]);

    useEffect(() => {
      gameOverRef.current = gameOver;
    }, [gameOver]);

    useEffect(() => {
      obstaclesRef.current = obstacles;
    }, [obstacles]);

    useEffect(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");

      const resizeCanvas = () => {
        if (!canvas) return;
        const calculatedWidth = Math.min(window.innerWidth, 600);
        canvas.width = calculatedWidth;
        canvas.height = 400;
        setCanvasWidth(canvas.width);
        setCanvasHeight(canvas.height);
      };

      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);

      if (!canvas || !ctx) return;

      let animationFrameId: number;

      const drawBird = (x: number, y: number) => {
        if (!ctx) return;
        
        // Save context to restore after drawing
        ctx.save();
        
        // Move to bird position
        ctx.translate(x, y);
        
        // Rotate bird based on velocity (diving/climbing)
        const rotation = Math.min(Math.max(velocity / 10, -0.5), 0.5);
        ctx.rotate(rotation);
        
        // Draw bird body
        ctx.fillStyle = birdColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, birdWidth / 2, birdHeight / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw wing - animate based on frame
        ctx.fillStyle = "#FF5000";
        const wingOffset = Math.sin(birdFrame / 5) * 3;
        ctx.beginPath();
        ctx.ellipse(-5, wingOffset, birdWidth / 4, birdHeight / 3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw eye
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(birdWidth / 4, -birdHeight / 6, birdWidth / 10, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(birdWidth / 4 + 1, -birdHeight / 6, birdWidth / 20, 0, Math.PI * 2);
        ctx.fill();
        
        // Restore context
        ctx.restore();
        
        // Update frame for wing animation
        setBirdFrame((birdFrame + 1) % (framesPerAnimation * 2));
      };

      const drawObstacle = (x: number, gapTop: number) => {
        if (!ctx) return;
        
        const pipeBodyColor = obstacleColor;
        const pipeBorderColor = "#006400";  // Darker green for borders
        const pipeCapHeight = 20;
        const pipeCapWidth = obstacleWidth + 10;
        
        // Top pipe
        // Pipe body
        ctx.fillStyle = pipeBodyColor;
        ctx.fillRect(x, 0, obstacleWidth, gapTop - pipeCapHeight);
        
        // Pipe cap
        ctx.fillStyle = pipeBorderColor;
        ctx.fillRect(x - 5, gapTop - pipeCapHeight, pipeCapWidth, pipeCapHeight);
        
        // Bottom pipe
        // Calculate bottom pipe starting position (after the gap)
        const gapBottom = gapTop + obstacleGap;
        
        // Pipe body
        ctx.fillStyle = pipeBodyColor;
        ctx.fillRect(x, gapBottom + pipeCapHeight, obstacleWidth, canvas.height - gapBottom - pipeCapHeight);
        
        // Pipe cap
        ctx.fillStyle = pipeBorderColor;
        ctx.fillRect(x - 5, gapBottom, pipeCapWidth, pipeCapHeight);
        
        // Add some depth - lighter highlight on the left side
        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.fillRect(x, 0, 3, gapTop - pipeCapHeight); // Top pipe highlight
        ctx.fillRect(x, gapBottom + pipeCapHeight, 3, canvas.height - gapBottom - pipeCapHeight); // Bottom pipe highlight
      };

      // Function to create a new cloud
      const createCloud = () => {
        return {
          x: canvas.width,
          y: Math.random() * (canvas.height / 2),
          width: Math.random() * 50 + 30,
          speed: Math.random() * 0.5 + 0.5
        };
      };

      // Function to draw background with clouds
      const drawBackground = () => {
        if (!ctx) return;
        
        // Sky
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Ground
        const groundHeight = 20;
        ctx.fillStyle = "#8B4513"; // Brown color for ground
        ctx.fillRect(0, canvas.height - groundHeight, canvas.width, groundHeight);
        
        // Grass
        ctx.fillStyle = "#567d46"; // Green for grass
        ctx.fillRect(0, canvas.height - groundHeight, canvas.width, 5);
        
        // Draw clouds
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        clouds.forEach(cloud => {
          // Draw fluffy cloud shape
          ctx.beginPath();
          ctx.arc(cloud.x, cloud.y, cloud.width / 3, 0, Math.PI * 2);
          ctx.arc(cloud.x + cloud.width / 4, cloud.y - cloud.width / 4, cloud.width / 4, 0, Math.PI * 2);
          ctx.arc(cloud.x + cloud.width / 3, cloud.y, cloud.width / 3.5, 0, Math.PI * 2);
          ctx.arc(cloud.x + cloud.width / 1.5, cloud.y, cloud.width / 4, 0, Math.PI * 2);
          ctx.fill();
        });
      };

      const updateGame = () => {
        if (gameOverRef.current) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw background
        drawBackground();
        
        // If game is paused, show pause screen and don't update game state
        if (isPaused) {
          // Draw semi-transparent overlay
          ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw pause text
          ctx.fillStyle = "white";
          ctx.font = "bold 36px Arial";
          ctx.textAlign = "center";
          ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2 - 20);
          
          // Draw instructions
          ctx.font = "16px Arial";
          ctx.fillText("Press 'P' to resume", canvas.width / 2, canvas.height / 2 + 20);
          
          // Show scores
          ctx.textAlign = "start";
          drawScores();
          
          // Request next frame but don't update game state
          animationFrameId = requestAnimationFrame(updateGame);
          return;
        }

        drawBird(birdX, birdYRef.current);

        obstaclesRef.current.forEach(obstacle => {
          drawObstacle(obstacle.x, obstacle.height);
        });

        // Update Bird Position
        const newVelocity = velocityRef.current + gravity;
        velocityRef.current = newVelocity;
        setVelocity(newVelocity);
        
        const newBirdY = birdYRef.current + newVelocity;
        birdYRef.current = newBirdY;
        setBirdY(newBirdY);

        // Keep bird within bounds
        if (birdYRef.current < birdHeight / 2) {
          birdYRef.current = birdHeight / 2;
          setBirdY(birdHeight / 2);
          velocityRef.current = 0;
          setVelocity(0);
        }
        if (birdYRef.current > canvas.height - birdHeight / 2) {
          gameOverRef.current = true;
          setGameOver(true);
          birdYRef.current = canvas.height - birdHeight / 2;
          setBirdY(canvas.height - birdHeight / 2);
          velocityRef.current = 0;
          setVelocity(0);
        }

        // Update Clouds
        setClouds(prevClouds => {
          // Move clouds
          const updatedClouds = prevClouds.map(cloud => ({
            ...cloud,
            x: cloud.x - cloud.speed,
          }));
          
          // Remove clouds that are off screen
          const visibleClouds = updatedClouds.filter(cloud => cloud.x + cloud.width > 0);
          
          // Add new cloud occasionally
          if (visibleClouds.length < 5 && Math.random() < 0.01) {
            visibleClouds.push(createCloud());
          }
          
          return visibleClouds;
        });
        
        // Update Obstacles
        setObstacles(prevObstacles => {
          const updatedObstacles = prevObstacles.map(obstacle => ({
            ...obstacle,
            x: obstacle.x - obstacleSpeed,
          }));

          // Remove passed obstacles
          const visibleObstacles = updatedObstacles.filter(
            obstacle => obstacle.x + obstacleWidth > 0
          );

          // Add new obstacle if needed
          if (
            visibleObstacles.length === 0 ||
            visibleObstacles[visibleObstacles.length - 1].x < canvas.width - newObstacleDistance
          ) {
            // Calculate minimum and maximum positions for the gap
            const minGapPosition = 80; // Minimum distance from top
            const maxGapPosition = canvas.height - obstacleGap - 80; // Maximum distance from top, leaving room for gap and bottom pipe
            
            // Generate random position for the top of the gap
            const gapTopPosition = Math.floor(Math.random() * (maxGapPosition - minGapPosition)) + minGapPosition;
            
            visibleObstacles.push({x: canvas.width, height: gapTopPosition, passed: false});
          }

          return visibleObstacles;
        });

        // Collision Detection
        obstaclesRef.current.forEach(obstacle => {
          if (!ctx) return;

          const birdTop = birdYRef.current - birdHeight / 2;
          const birdBottom = birdYRef.current + birdHeight / 2;
          const birdLeft = birdX - birdWidth / 2;
          const birdRight = birdX + birdWidth / 2;
          const obstacleLeft = obstacle.x;
          const obstacleRight = obstacle.x + obstacleWidth;

          // Use circular hitbox for more precise collision detection
          const collisionRadius = Math.min(birdWidth, birdHeight) / 2.5;
          const birdCenterX = birdX;
          const birdCenterY = birdYRef.current;
          
          // Calculate gap bottom based on our new system
          const gapTop = obstacle.height;
          const gapBottom = gapTop + obstacleGap;
          
          // Check collision with top pipe
          if (
            birdRight > obstacleLeft &&
            birdLeft < obstacleRight &&
            birdTop < gapTop
          ) {
            if (!gameOverRef.current) {
              // Visual collision feedback
              ctx.fillStyle = "rgba(255, 0, 0, 0.3)"; // red flash
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              
              // Draw impact effect
              ctx.strokeStyle = "white";
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(birdCenterX, birdCenterY, collisionRadius * 1.5, 0, Math.PI * 2);
              ctx.stroke();
            }
            setGameOver(true);
          }

          // Check collision with bottom pipe
          if (
            birdRight > obstacleLeft &&
            birdLeft < obstacleRight &&
            birdBottom > gapBottom
          ) {
            if (!gameOverRef.current) {
              // Visual collision feedback
              ctx.fillStyle = "rgba(255, 0, 0, 0.3)"; // red flash
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              
              // Draw impact effect
              ctx.strokeStyle = "white";
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(birdCenterX, birdCenterY, collisionRadius * 1.5, 0, Math.PI * 2);
              ctx.stroke();
            }
            setGameOver(true);
          }

          if (obstacleLeft + obstacleWidth < birdX && !obstacle.passed) {
            // Mark this obstacle as passed to prevent scoring multiple times
            obstacle.passed = true;
            
            setObstacles(prevObstacles => {
              return prevObstacles.map(obs => {
                if (obs.x === obstacle.x) {
                  return {...obs, passed: true};
                }
                return obs;
              });
            });

            // Increment score by exactly 1
            setScore(prevScore => {
              const newScore = prevScore + 1;
              // Update high score if current score is higher
              if (newScore > highScore) {
                setHighScore(newScore);
                localStorage.setItem('flappyHighScore', newScore.toString());
              }
              return newScore;
            });
          }
        });

        // Draw scores
        drawScores();

        // Request next animation frame
        animationFrameId = requestAnimationFrame(updateGame);
      };
      
      // Function to draw scores
      const drawScores = () => {
        if (!ctx) return;
        
        // Draw score
        ctx.fillStyle = scoreColor;
        ctx.font = "20px Arial";
        ctx.fillText(`Score: ${score}`, 10, canvasHeight - 40);
        
        // Draw high score
        ctx.fillStyle = "#FFD700"; // Gold color for high score
        ctx.fillText(`High Score: ${highScore}`, 10, canvasHeight - 10);
        
        // If game over, display game over screen
        if (gameOver) {
          // Semi-transparent overlay
          ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);
          
          // Game over text
          ctx.fillStyle = "white";
          ctx.font = "bold 48px Arial";
          ctx.textAlign = "center";
          ctx.fillText("GAME OVER", canvasWidth / 2, canvasHeight / 2 - 50);
          
          // Final score
          ctx.font = "24px Arial";
          ctx.fillText(`Final Score: ${score}`, canvasWidth / 2, canvasHeight / 2);
          
          // New high score message if applicable
          if (score >= highScore && score > 0) {
            ctx.fillStyle = "#FFD700"; // Gold color
            ctx.fillText("NEW HIGH SCORE!", canvasWidth / 2, canvasHeight / 2 + 30);
          }
          
          // Instructions to restart
          ctx.fillStyle = "white";
          ctx.font = "18px Arial";
          ctx.fillText("Press 'R' to restart", canvasWidth / 2, canvasHeight / 2 + 60);
          
          // Reset text alignment
          ctx.textAlign = "start";
        }
      };

      // Start the game loop
      if (gameInitialized && !gameOver) {
        // Immediately start the animation loop
        animationFrameId = requestAnimationFrame(updateGame);
      } else if (gameOver) {
        // If game over, draw the game over screen
        drawScores();
      }

      return () => {
        window.removeEventListener("resize", resizeCanvas);
        canvas.removeEventListener("click", handleJump);
        cancelAnimationFrame(animationFrameId);
      };
    }, [gameOver, gameInitialized, gameStarted, birdY, velocity, obstacles, isPaused, score, highScore]);

    const resetGame = () => {
      setBirdY(200);
      setVelocity(0);
      setObstacles([{
        x: canvasWidth,
        height: Math.floor(Math.random() * (canvasHeight / 2)) + 50,
        passed: false
      }]);
      
      // Initialize clouds at different positions
      const initialClouds: Cloud[] = Array(5).fill(null).map(() => ({
        x: Math.random() * canvasWidth,
        y: Math.random() * (canvasHeight / 2),
        width: Math.random() * 50 + 30,
        speed: Math.random() * 0.5 + 0.5
      }));
      setClouds(initialClouds);
      
      setScore(0);
      setGameOver(false);
      setGameInitialized(true);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      }
      setGameStarted(true)
    };

    const handleJump = () => {
      if (!gameStarted) {
        resetGame();
        return;
      }
      
      // Use the ref for immediate update
      velocityRef.current = jumpStrength;
      setVelocity(jumpStrength);
    };


    // Load high score from localStorage on component mount
    useEffect(() => {
      const savedHighScore = localStorage.getItem('flappyHighScore');
      if (savedHighScore) {
        setHighScore(parseInt(savedHighScore, 10));
      }
    }, []);
    
    // Handle keyboard controls
    useEffect(() => {
      const handleKeyPress = (e: KeyboardEvent) => {
        // Space bar or up arrow for jump
        if (e.code === 'Space' || e.code === 'ArrowUp') {
          if (gameStarted && !gameOver && !isPaused) {
            handleJump();
          } else if (!gameStarted) {
            resetGame();
          }
        }
        
        // P key for pause toggle
        if (e.code === 'KeyP' && gameStarted && !gameOver) {
          setIsPaused(prev => !prev);
        }
        
        // R key to restart if game over
        if (e.code === 'KeyR' && gameOver) {
          resetGame();
        }
      };
      
      window.addEventListener('keydown', handleKeyPress);
      
      return () => {
        window.removeEventListener('keydown', handleKeyPress);
      };
    }, [gameStarted, gameOver, isPaused, handleJump]);
    
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.addEventListener("click", handleJump);

      return () => {
        canvas.removeEventListener("click", handleJump);
      };
    }, [handleJump]);

    return (
      <div className="flex flex-col items-center justify-center h-full">
        <canvas ref={canvasRef} width={canvasWidth} height={canvasHeight} />
        <h1 className="text-2xl font-bold mt-4">Single Player</h1>
        <p>
          {canvasWidth}x{canvasHeight}
        </p>
        <Button
          onClick={resetGame}
          className="mt-4"
          variant={"outline"} hidden={gameStarted}
          disabled={gameInitialized}
        >
          Tap to Play!
        </Button>
        <div className="mt-4">Score: {score}</div>
        {gameOver && (
          <div className="mt-4">
            <h2 className="text-xl font-bold">Game Over!</h2>
            <Button onClick={resetGame} className="mt-2">
              Play Again
            </Button>
          </div>
        )}
      </div>

    );
  } catch (e) {
    console.error(e);
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="p-4 bg-red-50 text-red-500 rounded-md border border-red-200">
          <h2 className="text-xl font-bold">Error</h2>
          <p>{e?.message || "An unknown error occurred"}</p>
        </div>
      </div>
    );
      
    ;
  }
}

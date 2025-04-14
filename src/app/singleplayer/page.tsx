"use client";

import {Button} from "@/components/ui/button";
import {useEffect, useRef, useState} from "react";

interface Obstacle {
  x: number;
  height: number;
  passed: boolean;
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
    const canvasRef = useRef(null);

    const gravity = 0.5;
    const jumpStrength = -10;
    const obstacleSpeed = 3;
    const obstacleWidth = 50;
    const obstacleGap = 200;
    const birdX = 50;

    const newObstacleDistance = 300;

    const birdWidth = 34;
    const birdHeight = 24;

    // Bird animation state
    const [birdFrame, setBirdFrame] = useState(0);
    const framesPerAnimation = 10; // Adjust for animation speed

    const obstacleColor = "green";
    const scoreColor = "coral";
    const birdColor = "coral";

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
        ctx.fillStyle = birdColor;
        ctx.fillRect(x - birdWidth / 2, y - birdHeight / 2, birdWidth, birdHeight);
      };

      const drawObstacle = (x: number, height: number) => {
        if (!ctx) return;
        ctx.fillStyle = obstacleColor;
        ctx.fillRect(x, 0, obstacleWidth, height);
        ctx.fillRect(
          x,
          canvas.height - height,
          obstacleWidth,
          canvas.height - height
        );
      };

      const updateGame = () => {
        if (gameOver) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        drawBird(birdX, birdY);

        obstacles.forEach(obstacle => {
          drawObstacle(obstacle.x, obstacle.height);
        });

        // Update Bird Position
        setVelocity(velocity + gravity);
        setBirdY(birdY + velocity);

        // Keep bird within bounds
        if (birdY < birdHeight / 2) {
          setBirdY(birdHeight / 2);
          setVelocity(0);
        }
        if (birdY > canvas.height - birdHeight / 2) {
          setGameOver(true);
          setBirdY(canvas.height - birdHeight / 2);
          setVelocity(0);
        }

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
            const height = Math.floor(Math.random() * (canvas.height / 2)) + 50;
            visibleObstacles.push({x: canvas.width, height, passed: false});
          }

          return visibleObstacles;
        });

        // Collision Detection
        obstacles.forEach(obstacle => {
          if (!ctx) return;

          const birdTop = birdY - birdHeight / 2;
          const birdBottom = birdY + birdHeight / 2;
          const birdLeft = birdX - birdWidth / 2;
          const birdRight = birdX + birdWidth / 2;
          const obstacleLeft = obstacle.x;
          const obstacleRight = obstacle.x + obstacleWidth;

          if (
            birdRight > obstacleLeft &&
            birdLeft < obstacleRight &&
            birdBottom > 0 && // Ensure not hitting top
            birdTop < obstacle.height
          ) {
            setGameOver(true);
          }

          if (
            birdRight > obstacleLeft &&
            birdLeft < obstacleRight &&
            birdTop < canvas.height &&
            birdBottom > canvas.height - obstacle.height
          ) {
            setGameOver(true);
          }

          if (obstacleLeft + obstacleWidth < birdX && !obstacle.passed) {
            setObstacles(prevObstacles => {
              return prevObstacles.map(obs => {
                if (obs.x === obstacle.x) {
                  return {...obs, passed: true};
                }
                return obs;
              });
            });

            setScore(prevScore => {
              const newScore = prevScore + 1;
              return newScore;
            });
          }
        });

        if (ctx) {
          ctx.fillStyle = scoreColor;
          ctx.font = "20px Arial";
          ctx.fillText(`Score: ${score}`, 10, canvasHeight - 20);
        }
      };

      if (gameInitialized && !gameOver) {
        animationFrameId = requestAnimationFrame(updateGame);
      }

      // Start the game loop
       updateGame();

      return () => {
        window.removeEventListener("resize", resizeCanvas);
        canvas.removeEventListener("click", handleJump);
        cancelAnimationFrame(animationFrameId);
        
      };
    }, [gameOver]);

    const resetGame = () => {
      setBirdY(200);
      setVelocity(0);
      setObstacles([]);
      setObstacles([{
        x: canvasWidth,
        height: Math.floor(Math.random() * (canvasHeight / 2)) + 50,
        passed: false
      }]);
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
      if(!gameStarted) return resetGame()
      setVelocity(jumpStrength);
    };


    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.addEventListener("click", handleJump);

      return () => {
        canvas.removeEventListener("click", handleJump);
      };
    }, []);

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
    return 
      
        Error: {e?.message}
      
    ;
  }
}

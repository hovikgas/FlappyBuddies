"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";

export default function SinglePlayerPage() {
  const [birdY, setBirdY] = useState(200);
  const [velocity, setVelocity] = useState(0);
  const [obstacles, setObstacles] = useState<
    { x: number; height: number }[]
  >([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const [gameInitialized, setGameInitialized] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const gravity = 0.5;
  const jumpStrength = -10;
  const obstacleSpeed = 3;
  const obstacleWidth = 50;
  const obstacleGap = 200;
  const initialBirdYRatio = 0.5;
  const birdX = 50;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const calculatedWidth = Math.min(window.innerWidth * 0.95, 600);
    canvas.width = 0;
    canvas.height = 0;
    canvas.width = calculatedWidth;
    canvas.height = 400;
    setCanvasWidth(canvas.width);
    setCanvasHeight(canvas.height);
    setBirdY(canvas.height * initialBirdYRatio);

    resetGame();
    setGameInitialized(true);
  }, []);

  useEffect(() => {
    if (!gameInitialized || !canvasRef.current || gameOver) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const updateGame = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Bird
      ctx.fillStyle = "yellow";
      ctx.fillRect(birdX, birdY, 20, 20);

      // Draw Obstacles
      ctx.fillStyle = "green";
      obstacles.forEach((obstacle) => {
        ctx.fillRect(obstacle.x, 0, obstacleWidth, obstacle.height);
        ctx.fillRect(
          obstacle.x,
          obstacle.height + obstacleGap,
          obstacleWidth,
          canvas.height - obstacle.height - obstacleGap
        );
      });

      if (gameInitialized) {
        // Draw Score
        ctx.fillStyle = "black";
        ctx.font = "20px Arial";
        ctx.fillText(`Score: ${score}`, 10, 30);
      }
      // Update Bird Position
      setVelocity(velocity + gravity);
      setBirdY(birdY + velocity);

      // Update Obstacles
      setObstacles((prevObstacles) =>
        prevObstacles.map((obstacle) => ({
          x: obstacle.x - obstacleSpeed,
          height: obstacle.height,
        }))
      );

      // Generate New Obstacles
       if (obstacles.length === 0 || obstacles[obstacles.length - 1].x < canvas.width - 300) {
         const minObstacleHeight = 50;
         const maxObstacleHeight = canvas.height - obstacleGap - minObstacleHeight;
         const randomObstacleHeight =
           minObstacleHeight +
           Math.random() * (maxObstacleHeight - minObstacleHeight);
         setObstacles((prevObstacles) => [
           ...prevObstacles,
           { x: canvas.width, height: randomObstacleHeight },
         ]);
       }

      // Collision Detection
      obstacles.forEach((obstacle) => {
        if (
          birdX < obstacle.x + obstacleWidth &&
          birdX + 20 > obstacle.x &&
          (birdY < obstacle.height || birdY + 20 > obstacle.height + obstacleGap)
        ) {
          setGameOver(true);
        }
      });

      // Game Over Condition
      if (birdY > canvas.height || birdY < 0) {
        setGameOver(true);
      }

      // Remove passed obstacles
      setObstacles((prevObstacles) =>
        prevObstacles.filter((obstacle) => obstacle.x + obstacleWidth > 0)
      );

      if (!gameOver) {
        animationFrameId = requestAnimationFrame(updateGame);
      }
    };

    const handleJump = () => {
      setVelocity(jumpStrength);
    };

    if (canvas) {
      canvas.addEventListener("click", handleJump);
    }

    if (!gameOver) {
      animationFrameId = requestAnimationFrame(updateGame);
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener("click", handleJump);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameOver, gameInitialized, velocity, birdY, obstacles, score]);

  const resetGame = () => {
    setBirdY(canvasHeight * initialBirdYRatio);
    setVelocity(0);
    setObstacles([]);
    setScore(0);
    setGameOver(false);

    // Start generating new obstacles immediately after reset
    const canvas = canvasRef.current;
    if (canvas) {
      const minObstacleHeight = 50;
      const maxObstacleHeight = canvas.height - obstacleGap - minObstacleHeight;
      const randomObstacleHeight =
        minObstacleHeight +
        Math.random() * (maxObstacleHeight - minObstacleHeight);
      setObstacles([{ x: canvas.width, height: randomObstacleHeight }]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-6xl font-bold text-primary">Single Player Mode</h1>
        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          className="border-2 border-black"
        ></canvas>
        <div className="text-2xl font-bold text-primary">Score: {score}</div>
        {gameOver && (
          <div>
            <h2 className="text-3xl font-bold text-red-500">Game Over!</h2>
            <Button className="mt-4" onClick={resetGame}>
              Play Again
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

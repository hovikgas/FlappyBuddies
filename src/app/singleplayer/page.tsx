"use client";

import { useEffect, useRef, useState } from "react";

const obstacleWidth = 50;
const obstacleGap = 200;
const birdSize = 30;
const birdColor = "yellow";
const obstacleColor = "green";
const initialBirdY = 200;
const gravity = 0.5;
const jumpVelocity = -10;
const obstacleSpeed = 2;
const initialObstacleX = 600;

interface Obstacle {
  x: number;
  height: number;
}

export default function SinglePlayerPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [birdY, setBirdY] = useState(initialBirdY);
  const [velocity, setVelocity] = useState(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameInitialized, setGameInitialized] = useState(false);

  const resetGame = () => {
    setBirdY(initialBirdY);
    setVelocity(0);
    setObstacles([]);
    setScore(0);
    setGameOver(false);
  };

  // Function to generate new obstacles
  const generateObstacle = (canvasHeight: number): Obstacle => {
    const minObstacleHeight = 50;
    const maxObstacleHeight = canvasHeight - obstacleGap - minObstacleHeight;
    const height =
      minObstacleHeight + Math.random() * (maxObstacleHeight - minObstacleHeight);
    return { x: initialObstacleX, height: height };
  };

  const initializeGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    resetGame();
    setObstacles([
      generateObstacle(canvas.height),
      generateObstacle(canvas.height),
    ]);
    setGameInitialized(true);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 600;
    canvas.height = 400;

    let animationFrameId: number;

    if (!gameInitialized) {
      initializeGame();
    }

    const updateGame = () => {
      if (gameOver) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Bird physics
      setVelocity((prevVelocity) => prevVelocity + gravity);
      setBirdY((prevBirdY) => prevBirdY + velocity);

      // Draw bird
      ctx.fillStyle = birdColor;
      ctx.fillRect(50, birdY, birdSize, birdSize);

      // Obstacle movement and drawing
      setObstacles((prevObstacles) => {
        const updatedObstacles = prevObstacles.map((obstacle) => ({
          ...obstacle,
          x: obstacle.x - obstacleSpeed,
        }));

        if (updatedObstacles.length > 0 && updatedObstacles[0].x < -obstacleWidth) {
          updatedObstacles.shift();
          updatedObstacles.push(generateObstacle(canvas.height));
          setScore((prevScore) => prevScore + 1);
        }

        return updatedObstacles;
      });

      // Draw obstacles
      ctx.fillStyle = obstacleColor;
      obstacles.forEach((obstacle) => {
        ctx.fillRect(obstacle.x, 0, obstacleWidth, obstacle.height);
        ctx.fillRect(
          obstacle.x,
          obstacle.height + obstacleGap,
          obstacleWidth,
          canvas.height - obstacle.height - obstacleGap
        );

        // Collision detection
        if (
          50 + birdSize > obstacle.x &&
          50 < obstacle.x + obstacleWidth &&
          (birdY < obstacle.height || birdY + birdSize > obstacle.height + obstacleGap)
        ) {
          setGameOver(true);
        }
      });

      // Check for game over (bird hitting top or bottom)
      if (birdY < 0 || birdY + birdSize > canvas.height) {
        setGameOver(true);
      }

      // Display score
      ctx.fillStyle = "black";
      ctx.font = "20px Arial";
      ctx.fillText("Score: " + score, 10, 30);

      // Game over message
      if (gameOver) {
        ctx.fillStyle = "red";
        ctx.font = "40px Arial";
        ctx.fillText("Game Over", canvas.width / 2 - 100, canvas.height / 2);
      }

      animationFrameId = requestAnimationFrame(updateGame);
    };

    // Jump function
    const handleJump = () => {
      setVelocity(jumpVelocity);
    };

    // Event listeners for jump
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        handleJump();
      }
    });

    canvas.addEventListener("click", handleJump);

    window.addEventListener("touchmove", (e) => {
      handleJump();
    });

    animationFrameId = requestAnimationFrame(updateGame);

    return () => {
      window.removeEventListener("keydown", (e) => {
        if (e.code === "Space") {
          handleJump();
        }
      });
      canvas.removeEventListener("click", handleJump);
      window.removeEventListener("touchmove", (e) => {
      });
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameOver, gameInitialized, obstacles, birdY, score]);

  const handleCanvasClick = () => {
    setVelocity(jumpVelocity);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-4xl font-bold text-primary">Single Player Mode</h1>
        <canvas
          ref={canvasRef}
          className="border-2 border-black"
          onClick={handleCanvasClick}
        ></canvas>
        {gameOver && (
          <button className="mt-4 bg-primary text-white rounded px-4 py-2" onClick={resetGame}>
            Play Again
          </button>
        )}
      </main>
    </div>
  );
}

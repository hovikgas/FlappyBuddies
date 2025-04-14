"use client";

import { useEffect, useRef, useState } from "react";

const obstacleWidth = 50;
const obstacleGap = 200;
const birdSize = 30;

export default function SinglePlayerPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [birdY, setBirdY] = useState(200);
  const [velocity, setVelocity] = useState(0);
  const [obstacles, setObstacles] = useState<{ x: number; height: number }[]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 600;
    canvas.height = 400;

    let animationFrameId: number;

    // Function to generate new obstacles
    const generateObstacle = () => {
      const minObstacleHeight = 50;
      const maxObstacleHeight = canvas.height - obstacleGap - minObstacleHeight;
      const height =
        minObstacleHeight + Math.random() * (maxObstacleHeight - minObstacleHeight);
      return { x: canvas.width, height: height };
    };

    // Initial obstacles
    setObstacles([generateObstacle(), generateObstacle()]);

    // Function to update game state
    const updateGame = () => {
      if (gameOver) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Bird physics
      setVelocity((prevVelocity) => prevVelocity + 0.5);
      setBirdY((prevBirdY) => prevBirdY + velocity);

      // Draw bird
      ctx.fillStyle = "yellow";
      ctx.fillRect(50, birdY, birdSize, birdSize);

      // Obstacle movement and drawing
      setObstacles((prevObstacles) => {
        const updatedObstacles = prevObstacles.map((obstacle) => {
          obstacle.x -= 2;
          return obstacle;
        });

        // Generate new obstacle when the last one is out of the screen
        if (updatedObstacles.length > 0 && updatedObstacles[0].x < -obstacleWidth) {
          updatedObstacles.shift();
          updatedObstacles.push(generateObstacle());
          setScore((prevScore) => prevScore + 1); // Increment score
        }

        return updatedObstacles;
      });

      // Draw obstacles
      ctx.fillStyle = "green";
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

    // Start the game loop
    updateGame();

    // Jump function
    const handleJump = () => {
      setVelocity(-10);
    };

    // Event listener for jump
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        handleJump();
      }
    });

    canvas.addEventListener("click", handleJump);

    // Clean up function
    return () => {
      window.removeEventListener("keydown", handleJump);
      canvas.removeEventListener("click", handleJump);
      cancelAnimationFrame(animationFrameId);
    };
  }, [birdY, velocity, obstacles, score, gameOver]);

  const resetGame = () => {
    setBirdY(200);
    setVelocity(0);
    setObstacles([]);
    setScore(0);
    setGameOver(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-4xl font-bold text-primary">Single Player Mode</h1>
        <canvas ref={canvasRef} className="border-2 border-black"></canvas>
        {gameOver && (
          <button className="mt-4 bg-primary text-white rounded px-4 py-2" onClick={resetGame}>
            Play Again
          </button>
        )}
      </main>
    </div>
  );
}

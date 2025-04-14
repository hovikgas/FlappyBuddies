"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";

export default function SinglePlayerPage() {
  const [birdY, setBirdY] = useState(200);
  const [velocity, setVelocity] = useState(0);
  const [obstacles, setObstacles] = useState<
    { x: number; height: number; passed: boolean }[]
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
  const birdX = 50;

  const [flapFrame, setFlapFrame] = useState(0); // 0: down, 1: mid, 2: up
  const flapFrames = 3;

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

    const drawBird = (x: number, y: number, frame: number) => {
      if (!ctx) return;

      ctx.fillStyle = "yellow"; // Bird color

      // Bird body
      ctx.beginPath();
      ctx.ellipse(
        x + 17,
        y + 12,
        17,
        8,
        0,
        0,
        2 * Math.PI
      );
      ctx.fill();
      ctx.closePath();

      // Eye
      ctx.fillStyle = "black";
      ctx.beginPath();
      ctx.arc(
        x + 12,
        y + 6,
        3,
        0,
        2 * Math.PI
      );
      ctx.fill();
      ctx.closePath();

      // Beak
      ctx.fillStyle = "orange";
      ctx.beginPath();
      if (frame === 0) {
        ctx.moveTo(x + 34, y + 12);
        ctx.lineTo(x + 44, y + 6);
        ctx.lineTo(x + 44, y + 18);
      } else if (frame === 2) {
        ctx.moveTo(x + 34, y + 12);
        ctx.lineTo(x + 44, y + 18);
        ctx.lineTo(x + 44, y + 6);
      } else {
        ctx.moveTo(x + 34, y + 12);
        ctx.lineTo(x + 42, y + 6);
        ctx.lineTo(x + 42, y + 18);
      }
      ctx.closePath();
      ctx.fill();
    };

    const updateGame = () => {
      if (gameOver) return;
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawBird(birdX, birdY, flapFrame);

      ctx.fillStyle = "green";
      obstacles.forEach(obstacle => {
        ctx.fillRect(obstacle.x, 0, obstacleWidth, obstacle.height);
        ctx.fillRect(
          obstacle.x,
          canvas.height - obstacle.height,
          obstacleWidth,
          canvas.height - obstacle.height
        );
      });

      // Update Bird Position
      setVelocity(velocity + gravity);
      setBirdY(birdY + velocity);

      // Keep bird within bounds
      if (birdY < 0) {
        setBirdY(0);
        setVelocity(0);
      }
      if (birdY > canvas.height - 24) {
        setGameOver(true);
        setBirdY(canvas.height - 24);
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
          visibleObstacles[visibleObstacles.length - 1].x < canvas.width - 300
        ) {
          const height = Math.floor(Math.random() * (canvas.height / 2)) + 50;
          visibleObstacles.push({ x: canvas.width, height, passed: false });
        }

        return visibleObstacles;
      });

      // Collision Detection
       obstacles.forEach(obstacle => {
         if (
           birdX < obstacle.x + obstacleWidth &&
           birdX + 34 > obstacle.x &&
           (birdY < obstacle.height ||
             birdY + 24 > obstacle.height + obstacleGap)
         ) {
           setGameOver(true);
         }
       });

      // Update Score
      if (ctx) {
        setObstacles(prevObstacles => {
          let newScore = score;
          const updatedObstacles = prevObstacles.map(obstacle => {
            if (birdX > obstacle.x + obstacleWidth && !obstacle.passed) {
              newScore += 1;
              return { ...obstacle, passed: true };
            }
            return obstacle;
          });
          setScore(newScore);
          return updatedObstacles;
        });
        ctx.fillStyle = "coral";
        ctx.font = "20px Arial";
        ctx.fillText(`Score: ${score}`, 10, canvasHeight - 20);
      }

      // Cycle Flap Animation
      setFlapFrame(prevFrame => (prevFrame + 1) % flapFrames);
     animationFrameId = requestAnimationFrame(updateGame);
    };

    const handleJump = () => {
      setVelocity(jumpStrength);
    };

    if (gameInitialized && !gameOver) {
      animationFrameId = requestAnimationFrame(updateGame);
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === " " || event.key === "ArrowUp") {
        handleJump();
      }
    };

    const handleMouseDown = () => {
      handleJump();
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      document.removeEventListener("keydown", handleKeyDown);
      canvas.removeEventListener("mousedown", handleMouseDown);
       cancelAnimationFrame(animationFrameId);
    };
  }, [
    gameOver,
    canvasHeight,
    canvasWidth,
    gravity,
    jumpStrength,
    obstacleWidth,
    obstacleGap,
    obstacleSpeed,
    score,
    flapFrames,
    birdX,
    birdY,
    velocity,
  ]);

  useEffect(() => {
    if (gameInitialized) {
    resetGame();
    }
  setGameInitialized(true);
  }, []);

  const resetGame = () => {
    setBirdY(200);
    setVelocity(0);
    setObstacles([]);
    setScore(0);
    setGameOver(false);
  };

  return (
    
      
        {"Single Player"}
      
      
        {`${canvasWidth}x${canvasHeight}`}
        Tap or Press Space to Flap!
        
          
            
              Tap to Play!
            
          
          
            
              Game Over!
              
                Score: {score}
              
              
                Play Again
              
            
          
        
      
    
  );
}

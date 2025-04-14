"use client";

import {Button} from "@/components/ui/button";
import {useEffect, useRef, useState} from "react";

interface Obstacle {
  x: number;
  height: number;
  passed: boolean;
}

export default function SinglePlayerPage() {
  const [birdY, setBirdY] = useState(200);
  const [velocity, setVelocity] = useState(0);
  const [obstacles, setObstacles,]([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const [gameInitialized, setGameInitialized] = useState(false);
  const canvasRef = useRef(null);

  const gravity = 0.5;
  const jumpStrength = -10;
  const obstacleSpeed = 3;
  const obstacleWidth = 50;
  const obstacleGap = 200;
  const birdX = 50;

  const birdColor = "yellow";
  const obstacleColor = "green";
  const scoreColor = "coral";

  const birdRadius = 12;

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
      ctx.beginPath();
      ctx.arc(x, y, birdRadius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.closePath();
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
      if (birdY < birdRadius) {
        setBirdY(birdRadius);
        setVelocity(0);
      }
      if (birdY > canvas.height - birdRadius) {
        setGameOver(true);
        setBirdY(canvas.height - birdRadius);
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
          birdX + birdRadius > obstacle.x &&
          birdX - birdRadius < obstacle.x + obstacleWidth &&
          (birdY - birdRadius < obstacle.height ||
            birdY + birdRadius > obstacle.height + obstacleGap)
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
         ctx.fillStyle = scoreColor;
         ctx.font = "20px Arial";
         ctx.fillText(`Score: ${score}`, 10, canvasHeight - 20);
        });
       animationFrameId = requestAnimationFrame(updateGame);
      }
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
   }, [gameOver]);
 
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
     setGameInitialized(true);
   };
 
   return (
     
       
         Single Player
       
       
         {canvasWidth}x{canvasHeight}
         Tap or Press Space to Flap!
         
           
             
               Tap to Play!
             
           
           
             
               Game Over!
               
                 Score: {score}
               
               
                 Play Again
               
             
           
         
       
     
   );
 }

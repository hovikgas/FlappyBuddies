"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";

// Import bird images
import birdDownFlap from "../../../public/images/bird-down-flap.png";
import birdMidFlap from "../../../public/images/bird-mid-flap.png";
import birdUpFlap from "../../../public/images/bird-up-flap.png";
import Image from "next/image";

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
  const birdWidth = 34;
  const birdHeight = 24;

  // Bird animation state
  const [flapFrame, setFlapFrame] = useState(0);
  const birdFrames = [birdDownFlap, birdMidFlap, birdUpFlap];

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

    const updateGame = () => {
      if (gameOver) return;
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Bird
      const currentBirdFrame = birdFrames[flapFrame];
      if (currentBirdFrame) {
        ctx.drawImage(
          currentBirdFrame.src,
          birdX,
          birdY,
          birdWidth,
          birdHeight
        );
      }

      ctx.fillStyle = "green";
      obstacles.forEach((obstacle) => {
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
      if (birdY > canvas.height - birdHeight) {
        setGameOver(true);
        setBirdY(canvas.height - birdHeight);
        setVelocity(0);
      }

      // Update Obstacles
      setObstacles((prevObstacles) => {
        const updatedObstacles = prevObstacles.map((obstacle) => ({
          ...obstacle,
          x: obstacle.x - obstacleSpeed,
        }));

        // Remove passed obstacles
        const visibleObstacles = updatedObstacles.filter(
          (obstacle) => obstacle.x + obstacleWidth > 0
        );

        // Add new obstacle if needed
        if (visibleObstacles.length === 0 || visibleObstacles[visibleObstacles.length - 1].x < canvas.width - 300) {
          const height = Math.floor(Math.random() * (canvas.height / 2)) + 50;
          visibleObstacles.push({ x: canvas.width, height, passed: false });
        }

        return visibleObstacles;
      });

      // Collision Detection
      obstacles.forEach((obstacle) => {
        if (
          birdX < obstacle.x + obstacleWidth &&
          birdX + birdWidth > obstacle.x &&
          (birdY < obstacle.height || birdY + birdHeight > obstacle.height + obstacleGap)
        ) {
          setGameOver(true);
        }
      });

      // Update Score
      if (ctx) {
        setObstacles((prevObstacles) => {
          let newScore = score;
          const updatedObstacles = prevObstacles.map((obstacle) => {
            if (birdX > obstacle.x + obstacleWidth && !obstacle.passed) {
              newScore += 1;
              return { ...obstacle, passed: true };
            }
            return obstacle;
          });
          setScore(newScore);
          return updatedObstacles;
        });
      }

      animationFrameId = requestAnimationFrame(updateGame);
    };

    const handleJump = () => {
      // Set the bird's velocity to jumpStrength
      setVelocity(jumpStrength);

      // Trigger bird flap animation
      setFlapFrame(0);
      setTimeout(() => setFlapFrame(1), 50); // Quick mid-flap
    };

    if (gameInitialized && !gameOver) {
      updateGame();
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
    <>
      
        
          Single Player
        
        
          
          
          
          
          
        
        
          
            Tap or Press Space to Flap!
            
              
                Tap to Play!
              
            
          
          
            
              
                Game Over!
                
                  Score: {score}
                
                
                  Play Again
                
              
            
          
        
      
    </>
  );
}

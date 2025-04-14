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
  const [obstacles, setObstacles ] = useState<
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

  const newObstacleDistance = 300;
  const birdSize = 20;
  const birdColor = "coral"; // Coral color for the bird
  const obstacleColor = "green";
  const scoreColor = "coral";

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
      ctx.arc(x, y, birdSize / 2, 0, 2 * Math.PI);
      ctx.fill();
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
      if (birdY < birdSize / 2) {
        setBirdY(birdSize / 2);
        setVelocity(0);
      }
      if (birdY > canvas.height - birdSize / 2) {
        setGameOver(true);
        setBirdY(canvas.height - birdSize / 2);
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
          visibleObstacles.push({ x: canvas.width, height, passed: false });
        }

        return visibleObstacles;
      });

      // Collision Detection
      obstacles.forEach(obstacle => {
        if (!ctx) return;

        const birdTop = birdY - birdSize / 2;
        const birdBottom = birdY + birdSize / 2;
        const birdLeft = birdX - birdSize / 2;
        const birdRight = birdX + birdSize / 2;
        const obstacleLeft = obstacle.x;
        const obstacleRight = obstacle.x + obstacleWidth;

        if (
          birdRight > obstacleLeft && 
          birdLeft < obstacleRight &&
          (birdTop < obstacle.height || birdBottom > obstacle.height + obstacleGap)
        ) {
           setGameOver(true);
         }
       });

      // Update Score
      setObstacles(prevObstacles => {
        let newScore = score;
        const updatedObstacles = prevObstacles.map(obstacle => {
          if (birdX > obstacle.x + obstacleWidth && !obstacle.passed) {
            newScore += 2;
            return { ...obstacle, passed: true };
          }
          return obstacle;
        }); 
        setScore(newScore);
           if (ctx) {
            ctx.fillStyle = scoreColor;
            ctx.font = "20px Arial";
            ctx.fillText(`Score: ${newScore}`, 10, canvasHeight - 20);
          }
         return updatedObstacles;
       });
 
       animationFrameId = requestAnimationFrame(updateGame);
@@ -166,7 +166,7 @@
     };
 
     if (gameInitialized && !gameOver) {
-      animationFrameId = requestAnimationFrame(updateGame);
+        animationFrameId = requestAnimationFrame(updateGame);
     }
 
     const handleKeyDown = (event: KeyboardEvent) => {
@@ -248,5 +248,4
   );
 }
 
-"
+
+
"use client";

import { useEffect, useRef, useState } from "react";

const obstacleWidth = 50;
const obstacleGap = 200;
const birdSize = 30;
const birdColor = "yellow";
const obstacleColor = "green";
const initialBirdYRatio = 0.5; // Ratio of canvas height
const gravity = 0.5;
const jumpVelocity = -10;
const obstacleSpeedRatio = 0.005; // Ratio of canvas width
const initialObstacleXRatio = 1; // Ratio of canvas width

interface Obstacle {
  x: number;
  height: number;
}

export default function SinglePlayerPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [birdY, setBirdY] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameInitialized, setGameInitialized] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(600);
   const [canvasHeight, setCanvasHeight] = useState(400);

  const resetGame = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    setBirdY(canvas.height * initialBirdYRatio);
    setVelocity(0);
    setObstacles([
      generateObstacle(),
      generateObstacle(),
    ]);
    setScore(0);
    setGameOver(false);
  };

  // Function to generate new obstacles
  const generateObstacle = (): Obstacle => {
    if (!canvasRef.current) return { x: 0, height: 0 };
    const canvasHeight = canvasRef.current.height;
    const minObstacleHeight = 50;
    const maxObstacleHeight = canvasHeight - obstacleGap - minObstacleHeight;
    const height =
      minObstacleHeight + Math.random() * (maxObstacleHeight - minObstacleHeight);
    return { x: canvasRef.current.width * initialObstacleXRatio, height: height };
  };

  const initializeGame = () => {
     const canvas = canvasRef.current;
     if (!canvas) return;

     // Ensure the canvas is not too wide on smaller screens
     const calculatedWidth = Math.min(600, window.innerWidth - 40); // Subtract some padding
     canvas.width = calculatedWidth; // Set width to 600
     canvas.height = 400; // Set height to 400
     setCanvasWidth(canvas.width);
     setCanvasHeight(canvas.height);
+    setBirdY(canvas.height * initialBirdYRatio);
+

     resetGame();
     setGameInitialized(true);
    };

   useEffect(() => {
      const handleResize = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        // Ensure the canvas is not too wide on smaller screens
        const calculatedWidth = Math.min(600, window.innerWidth - 40); // Subtract some padding
        canvas.width = calculatedWidth;
        canvas.height = 400;
        setCanvasWidth(canvas.width);
        setCanvasHeight(canvas.height);
        resetGame();
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }, []);


   useEffect(() => {
     const canvas = canvasRef.current;
     if (!canvas) return;

     const ctx = canvas.getContext("2d");
     if (!ctx) return;

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
         const obstacleSpeed = canvasWidth * obstacleSpeedRatio;
         const updatedObstacles = prevObstacles.map((obstacle) => ({
           ...obstacle,
           x: obstacle.x - obstacleSpeed,
         }));

         if (updatedObstacles.length > 0 && updatedObstacles[0].x < -obstacleWidth) {
           updatedObstacles.shift();
           updatedObstacles.push(generateObstacle());
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
    }, [gameOver]);

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
           <button className="mt-4 bg-primary text-white rounded px-4 py-2" onClick={() => {
              setGameInitialized(false); // Re-initialize the game
              resetGame();
            }}>
             Play Again
           </button>
         )}
       </main>
     </div>
   );
 }


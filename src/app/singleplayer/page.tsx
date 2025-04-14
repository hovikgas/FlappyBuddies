     canvas.width = calculatedWidth;
      canvas.height = 400;
      setCanvasWidth(canvas.width);
      setCanvasHeight(canvas.height);
+    setBirdY(canvas.height * initialBirdYRatio);
 

      resetGame();
      setGameInitialized(true);

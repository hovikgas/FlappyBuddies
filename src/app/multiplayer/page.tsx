
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function MultiplayerPage() {
  const [lobbyId, setLobbyId] = useState("");

  const handleCreateLobby = () => {
    // Logic to create a new lobby
    console.log("Creating a new lobby");
  };

  const handleJoinLobby = () => {
    // Logic to join an existing lobby
    console.log(`Joining lobby with ID: ${lobbyId}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-4xl font-bold text-primary">Multiplayer Mode</h1>

        <div className="mt-6">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create Lobby</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Create a new lobby to invite your friends.</p>
              <Button className="mt-4" onClick={handleCreateLobby}>
                Create Lobby
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Join Lobby</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Join an existing lobby using its ID.</p>
              <div className="flex flex-col space-y-2">
                <Input
                  type="text"
                  placeholder="Enter Lobby ID"
                  value={lobbyId}
                  onChange={(e) => setLobbyId(e.target.value)}
                />
                <Button onClick={handleJoinLobby} disabled={!lobbyId}>
                  Join Lobby
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}


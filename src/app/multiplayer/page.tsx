"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function MultiplayerPage() {
  const [lobbyId, setLobbyId] = useState("");
  const [isCreatingLobby, setIsCreatingLobby] = useState(false);
  const [isJoiningLobby, setIsJoiningLobby] = useState(false);
  const [lobbyDetails, setLobbyDetails] = useState<string | null>(null);

  const handleCreateLobby = () => {
    setIsCreatingLobby(true);
    setTimeout(() => {
      const newLobbyId = Math.random().toString(36).substring(2, 15);
      setLobbyId(newLobbyId);
      setLobbyDetails(`Lobby created with ID: ${newLobbyId}`);
      setIsCreatingLobby(false);
    }, 1000);
  };

  const handleJoinLobby = () => {
    setIsJoiningLobby(true);
    setTimeout(() => {
      if (lobbyId) {
        setLobbyDetails(`Joining lobby with ID: ${lobbyId}`);
        setIsJoiningLobby(false);
      } else {
        setLobbyDetails("Lobby ID is required to join.");
        setIsJoiningLobby(false);
      }
    }, 1000);
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
              <Button className="mt-4" onClick={handleCreateLobby} disabled={isCreatingLobby}>
                {isCreatingLobby ? "Creating..." : "Create Lobby"}
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
                  disabled={isJoiningLobby}
                />
                <Button onClick={handleJoinLobby} disabled={!lobbyId || isJoiningLobby}>
                  {isJoiningLobby ? "Joining..." : "Join Lobby"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {lobbyDetails && (
          <div className="mt-6">
            <Card className="w-full max-w-md">
              <CardContent>
                <p className="text-sm text-muted-foreground">{lobbyDetails}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

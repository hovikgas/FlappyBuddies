
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-6xl font-bold text-primary">
          Flappy Buddies
        </h1>

        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Single Player</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Play the classic Flappy Bird game.</p>
              <Link href="/singleplayer">
                <Button className="mt-4">
                  Play Single Player
                  <Icons.arrowRight className="ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Multiplayer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Join or create a lobby to play with friends.</p>
              <Link href="/multiplayer">
                <Button className="mt-4">
                  Play Multiplayer
                  <Icons.arrowRight className="ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="w-full max-w-md border-t p-4 flex items-center justify-center">
        <p className="text-center text-sm text-muted-foreground">
          Created with ❤️ by H&S Studios
        </p>
      </footer>
    </div>
  );
}


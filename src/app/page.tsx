import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const appName = process.env.NEXT_PUBLIC_APP_NAME || "App";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">{appName}</h1>
        <p className="text-lg text-muted-foreground max-w-md">
          Welcome! Get started by signing in or creating an account.
        </p>
        <div className="flex gap-4 justify-center">
          {session?.user ? (
            <Button asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild>
                <Link href="/sign-in">Sign In</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/sign-up">Sign Up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

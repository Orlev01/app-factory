import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { UserDropdown } from "./user-dropdown";

const appName = process.env.NEXT_PUBLIC_APP_NAME || "App";

export async function Navbar() {
  const session = await auth();

  return (
    <nav className="border-b" aria-label="Main navigation">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold">
          {appName}
        </Link>
        <div>
          {session?.user ? (
            <UserDropdown user={session.user} />
          ) : (
            <Button asChild variant="ghost">
              <Link href="/sign-in">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { verifyEmail } from "@/lib/auth-actions";
import type { ActionState } from "@/lib/types";

export function VerifyEmailButton({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  const [result, setResult] = useState<ActionState>(null);
  const [pending, setPending] = useState(false);

  async function handleVerify() {
    setPending(true);
    const res = await verifyEmail(token, email);
    setResult(res);
    setPending(false);
  }

  if (result?.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    );
  }

  if (result?.success) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>{result.successMessage}</AlertDescription>
        </Alert>
        <Button asChild className="w-full">
          <Link href="/sign-in">Go to Sign In</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">
        Click the button below to verify your email address.
      </p>
      <Button onClick={handleVerify} className="w-full" disabled={pending}>
        {pending ? "Verifying..." : "Verify Email"}
      </Button>
    </div>
  );
}

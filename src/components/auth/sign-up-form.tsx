"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signUp } from "@/lib/auth-actions";
import type { ActionState } from "@/lib/types";

export function SignUpForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    signUp,
    null
  );

  useEffect(() => {
    if (state?.success && state.successMessage) {
      toast.success(state.successMessage);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {!state?.success && (
        <>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Your name"
              autoComplete="name"
              required
              aria-describedby={state?.fieldErrors?.name ? "name-error" : undefined}
            />
            {state?.fieldErrors?.name && (
              <p id="name-error" className="text-sm text-destructive">
                {state.fieldErrors.name[0]}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              aria-describedby={state?.fieldErrors?.email ? "email-error" : undefined}
            />
            {state?.fieldErrors?.email && (
              <p id="email-error" className="text-sm text-destructive">
                {state.fieldErrors.email[0]}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              required
              aria-describedby={state?.fieldErrors?.password ? "password-error" : undefined}
            />
            {state?.fieldErrors?.password && (
              <p id="password-error" className="text-sm text-destructive">
                {state.fieldErrors.password[0]}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              aria-describedby={state?.fieldErrors?.confirmPassword ? "confirm-password-error" : undefined}
            />
            {state?.fieldErrors?.confirmPassword && (
              <p id="confirm-password-error" className="text-sm text-destructive">
                {state.fieldErrors.confirmPassword[0]}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating account..." : "Sign Up"}
          </Button>
        </>
      )}
      <p className="text-center text-sm">
        {state?.success ? (
          <Link href="/sign-in" className="font-medium hover:underline">
            Go to Sign In
          </Link>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/sign-in" className="font-medium hover:underline">
              Sign In
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

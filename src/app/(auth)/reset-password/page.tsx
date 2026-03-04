import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/auth-layout";

export const metadata: Metadata = {
  title: "Reset Password",
};
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthLayout title="Reset Password">
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>Invalid reset link.</AlertDescription>
          </Alert>
          <Button asChild className="w-full" variant="outline">
            <Link href="/forgot-password">Request New Link</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset Password" description="Enter your new password">
      <ResetPasswordForm token={token} />
    </AuthLayout>
  );
}

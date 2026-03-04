import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VerifyEmailButton } from "@/components/auth/verify-email-button";

export const metadata: Metadata = {
  title: "Verify Email",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { token, email } = await searchParams;

  if (!token || !email) {
    return (
      <AuthLayout title="Verify Email">
        <Alert variant="destructive">
          <AlertDescription>Invalid verification link.</AlertDescription>
        </Alert>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Verify Email">
      <VerifyEmailButton token={token} email={email} />
    </AuthLayout>
  );
}

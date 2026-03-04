import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>Welcome, {session?.user?.name || "User"}!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Signed in as {session?.user?.email}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

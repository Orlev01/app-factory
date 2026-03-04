"use server";

import bcrypt from "bcrypt";
import { createId } from "@paralleldrive/cuid2";
import { eq, and, gt } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  users,
  sessions,
  verificationTokens,
  passwordResetTokens,
} from "@/lib/db/schema";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email";
import { signIn } from "@/lib/auth";
import { CredentialsSignin } from "next-auth";
import type { ActionState } from "@/lib/types";
import {
  signUpSchema,
  signInSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";

export async function signUp(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0].message,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, email: rawEmail, password } = parsed.data;
  const email = rawEmail.toLowerCase().trim();

  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existingUser) {
    // If the user exists but hasn't verified their email, resend verification
    if (!existingUser.emailVerified) {
      await db
        .delete(verificationTokens)
        .where(eq(verificationTokens.identifier, email));

      const token = createId();
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await db.insert(verificationTokens).values({
        identifier: email,
        token,
        expires,
      });

      try {
        await sendVerificationEmail(email, token);
      } catch (error) {
        console.error("Failed to resend verification email:", error);
        return {
          error:
            "We couldn't send the verification email. Please try again.",
        };
      }

      return {
        success: true,
        successMessage:
          "A new verification email has been sent. Please check your inbox.",
      };
    }

    return { error: "An account with this email already exists." };
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    await db.insert(users).values({
      name,
      email,
      hashedPassword,
    });
  } catch (error) {
    console.error("Failed to create user:", error);
    return { error: "An account with this email already exists." };
  }

  const token = createId();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db.insert(verificationTokens).values({
    identifier: email,
    token,
    expires,
  });

  try {
    await sendVerificationEmail(email, token);
  } catch (error) {
    console.error("Failed to send verification email:", error);
    return {
      error:
        "Account created but we couldn't send the verification email. Please try again.",
    };
  }

  return {
    success: true,
    successMessage:
      "Account created! Please check your email to verify your account.",
  };
}

export async function verifyEmail(
  token: string,
  email: string
): Promise<ActionState> {
  const normalizedEmail = email.toLowerCase().trim();

  // Atomically consume the token
  const [deleted] = await db
    .delete(verificationTokens)
    .where(
      and(
        eq(verificationTokens.token, token),
        eq(verificationTokens.identifier, normalizedEmail),
        gt(verificationTokens.expires, new Date())
      )
    )
    .returning();

  if (!deleted) {
    return { error: "Invalid or expired verification link." };
  }

  await db
    .update(users)
    .set({ emailVerified: new Date() })
    .where(eq(users.email, normalizedEmail));

  // Clean up any remaining tokens for this email
  await db
    .delete(verificationTokens)
    .where(eq(verificationTokens.identifier, normalizedEmail));

  return {
    success: true,
    successMessage: "Email verified! You can now sign in.",
  };
}

export async function forgotPassword(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0].message,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const email = parsed.data.email.toLowerCase().trim();

  // Always return success to avoid leaking user existence
  const successMsg =
    "If an account with that email exists, we've sent a password reset link.";

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    return { success: true, successMessage: successMsg };
  }

  // Delete any existing reset tokens for this user
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, user.id));

  const token = createId();
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.insert(passwordResetTokens).values({
    userId: user.id,
    token,
    expires,
  });

  try {
    await sendPasswordResetEmail(email, token);
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return {
      error: "Something went wrong sending the email. Please try again.",
    };
  }

  return { success: true, successMessage: successMsg };
}

export async function resetPassword(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0].message,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { token, password } = parsed.data;

  // Atomically consume the token
  const [resetToken] = await db
    .delete(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, token),
        gt(passwordResetTokens.expires, new Date())
      )
    )
    .returning();

  if (!resetToken) {
    return { error: "Invalid or expired reset link." };
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await db
    .update(users)
    .set({ hashedPassword })
    .where(eq(users.id, resetToken.userId));

  // Delete all remaining reset tokens for this user
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, resetToken.userId));

  // Invalidate all sessions for the user
  await db.delete(sessions).where(eq(sessions.userId, resetToken.userId));

  redirect("/sign-in?message=Password reset successful. Please sign in.");
}

export async function signInAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0].message,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const { password } = parsed.data;

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      const message =
        error.cause?.err?.message ?? error.message ?? "";
      if (message.includes("verify your email")) {
        return { error: "Please verify your email before signing in." };
      }
      return { error: "Invalid email or password." };
    }
    throw error;
  }

  redirect("/dashboard");
}

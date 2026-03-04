import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock CredentialsSignin before anything else loads ──────────────────────

class MockCredentialsSignin extends Error {
  name = "CredentialsSignin";
  cause?: { err?: { message?: string } };
  constructor(message?: string) {
    super(message ?? "CredentialsSignin");
  }
}

vi.mock("next-auth", () => ({
  CredentialsSignin: MockCredentialsSignin,
  AuthError: Error,
}));

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockFindFirstUser = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: { findFirst: (...args: unknown[]) => mockFindFirstUser(...args) },
    },
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  users: { email: "email", id: "id" },
  sessions: { userId: "userId" },
  verificationTokens: {
    token: "token",
    identifier: "identifier",
    expires: "expires",
  },
  passwordResetTokens: {
    token: "token",
    expires: "expires",
    userId: "userId",
  },
}));

const mockSendVerificationEmail = vi.fn();
const mockSendPasswordResetEmail = vi.fn();
vi.mock("@/lib/email", () => ({
  sendVerificationEmail: (...args: unknown[]) =>
    mockSendVerificationEmail(...args),
  sendPasswordResetEmail: (...args: unknown[]) =>
    mockSendPasswordResetEmail(...args),
}));

const mockSignIn = vi.fn();
vi.mock("@/lib/auth", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error("NEXT_REDIRECT");
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_password"),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("@paralleldrive/cuid2", () => ({
  createId: () => "mock-cuid",
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
  gt: vi.fn((...args: unknown[]) => args),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.append(k, v);
  return fd;
}

/**
 * Creates a chainable mock that mimics Drizzle's query builder.
 * - .values(), .set(), .where() all chain
 * - .returning() resolves with the given data
 * - awaiting .where() directly resolves to undefined (for terminal operations)
 */
function chainable(opts?: { returning?: unknown[] }) {
  // The terminal object is returned by .where() and .values()
  // It's both thenable (for `await db.delete(x).where(y)`)
  // and has .returning() (for `await db.delete(x).where(y).returning()`)
  const terminal: Record<string, unknown> = {
    returning: vi.fn().mockResolvedValue(opts?.returning ?? []),
  };
  // Make terminal awaitable for cases where .returning() is NOT called
  terminal.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
    Promise.resolve(undefined).then(resolve, reject);

  const obj: Record<string, unknown> = {};
  obj.values = vi.fn().mockReturnValue(terminal);
  obj.set = vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue(terminal) });
  obj.where = vi.fn().mockReturnValue(terminal);
  return obj;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("signUp", () => {
  let signUp: typeof import("@/lib/auth-actions").signUp;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/lib/auth-actions");
    signUp = mod.signUp;

    const chain = chainable();
    mockInsert.mockReturnValue(chain);
    mockDelete.mockReturnValue(chain);
  });

  it("returns error when fields are missing", async () => {
    const result = await signUp(null, makeFormData({ name: "", email: "", password: "", confirmPassword: "" }));
    expect(result?.error).toBeTruthy();
    expect(result?.fieldErrors).toBeDefined();
  });

  it("returns error when password < 8 chars", async () => {
    const result = await signUp(null, makeFormData({ name: "A", email: "a@b.com", password: "short", confirmPassword: "short" }));
    expect(result?.error).toContain("at least 8 characters");
  });

  it("returns error when passwords don't match", async () => {
    const result = await signUp(null, makeFormData({ name: "A", email: "a@b.com", password: "password1", confirmPassword: "password2" }));
    expect(result?.error).toContain("do not match");
  });

  it("returns field errors for invalid email", async () => {
    const result = await signUp(null, makeFormData({ name: "A", email: "not-an-email", password: "password1", confirmPassword: "password1" }));
    expect(result?.error).toBeTruthy();
    expect(result?.fieldErrors?.email).toBeDefined();
  });

  it("returns error when verified email already exists", async () => {
    mockFindFirstUser.mockResolvedValueOnce({ id: "1", email: "a@b.com", emailVerified: new Date() });
    const result = await signUp(null, makeFormData({ name: "A", email: "a@b.com", password: "password1", confirmPassword: "password1" }));
    expect(result?.error).toBe("An account with this email already exists.");
  });

  it("resends verification when unverified user exists", async () => {
    mockFindFirstUser.mockResolvedValueOnce({ id: "1", email: "a@b.com", emailVerified: null });
    mockSendVerificationEmail.mockResolvedValueOnce(undefined);

    const result = await signUp(null, makeFormData({ name: "A", email: "a@b.com", password: "password1", confirmPassword: "password1" }));

    expect(mockDelete).toHaveBeenCalled(); // deletes old tokens
    expect(mockInsert).toHaveBeenCalled(); // inserts new token
    expect(mockSendVerificationEmail).toHaveBeenCalledWith("a@b.com", "mock-cuid");
    expect(result?.success).toBe(true);
    expect(result?.successMessage).toContain("verification email has been sent");
  });

  it("creates user and sends verification email on success", async () => {
    mockFindFirstUser.mockResolvedValueOnce(undefined);
    mockSendVerificationEmail.mockResolvedValueOnce(undefined);

    const result = await signUp(null, makeFormData({ name: "A", email: "A@B.com", password: "password1", confirmPassword: "password1" }));

    expect(mockInsert).toHaveBeenCalled();
    expect(mockSendVerificationEmail).toHaveBeenCalledWith("a@b.com", "mock-cuid");
    expect(result?.success).toBe(true);
    expect(result?.successMessage).toContain("Account created!");
  });

  it("normalizes email to lowercase", async () => {
    mockFindFirstUser.mockResolvedValueOnce(undefined);
    mockSendVerificationEmail.mockResolvedValueOnce(undefined);

    await signUp(null, makeFormData({ name: "A", email: "  Test@Example.COM  ", password: "password1", confirmPassword: "password1" }));

    expect(mockSendVerificationEmail).toHaveBeenCalledWith("test@example.com", "mock-cuid");
  });

  it("returns error when email send fails", async () => {
    mockFindFirstUser.mockResolvedValueOnce(undefined);
    mockSendVerificationEmail.mockRejectedValueOnce(new Error("Resend API error"));

    const result = await signUp(null, makeFormData({ name: "A", email: "a@b.com", password: "password1", confirmPassword: "password1" }));
    expect(result?.error).toContain("couldn't send the verification email");
  });

  it("handles DB unique constraint race condition", async () => {
    mockFindFirstUser.mockResolvedValueOnce(undefined);
    const chain = chainable();
    chain.values = vi.fn().mockImplementation(() => {
      throw new Error("unique constraint violation");
    });
    mockInsert.mockReturnValueOnce(chain);

    const result = await signUp(null, makeFormData({ name: "A", email: "a@b.com", password: "password1", confirmPassword: "password1" }));
    expect(result?.error).toBe("An account with this email already exists.");
  });
});

describe("verifyEmail", () => {
  let verifyEmail: typeof import("@/lib/auth-actions").verifyEmail;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/lib/auth-actions");
    verifyEmail = mod.verifyEmail;
  });

  it("returns error for invalid/expired token", async () => {
    // DELETE...RETURNING returns empty array (no matching token)
    const deleteChain = chainable({ returning: [] });
    mockDelete.mockReturnValueOnce(deleteChain);

    const result = await verifyEmail("bad-token", "a@b.com");
    expect(result?.error).toBe("Invalid or expired verification link.");
  });

  it("sets emailVerified and deletes remaining tokens on success", async () => {
    // First delete: atomic consume returns the token
    const consumeChain = chainable({
      returning: [{ token: "good-token", identifier: "a@b.com" }],
    });
    mockDelete.mockReturnValueOnce(consumeChain);

    // update users
    const updateChain = chainable();
    mockUpdate.mockReturnValueOnce(updateChain);

    // Second delete: cleanup remaining tokens
    const cleanupChain = chainable();
    mockDelete.mockReturnValueOnce(cleanupChain);

    const result = await verifyEmail("good-token", "a@b.com");

    expect(mockDelete).toHaveBeenCalledTimes(2);
    expect(mockUpdate).toHaveBeenCalled();
    expect(result?.success).toBe(true);
    expect(result?.successMessage).toBe("Email verified! You can now sign in.");
  });
});

describe("forgotPassword", () => {
  let forgotPassword: typeof import("@/lib/auth-actions").forgotPassword;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/lib/auth-actions");
    forgotPassword = mod.forgotPassword;
  });

  it("returns error for invalid email", async () => {
    const result = await forgotPassword(null, makeFormData({ email: "" }));
    expect(result?.error).toBeTruthy();
  });

  it("returns success message even when user doesn't exist", async () => {
    mockFindFirstUser.mockResolvedValueOnce(undefined);
    const result = await forgotPassword(null, makeFormData({ email: "nonexistent@b.com" }));
    expect(result?.success).toBe(true);
    expect(result?.successMessage).toContain("If an account with that email exists");
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("deletes old tokens, creates new one, and sends email when user exists", async () => {
    mockFindFirstUser.mockResolvedValueOnce({ id: "user-1", email: "a@b.com" });

    // delete existing tokens
    const deleteChain = chainable();
    mockDelete.mockReturnValueOnce(deleteChain);

    // insert new token
    const insertChain = chainable();
    mockInsert.mockReturnValueOnce(insertChain);

    mockSendPasswordResetEmail.mockResolvedValueOnce(undefined);

    const result = await forgotPassword(null, makeFormData({ email: "a@b.com" }));

    expect(mockDelete).toHaveBeenCalledTimes(1); // delete old tokens
    expect(mockInsert).toHaveBeenCalled();
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith("a@b.com", "mock-cuid");
    expect(result?.success).toBe(true);
    expect(result?.successMessage).toContain("If an account with that email exists");
  });

  it("returns error when email send fails", async () => {
    mockFindFirstUser.mockResolvedValueOnce({ id: "user-1", email: "a@b.com" });

    const deleteChain = chainable();
    mockDelete.mockReturnValueOnce(deleteChain);

    const insertChain = chainable();
    mockInsert.mockReturnValueOnce(insertChain);

    mockSendPasswordResetEmail.mockRejectedValueOnce(new Error("Resend API error"));

    const result = await forgotPassword(null, makeFormData({ email: "a@b.com" }));
    expect(result?.error).toContain("Something went wrong");
  });
});

describe("resetPassword", () => {
  let resetPassword: typeof import("@/lib/auth-actions").resetPassword;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/lib/auth-actions");
    resetPassword = mod.resetPassword;
  });

  it("returns error for missing fields", async () => {
    const result = await resetPassword(null, makeFormData({ token: "", password: "", confirmPassword: "" }));
    expect(result?.error).toBeTruthy();
    expect(result?.fieldErrors).toBeDefined();
  });

  it("returns error for password mismatch", async () => {
    const result = await resetPassword(null, makeFormData({ token: "t", password: "password1", confirmPassword: "password2" }));
    expect(result?.error).toContain("do not match");
  });

  it("returns error for invalid/expired token", async () => {
    // DELETE...RETURNING returns empty array
    const deleteChain = chainable({ returning: [] });
    mockDelete.mockReturnValueOnce(deleteChain);

    const result = await resetPassword(null, makeFormData({ token: "bad", password: "password1", confirmPassword: "password1" }));
    expect(result?.error).toBe("Invalid or expired reset link.");
  });

  it("updates password, deletes all tokens and sessions, and redirects", async () => {
    // First delete: atomic consume returns the token
    const consumeChain = chainable({
      returning: [{ token: "good-token", userId: "user-1" }],
    });
    mockDelete.mockReturnValueOnce(consumeChain);

    // update user password
    const updateChain = chainable();
    mockUpdate.mockReturnValueOnce(updateChain);

    // Second delete: remaining reset tokens
    const deleteTokensChain = chainable();
    mockDelete.mockReturnValueOnce(deleteTokensChain);

    // Third delete: sessions
    const deleteSessionsChain = chainable();
    mockDelete.mockReturnValueOnce(deleteSessionsChain);

    await expect(
      resetPassword(null, makeFormData({ token: "good-token", password: "password1", confirmPassword: "password1" }))
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockUpdate).toHaveBeenCalled();
    // Three deletes: consume token + remaining tokens + sessions
    expect(mockDelete).toHaveBeenCalledTimes(3);
    expect(mockRedirect).toHaveBeenCalledWith(
      "/sign-in?message=Password reset successful. Please sign in."
    );
  });
});

describe("signInAction", () => {
  let signInAction: typeof import("@/lib/auth-actions").signInAction;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/lib/auth-actions");
    signInAction = mod.signInAction;
  });

  it("returns error for missing fields", async () => {
    const result = await signInAction(null, makeFormData({ email: "", password: "" }));
    expect(result?.error).toBeTruthy();
    expect(result?.fieldErrors).toBeDefined();
  });

  it("returns email verification error for unverified users", async () => {
    const err = new MockCredentialsSignin();
    err.cause = { err: { message: "Please verify your email before signing in." } };
    mockSignIn.mockRejectedValueOnce(err);

    const result = await signInAction(null, makeFormData({ email: "a@b.com", password: "password1" }));
    expect(result?.error).toBe("Please verify your email before signing in.");
  });

  it("returns generic error for wrong password", async () => {
    mockSignIn.mockRejectedValueOnce(new MockCredentialsSignin());

    const result = await signInAction(null, makeFormData({ email: "a@b.com", password: "wrongpass" }));
    expect(result?.error).toBe("Invalid email or password.");
  });

  it("redirects to dashboard on success", async () => {
    mockSignIn.mockResolvedValueOnce(undefined);

    await expect(
      signInAction(null, makeFormData({ email: "a@b.com", password: "password1" }))
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
  });

  it("normalizes email to lowercase", async () => {
    mockSignIn.mockResolvedValueOnce(undefined);

    await expect(
      signInAction(null, makeFormData({ email: "  Test@Example.COM  ", password: "password1" }))
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockSignIn).toHaveBeenCalledWith("credentials", {
      email: "test@example.com",
      password: "password1",
      redirect: false,
    });
  });
});

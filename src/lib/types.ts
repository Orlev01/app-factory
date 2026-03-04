export type ActionState = {
  error?: string;
  success?: boolean;
  successMessage?: string;
  fieldErrors?: Record<string, string[] | undefined>;
} | null;

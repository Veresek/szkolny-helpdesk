import {
  pocketbaseRequest,
  PocketBaseRequestError,
} from "@/lib/pocketbase";
import type {
  PocketBaseAuthResponse,
  RegisterUserData,
  UserRecord,
} from "@/types/pocketbase";

const AUTH_STORAGE_KEY = "szkolny-helpdesk-auth";
const AUTH_CHANGE_EVENT = "szkolny-helpdesk-auth-change";

export interface AuthSession {
  token: string;
  user: UserRecord;
}

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<AuthSession> {
  const result = await pocketbaseRequest<PocketBaseAuthResponse>(
    "/api/collections/users/auth-with-password",
    {
      method: "POST",
      body: { identity: email, password },
    },
  );

  const session = { token: result.token, user: result.record };
  saveAuthSession(session);
  return session;
}

/** Creates an ordinary user account; the role is never read from the form. */
export function registerUser(
  email: string,
  password: string,
  passwordConfirm: string,
): Promise<UserRecord> {
  const data: RegisterUserData = {
    email,
    password,
    passwordConfirm,
    role: "uzytkownik",
  };

  return pocketbaseRequest<UserRecord>("/api/collections/users/records", {
    method: "POST",
    body: data,
  });
}

export function saveAuthSession(session: AuthSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function subscribeToAuthSession(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  window.addEventListener("storage", onChange);
  window.addEventListener(AUTH_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(AUTH_CHANGE_EVENT, onChange);
  };
}

export function getAuthSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_STORAGE_KEY);
}

export function getServerAuthSnapshot(): string | null {
  return null;
}

export function parseAuthSnapshot(stored: string | null): AuthSession | null {
  if (!stored) return null;

  try {
    const session = JSON.parse(stored) as AuthSession;
    if (session.token && session.user?.id) return session;
  } catch {
    // Ignore malformed local session data.
  }

  return null;
}

export function logout(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
}

export function getAuthErrorMessage(error: unknown): string {
  if (!(error instanceof PocketBaseRequestError)) {
    return error instanceof Error
      ? error.message
      : "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.";
  }

  const fieldErrors = Object.values(error.data ?? {})
    .map((field) => field.message)
    .filter((message): message is string => Boolean(message));
  const message = [error.message, ...fieldErrors].join(" ").toLowerCase();

  if (message.includes("email") && (message.includes("already") || message.includes("unique"))) {
    return "Konto z tym adresem e-mail już istnieje.";
  }
  if (message.includes("password")) {
    return "Hasło musi mieć co najmniej 8 znaków, a oba pola muszą być zgodne.";
  }
  if (error.status === 400 || error.status === 403) {
    return "PocketBase odrzucił rejestrację. Sprawdź, czy reguła users.createRule pozwala utworzyć konto z rolą uzytkownik.";
  }

  return error.message;
}

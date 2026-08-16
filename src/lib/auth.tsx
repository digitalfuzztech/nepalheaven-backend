import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getCurrentUserFn,
  loginFn,
  logoutFn,
  requestPasswordResetFn,
  resetPasswordFn,
} from "@/lib/auth.functions";

export type UserRole = "admin" | "customer";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  country?: string;
  nationality?: string;
  dateOfBirth?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  ready: boolean;
  login: (
    email: string,
    password: string,
    expectedRole?: UserRole,
  ) => Promise<
    | { ok: true; user: AuthUser }
    | {
        ok: false;
        message: string;
        requiresVerification?: true;
        verificationPath?: string;
        verificationSent?: boolean;
      }
  >;
  requestPasswordReset: (email: string) => Promise<{
    ok: boolean;
    message: string;
    status?: "not_found" | "verification_required" | "sent";
    verificationPath?: string;
    sent?: boolean;
  }>;
  resetPassword: (
    token: string,
    password: string,
  ) => Promise<{ ok: boolean; message: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  async function refresh() {
    try {
      setUser((await getCurrentUserFn()) as AuthUser | null);
    } catch (error) {
      console.error("Unable to load current session", error);
      setUser(null);
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      async login(email, password, expectedRole) {
        try {
          const result = await loginFn({
            data: { email, password, expectedRole },
          });
          if (!result.ok) return result;
          setUser(result.user as AuthUser);
          return { ok: true, user: result.user as AuthUser };
        } catch (error) {
          console.error(error);
          return {
            ok: false,
            message: "We couldn't sign you in right now. Please try again.",
          };
        }
      },
      async requestPasswordReset(email) {
        try {
          return await requestPasswordResetFn({ data: { email } });
        } catch (error) {
          console.error(error);
          return {
            ok: false,
            message: "We couldn't prepare the password reset right now.",
          };
        }
      },
      async resetPassword(token, password) {
        try {
          return await resetPasswordFn({ data: { token, password } });
        } catch (error) {
          console.error(error);
          return {
            ok: false,
            message: "We couldn't reset your password right now.",
          };
        }
      },
      async logout() {
        try {
          await logoutFn();
        } finally {
          setUser(null);
        }
      },
      refresh,
    }),
    [user, ready],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

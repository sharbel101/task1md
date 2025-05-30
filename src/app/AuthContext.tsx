"use client";

import { createContext, useState, useContext, ReactNode, useEffect } from "react";

type Role = "developer" | "evaluator" | null;

interface AuthContextType {
  userRole: Role;
  login: (email: string, password: string, role: "Developer" | "Evaluator") => Promise<void>;
  logout: () => void;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

const AuthContext = createContext<AuthContextType>({
  userRole: null,
  login: async () => {},
  logout: () => {},
  error: null,
  setError: () => {},
});

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userRole, setUserRole] = useState<Role>(null);
  const [error, setError] = useState<string | null>(null);

  // On mount, restore userRole from cookie if present
  useEffect(() => {
    const savedRole = getCookie("userRole") as Role;
    if (savedRole === "developer" || savedRole === "evaluator") {
      setUserRole(savedRole);
    }
  }, []);

  async function login(email: string, password: string, role: "Developer" | "Evaluator") {
    setError(null);
    await new Promise((r) => setTimeout(r, 500)); // simulate delay

    if (
      (role === "Developer" && email.endsWith("@dev.com") && password === "devpass") ||
      (role === "Evaluator" && email.endsWith("@eval.com") && password === "evalpass")
    ) {
      const roleLower = role.toLowerCase() as Role;
      setUserRole(roleLower);
      // Set cookie with 1-day expiration
      document.cookie = `userRole=${roleLower}; path=/; max-age=86400; SameSite=Strict`;
      setError(null);
    } else {
      setUserRole(null);
      document.cookie = "userRole=; path=/; max-age=0; SameSite=Strict";
      setError("Invalid credentials or role");
    }
  }

  function logout() {
    setUserRole(null);
    document.cookie = "userRole=; path=/; max-age=0; SameSite=Strict";
    setError(null);
  }

  return (
    <AuthContext.Provider value={{ userRole, login, logout, error, setError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthProvider;

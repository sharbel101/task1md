"use client";

import React, { useState } from "react";
import { useAuth } from "../AuthContext";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { login, error } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"Developer" | "Evaluator" | "">("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!role) {
      setStatusMessage("Please select a role");
      return;
    }
    
    setIsLoading(true);
    setStatusMessage(null);
    
    try {
      setStatusMessage("Logging in...");
      await login(email, password, role);
      
      // Show success message before redirect
      setStatusMessage(`Welcome ${role}! Redirecting...`);
      
      // Redirect based on role
      if (role === "Developer") {
        router.push("/submitpage");
      } else if (role === "Evaluator") {
        router.push("/evaluate");
      }
    } catch (err) {
      console.error("Login failed:", err);
      setStatusMessage("Login failed. Please check your credentials and try again.");
    } finally {
      // Only reset loading state if there was an error
      // (success case will redirect anyway)
      if (statusMessage?.includes("failed")) {
        setIsLoading(false);
      }
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-purple-900 to-purple-950 p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl p-10 max-w-xl w-full space-y-8"
      >
        <h2 className="text-3xl font-extrabold text-center text-white tracking-tight">
          Login
        </h2>

        {/* Status Messages */}
        {(statusMessage || error) && (
          <div className={`p-4 rounded-lg text-center ${
            statusMessage?.includes("failed") || error
              ? 'bg-red-900/50 border border-red-500/30 text-red-100'
              : 'bg-purple-900/50 border border-purple-500/30 text-purple-100'
          } animate-fade-in`}>
            {statusMessage || error}
          </div>
        )}

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white placeholder-white/70 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none transition-all duration-300 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white placeholder-white/70 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none transition-all duration-300 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
          />

          <select
            value={role}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setRole(e.target.value as "Developer" | "Evaluator" | "")
            }
            required
            disabled={isLoading}
            className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white text-gray-900 font-medium placeholder-gray-500 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none transition-all duration-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="" disabled className="text-gray-500">
              Select Role
            </option>
            <option value="Developer" className="text-gray-900 font-medium">Developer</option>
            <option value="Evaluator" className="text-gray-900 font-medium">Evaluator</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-lg hover:bg-gradient-to-r hover:from-purple-700 hover:to-purple-800 hover:shadow-lg hover:shadow-purple-500/50 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative"
        >
          {isLoading ? (
            <>
              <span className="opacity-0">Login</span>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            </>
          ) : (
            'Login'
          )}
        </button>
      </form>
    </main>
  );
}
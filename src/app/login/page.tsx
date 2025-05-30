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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!role) {
      alert("Please select a role");
      return;
    }
    try {
      await login(email, password, role);
      // Redirect based on role
      if (role === "Developer") {
        router.push("/submitpage");
      } else if (role === "Evaluator") {
        router.push("/evaluate");
      }
    } catch (err) {
      console.error("Login failed:", err);
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

        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white placeholder-white/70 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none transition-all duration-300 hover:bg-white/20"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white placeholder-white/70 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none transition-all duration-300 hover:bg-white/20"
        />

        <select
          value={role}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setRole(e.target.value as "Developer" | "Evaluator" | "")
          }
          required
          className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white text-gray-900 font-medium placeholder-gray-500 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none transition-all duration-300 hover:bg-gray-50"
        >
          <option value="" disabled className="text-gray-500">
            Select Role
          </option>
          <option value="Developer" className="text-gray-900 font-medium">Developer</option>
          <option value="Evaluator" className="text-gray-900 font-medium">Evaluator</option>
        </select>

        {error && (
          <p className="text-red-100 text-center bg-red-500/20 p-3 rounded-lg border border-red-500/30">{error}</p>
        )}

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-lg hover:bg-gradient-to-r hover:from-purple-700 hover:to-purple-800 hover:shadow-lg hover:shadow-purple-500/50 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 transition-all duration-300"
        >
          Login
        </button>
      </form>
    </main>
  );
}
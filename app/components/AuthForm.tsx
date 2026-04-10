"use client";

import { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@/app/lib/firebase-client";
import { MessageCircle } from "lucide-react";

export default function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0f14] px-6 relative overflow-hidden">
      <div className="absolute -top-40 -left-20 w-[70%] h-[80%] bg-indigo-500/20 blur-3xl" />
      <div className="absolute -bottom-40 -right-20 w-[60%] h-[70%] bg-purple-500/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-md bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
            <MessageCircle className="h-6 w-6 text-white" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold text-white">
            AI{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-purple-400">
              Chat
            </span>
          </h1>
          <p className="text-sm text-white/40 mt-1">
            Your intelligent conversation partner
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 mb-6">
          <button
            onClick={() => setIsLogin(true)}
            disabled={loading}
            className={`flex-1 py-2 rounded-lg text-sm transition ${
              isLogin
                ? "bg-linear-to-r from-indigo-500 to-purple-500 text-white"
                : "text-white/40"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsLogin(false)}
            disabled={loading}
            className={`flex-1 py-2 rounded-lg text-sm transition ${
              !isLogin
                ? "bg-linear-to-r from-indigo-500 to-purple-500 text-white"
                : "text-white/40"
            }`}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs text-white/50 mb-1 uppercase"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs text-white/50 mb-1 uppercase"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-linear-to-r from-indigo-500 to-purple-500 text-white font-semibold text-sm hover:opacity-90 transition disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : isLogin
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-white/30">or continue with</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm hover:bg-white/10 transition"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}

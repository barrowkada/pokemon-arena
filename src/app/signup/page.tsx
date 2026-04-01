"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

const TRAINERS = [
  "red", "leaf", "ethan", "lyra",
  "brendan", "may", "lucas", "dawn",
  "hilbert", "hilda", "nate", "rosa",
  "calem", "serena", "cynthia", "leon",
] as const;

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [handle, setHandle] = useState("");
  const [avatar, setAvatar] = useState<string>("red");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { handle } },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.user) {
        const { error: playerError } = await supabase.from("players").insert({
          id: data.user.id,
          handle,
          avatar,
        });

        if (playerError) {
          setError(playerError.message);
          return;
        }

        router.push("/starter");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2">New Trainer</h1>
        <p className="text-zinc-400 text-center mb-8">
          Register to start your journey
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Trainer Handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            required
            minLength={3}
            maxLength={20}
            className="w-full px-4 py-3 rounded-xl bg-card border border-white/10 focus:border-accent focus:outline-none transition"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-card border border-white/10 focus:border-accent focus:outline-none transition"
          />
          <input
            type="password"
            placeholder="Password (6+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-3 rounded-xl bg-card border border-white/10 focus:border-accent focus:outline-none transition"
          />

          {/* Trainer avatar picker */}
          <div>
            <p className="text-sm text-zinc-400 mb-2">Choose your trainer</p>
            <div className="grid grid-cols-4 gap-2">
              {TRAINERS.map((trainer) => (
                <button
                  key={trainer}
                  type="button"
                  onClick={() => setAvatar(trainer)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition cursor-pointer ${
                    avatar === trainer
                      ? "bg-accent/20 border-2 border-accent"
                      : "bg-card border-2 border-transparent hover:border-white/20"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg font-bold uppercase">
                    {trainer[0]}
                  </div>
                  <span className="text-[11px] capitalize">{trainer}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-danger text-sm text-center">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary mt-2">
            {loading ? "Creating account..." : "Start Adventure"}
          </button>
        </form>

        <p className="text-center text-zinc-500 mt-6 text-sm">
          Already a trainer?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}


       
       "use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { setSession } from "@/lib/auth";

export default function Home() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ name }) });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setSession(data.token, data.name);
      router.push("/dashboard");
    } catch {
      setError("Couldn't reach the backend. Is it running on port 4000?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <p className="text-sm text-subtle mb-2">Code by Groww · 2026</p>
        <h1 className="font-serif text-4xl leading-tight mb-4">
          Most of the market is <em>noise</em>. This finds what isn&apos;t.
        </h1>
        <p className="text-subtle mb-8 leading-relaxed">
         Scores every move against how each stock actually behaves, and tells you
          honestly when a price can&apos;t be trusted yet.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What should we call you?"
            className="w-full border border-line rounded-card px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-attention/40"
            autoFocus
          />
          {error && <p className="text-sm text-down">{error}</p>}
          <button
            type="submit"
            disabled={loading || name.trim().length < 2}
            className="w-full bg-brand text-white font-medium rounded-card px-4 py-3 disabled:opacity-40 text-sm"
          >
            {loading ? "One second..." : "Open my watchlist"}
          </button>
        </form>
        <p className="text-xs text-subtle mt-4">
          No password - this is a demo build. Same name from any device opens the same watchlist.
        </p>
      </div>
    </main>
  );
}
       
       
      

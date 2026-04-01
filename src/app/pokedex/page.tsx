"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { spriteUrl } from "@/lib/pokeapi";
import type { PokedexEntry } from "@/lib/types";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function PokedexPage() {
  const [entries, setEntries] = useState<PokedexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("pokedex_entries")
        .select("*")
        .eq("player_id", user.id)
        .order("pokeapi_id");

      setEntries(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 rounded-full border-4 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto w-full px-4 py-6">
      <button onClick={() => router.push("/hub")} className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 self-start transition">
        <ArrowLeft size={18} /> Back to Hub
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Pokédex</h1>
        <span className="text-zinc-400 text-sm">{entries.length} caught</span>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <p className="text-lg mb-2">No entries yet!</p>
          <p className="text-sm">Catch some Pokémon to fill your Pokédex.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="pokemon-card flex flex-col items-center p-3 gap-1"
            >
              <img
                src={spriteUrl(entry.pokeapi_id, entry.is_shiny)}
                alt={entry.name}
                width={64}
                height={64}
                style={{ imageRendering: "pixelated" }}
              />
              <span className="text-xs font-semibold capitalize truncate w-full text-center">
                {entry.is_shiny && "✨ "}{entry.name}
              </span>
              <span className={`type-${entry.type} text-[10px] px-2 py-0.5 rounded-full text-white capitalize`}>
                {entry.type}
              </span>
              <span className="text-[10px] text-zinc-600">
                #{String(entry.pokeapi_id).padStart(3, "0")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

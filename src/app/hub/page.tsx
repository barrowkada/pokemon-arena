"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Player } from "@/lib/types";
import { Swords, Search, BookOpen, ShoppingBag, LogOut } from "lucide-react";

export default function HubPage() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: p } = await supabase.from("players").select("*").eq("id", user.id).single();

      if (!p) { router.push("/starter"); return; }
      setPlayer(p);
      setLoading(false);
    }
    load();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading || !player) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 rounded-full border-4 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  const navItems = [
    { label: "Battle", href: "/battle", icon: Swords, color: "text-pokemon-red", desc: "Fight wild Pokémon" },
    { label: "Catch", href: "/catch", icon: Search, color: "text-pokemon-blue", desc: "Find new Pokémon" },
    { label: "Pokédex", href: "/pokedex", icon: BookOpen, color: "text-success", desc: "View collection" },
    { label: "Shop", href: "/shop", icon: ShoppingBag, color: "text-pokemon-yellow", desc: "Buy items" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div>
          <h1 className="text-xl font-bold">{player.handle}</h1>
          <div className="flex gap-4 text-sm text-zinc-400">
            <span>{player.wins}W / {player.losses}L</span>
            <span>STR {player.battle_strength}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 text-sm">
            <span title="Pokéballs">🔴 {player.pokeballs}</span>
            <span title="PokéDollars">💰 {player.pokedollars}</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-zinc-400 hover:text-white transition">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-8 max-w-2xl mx-auto w-full">
        {/* Navigation */}
        <section className="grid grid-cols-2 gap-4 w-full">
          {navItems.map(({ label, href, icon: Icon, color, desc }) => (
            <button
              key={href}
              onClick={() => router.push(href)}
              className="pokemon-card flex items-center gap-4 text-left cursor-pointer"
            >
              <Icon size={28} className={color} />
              <div>
                <span className="font-bold">{label}</span>
                <p className="text-xs text-zinc-500">{desc}</p>
              </div>
            </button>
          ))}
        </section>
      </main>
    </div>
  );
}

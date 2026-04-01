"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchPokemon, type PokemonData, spriteUrl } from "@/lib/pokeapi";
import { useRouter } from "next/navigation";

// Pseudo-legendary base forms
const PSEUDO_LEGENDARIES = [
  147, // Dratini
  246, // Larvitar
  371, // Bagon
  374, // Beldum
  443, // Gible
  633, // Deino
  704, // Goomy
  782, // Jangmo-o
  885, // Dreepy
];

export default function StarterPage() {
  const [starters, setStarters] = useState<PokemonData[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Pick 3 random pseudo-legendaries
    const shuffled = [...PSEUDO_LEGENDARIES].sort(() => Math.random() - 0.5);
    const set = shuffled.slice(0, 3);
    Promise.all(set.map(fetchPokemon))
      .then(setStarters)
      .finally(() => setLoading(false));
  }, []);

  async function pickStarter() {
    if (selected === null) return;
    setPicking(true);

    const pokemon = starters[selected];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Insert starter Pokémon
    await supabase.from("player_pokemon").insert({
      player_id: user.id,
      pokeapi_id: pokemon.id,
      name: pokemon.name,
      type: pokemon.types[0],
      hp: pokemon.hp,
      max_hp: pokemon.hp,
      atk: pokemon.atk,
      level: 5,
      is_starter: true,
      moves: pokemon.moves,
      slot_order: 0,
    });

    // Insert pokédex entry
    await supabase.from("pokedex_entries").insert({
      player_id: user.id,
      pokeapi_id: pokemon.id,
      name: pokemon.name,
      type: pokemon.types[0],
      caught: true,
    });

    router.push("/hub");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-accent border-t-transparent animate-spin" />
          <p className="text-zinc-400">Loading starters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <h1 className="text-3xl font-bold mb-2">Choose Your Starter</h1>
      <p className="text-zinc-400 mb-10">Pick a pseudo-legendary partner to begin your journey</p>

      <div className="grid grid-cols-3 gap-6 max-w-lg w-full mb-10">
        {starters.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setSelected(i)}
            className={`pokemon-card flex flex-col items-center gap-3 cursor-pointer ${
              selected === i ? "!border-accent animate-pulse-glow" : ""
            }`}
          >
            <img
              src={spriteUrl(p.id)}
              alt={p.name}
              width={96}
              height={96}
              className={`pixelated ${selected === i ? "animate-float" : ""}`}
              style={{ imageRendering: "pixelated" }}
            />
            <span className="font-bold capitalize">{p.name}</span>
            <span
              className={`type-${p.types[0]} text-xs px-3 py-1 rounded-full text-white font-semibold capitalize`}
            >
              {p.types[0]}
            </span>
            <div className="flex gap-3 text-xs text-zinc-400">
              <span>HP {p.hp}</span>
              <span>ATK {p.atk}</span>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={pickStarter}
        disabled={selected === null || picking}
        className="btn-primary text-lg px-10"
      >
        {picking
          ? "Choosing..."
          : selected !== null
            ? `I choose ${starters[selected].name}!`
            : "Select a Pokémon"}
      </button>
    </div>
  );
}

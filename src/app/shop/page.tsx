"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { fetchPokemon, type PokemonData } from "@/lib/pokeapi";

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
  action: (supabase: any, userId: string, player: any) => Promise<void>;
}

const LEGENDARY_IDS = [144, 145, 146, 150, 151]; // Articuno, Zapdos, Moltres, Mewtwo, Mew

const SHOP_ITEMS: Omit<ShopItem, "action">[] = [
  { id: "pokeball-5", name: "5 Pokéballs", description: "Stock up on Pokéballs to catch wild Pokémon", price: 100, emoji: "🔴" },
  { id: "pokeball-20", name: "20 Pokéballs", description: "Bulk deal on Pokéballs!", price: 350, emoji: "🔴" },
  { id: "heal-team", name: "Full Heal", description: "Restore all your Pokémon to full HP", price: 150, emoji: "💊" },
  { id: "rare-candy", name: "Rare Candy", description: "Level up your first Pokémon by 1", price: 300, emoji: "🍬" },
  { id: "legendary", name: "Legendary Pokémon", description: "Buy a random Legendary Pokémon for your collection!", price: 1000, emoji: "🌟" },
];

export default function ShopPage() {
  const [pokedollars, setPokedollars] = useState(0);
  const [pokeballs, setPokeballs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: player } = await supabase
        .from("players")
        .select("pokedollars, pokeballs")
        .eq("id", user.id)
        .single();
      if (player) {
        setPokedollars(player.pokedollars);
        setPokeballs(player.pokeballs);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function buy(item: typeof SHOP_ITEMS[number]) {
    if (pokedollars < item.price) {
      setMessage("Not enough PokéDollars!");
      return;
    }

    setBuying(item.id);
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newDollars = pokedollars - item.price;

    if (item.id === "pokeball-5") {
      const newBalls = pokeballs + 5;
      await supabase.from("players").update({ pokedollars: newDollars, pokeballs: newBalls }).eq("id", user.id);
      setPokedollars(newDollars);
      setPokeballs(newBalls);
      setMessage("Bought 5 Pokéballs!");
    } else if (item.id === "pokeball-20") {
      const newBalls = pokeballs + 20;
      await supabase.from("players").update({ pokedollars: newDollars, pokeballs: newBalls }).eq("id", user.id);
      setPokedollars(newDollars);
      setPokeballs(newBalls);
      setMessage("Bought 20 Pokéballs!");
    } else if (item.id === "heal-team") {
      await supabase.from("players").update({ pokedollars: newDollars }).eq("id", user.id);
      // Heal all pokemon
      const { data: team } = await supabase
        .from("player_pokemon")
        .select("id, max_hp")
        .eq("player_id", user.id);
      if (team) {
        await Promise.all(
          team.map((p: any) =>
            supabase.from("player_pokemon").update({ hp: p.max_hp }).eq("id", p.id)
          )
        );
      }
      setPokedollars(newDollars);
      setMessage("All Pokémon healed to full HP!");
    } else if (item.id === "rare-candy") {
      await supabase.from("players").update({ pokedollars: newDollars }).eq("id", user.id);
      const { data: team } = await supabase
        .from("player_pokemon")
        .select("id, level")
        .eq("player_id", user.id)
        .order("slot_order")
        .limit(1);
      if (team?.[0]) {
        await supabase
          .from("player_pokemon")
          .update({ level: team[0].level + 1 })
          .eq("id", team[0].id);
      }
      setPokedollars(newDollars);
      setMessage("Your lead Pokémon leveled up!");
    } else if (item.id === "legendary") {
      const randomId = LEGENDARY_IDS[Math.floor(Math.random() * LEGENDARY_IDS.length)];
      const pokemon: PokemonData = await fetchPokemon(randomId);
      const isShiny = Math.random() < 0.05;

      await supabase.from("players").update({ pokedollars: newDollars }).eq("id", user.id);

      await Promise.all([
        supabase.from("player_pokemon").insert({
          player_id: user.id,
          pokeapi_id: pokemon.id,
          name: pokemon.name,
          type: pokemon.types[0],
          hp: pokemon.hp,
          max_hp: pokemon.hp,
          atk: pokemon.atk,
          level: 50,
          is_shiny: isShiny,
          moves: pokemon.moves,
        }),
        supabase.from("pokedex_entries").upsert({
          player_id: user.id,
          pokeapi_id: pokemon.id,
          name: pokemon.name,
          type: pokemon.types[0],
          caught: true,
          is_shiny: isShiny,
        }, { onConflict: "player_id,pokeapi_id" }),
      ]);

      setPokedollars(newDollars);
      setMessage(`You got ${pokemon.name}${isShiny ? " ✨" : ""}! A Legendary Pokémon joins your team!`);
    }

    setBuying(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 rounded-full border-4 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto w-full px-4 py-6">
      <button onClick={() => router.push("/hub")} className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 self-start transition">
        <ArrowLeft size={18} /> Back to Hub
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">PokéShop</h1>
        <div className="flex items-center gap-3 text-sm">
          <span>🔴 {pokeballs}</span>
          <span>💰 {pokedollars}</span>
        </div>
      </div>

      {message && (
        <div className="bg-card border border-accent/30 rounded-xl px-4 py-3 mb-4 text-center text-sm">
          {message}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {SHOP_ITEMS.map((item) => (
          <div key={item.id} className="pokemon-card flex items-center gap-4">
            <span className="text-3xl">{item.emoji}</span>
            <div className="flex-1">
              <h3 className="font-bold">{item.name}</h3>
              <p className="text-xs text-zinc-400">{item.description}</p>
            </div>
            <button
              onClick={() => buy(item)}
              disabled={buying === item.id || pokedollars < item.price}
              className={`btn-primary text-sm px-4 py-2 ${
                pokedollars < item.price ? "opacity-50" : ""
              }`}
            >
              {buying === item.id ? "..." : `₽${item.price}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

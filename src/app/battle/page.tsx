"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchRandomPokemon, spriteUrl, type PokemonData } from "@/lib/pokeapi";
import type { PlayerPokemon } from "@/lib/types";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

type BattlePhase = "loading" | "pick" | "ready" | "fighting" | "result";
type LogEntry = { text: string; type: "player" | "opponent" | "system" };

export default function BattlePage() {
  const [phase, setPhase] = useState<BattlePhase>("loading");
  const [team, setTeam] = useState<PlayerPokemon[]>([]);
  const [activePokemon, setActivePokemon] = useState<PlayerPokemon | null>(null);
  const [opponent, setOpponent] = useState<PokemonData | null>(null);
  const [opponentHp, setOpponentHp] = useState(0);
  const [opponentMaxHp, setOpponentMaxHp] = useState(0);
  const [playerHp, setPlayerHp] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<"win" | "loss" | null>(null);
  const [isShiny, setIsShiny] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: pokemon }, opponents] = await Promise.all([
        supabase
          .from("player_pokemon")
          .select("*")
          .eq("player_id", user.id)
          .order("slot_order"),
        fetchRandomPokemon(1),
      ]);

      if (!pokemon?.length) { router.push("/hub"); return; }

      setTeam(pokemon);

      const opp = opponents[0];
      const shiny = Math.random() < 0.05;
      setOpponent(opp);
      setIsShiny(shiny);

      // If only 1 Pokémon, skip pick phase
      if (pokemon.length === 1) {
        selectPokemon(pokemon[0], opp, shiny);
      } else {
        setPhase("pick");
      }
    }
    init();
  }, []);

  function selectPokemon(pokemon: PlayerPokemon, opp?: PokemonData, shiny?: boolean) {
    const o = opp ?? opponent!;
    const s = shiny ?? isShiny;

    setActivePokemon(pokemon);
    setPlayerHp(pokemon.hp);

    // Scale opponent to player level ± 2
    const levelMod = (pokemon.level + Math.floor(Math.random() * 5) - 2) / 5;
    const scaledHp = Math.max(10, Math.floor(o.hp * levelMod));

    setOpponentHp(scaledHp);
    setOpponentMaxHp(scaledHp);
    setPhase("ready");
    setLog([{
      text: `A wild ${o.name}${s ? " ✨(shiny!)" : ""} appeared!`,
      type: "system",
    }, {
      text: `Go, ${pokemon.name}!`,
      type: "player",
    }]);
  }

  const addLog = useCallback((text: string, type: LogEntry["type"]) => {
    setLog((prev) => [...prev, { text, type }]);
  }, []);

  async function attack(moveIndex: number) {
    if (!activePokemon || !opponent || phase !== "ready") return;
    setPhase("fighting");

    const moves = Array.isArray(activePokemon.moves) ? activePokemon.moves : [];
    const moveName = moves[moveIndex] ?? "tackle";

    // Player attacks
    const playerDmg = Math.floor(
      (activePokemon.atk * (0.8 + Math.random() * 0.4) * activePokemon.level) / 10
    );
    const newOppHp = Math.max(0, opponentHp - playerDmg);
    addLog(`${activePokemon.name} used ${moveName}! (-${playerDmg} HP)`, "player");
    setOpponentHp(newOppHp);

    await delay(600);

    if (newOppHp <= 0) {
      await handleWin();
      return;
    }

    // Opponent attacks
    const oppAtk = opponent.atk;
    const oppDmg = Math.floor(
      (oppAtk * (0.7 + Math.random() * 0.4) * (activePokemon.level)) / 12
    );
    const newPlayerHp = Math.max(0, playerHp - oppDmg);
    const oppMove = opponent.moves[Math.floor(Math.random() * opponent.moves.length)] ?? "tackle";
    addLog(`${opponent.name} used ${oppMove}! (-${oppDmg} HP)`, "opponent");
    setPlayerHp(newPlayerHp);

    if (newPlayerHp <= 0) {
      await handleLoss();
      return;
    }

    setPhase("ready");
  }

  async function handleWin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !opponent || !activePokemon) return;

    const expGain = 15 + Math.floor(Math.random() * 10);
    const dollarReward = 50 + Math.floor(Math.random() * 50);

    addLog(`${opponent.name} fainted! You win!`, "system");
    addLog(`+${expGain} EXP, +${dollarReward} PokéDollars`, "system");

    const { data: currentPlayer } = await supabase
      .from("players")
      .select("wins, pokedollars, battle_strength")
      .eq("id", user.id)
      .single();

    await Promise.all([
      supabase
        .from("players")
        .update({
          wins: (currentPlayer?.wins ?? 0) + 1,
          pokedollars: (currentPlayer?.pokedollars ?? 0) + dollarReward,
          battle_strength: (currentPlayer?.battle_strength ?? 0) + 1,
        })
        .eq("id", user.id),
      supabase.from("player_pokemon").update({
        exp: activePokemon.exp + expGain,
        level: activePokemon.exp + expGain >= activePokemon.level * 20
          ? activePokemon.level + 1
          : activePokemon.level,
      }).eq("id", activePokemon.id),
      supabase.from("battle_log").insert({
        player_id: user.id,
        opponent_pokemon_id: opponent.id,
        opponent_name: opponent.name,
        result: "win",
        reward_type: "pokedollars",
        player_pokemon_id: activePokemon.pokeapi_id,
        opponent_was_shiny: isShiny,
      }),
    ]);

    setResult("win");
    setPhase("result");
  }

  async function handleLoss() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !opponent || !activePokemon) return;

    addLog(`${activePokemon.name} fainted! You lost...`, "system");

    const { data: currentPlayer } = await supabase
      .from("players")
      .select("losses")
      .eq("id", user.id)
      .single();

    await Promise.all([
      supabase
        .from("players")
        .update({ losses: (currentPlayer?.losses ?? 0) + 1 })
        .eq("id", user.id),
      supabase.from("battle_log").insert({
        player_id: user.id,
        opponent_pokemon_id: opponent.id,
        opponent_name: opponent.name,
        result: "loss",
        player_pokemon_id: activePokemon.pokeapi_id,
        opponent_was_shiny: isShiny,
      }),
    ]);

    setResult("loss");
    setPhase("result");
  }

  if (phase === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-accent border-t-transparent animate-spin" />
          <p className="text-zinc-400">Finding opponent...</p>
        </div>
      </div>
    );
  }

  // Pokémon selection screen
  if (phase === "pick") {
    return (
      <div className="min-h-screen flex flex-col max-w-2xl mx-auto w-full px-4 py-6">
        <button onClick={() => router.push("/hub")} className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 self-start transition">
          <ArrowLeft size={18} /> Back to Hub
        </button>

        {opponent && (
          <div className="pokemon-card flex items-center gap-4 mb-6">
            <img
              src={spriteUrl(opponent.id, isShiny)}
              alt={opponent.name}
              width={64}
              height={64}
              style={{ imageRendering: "pixelated" }}
            />
            <div>
              <p className="text-sm text-zinc-400">Wild opponent</p>
              <p className="font-bold capitalize">{opponent.name} {isShiny && "✨"}</p>
              <span className={`type-${opponent.types[0]} text-[10px] px-2 py-0.5 rounded-full text-white capitalize`}>
                {opponent.types[0]}
              </span>
            </div>
          </div>
        )}

        <h2 className="text-xl font-bold mb-4">Choose your Pokémon</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {team.map((p) => (
            <button
              key={p.id}
              onClick={() => selectPokemon(p)}
              disabled={p.hp <= 0}
              className={`pokemon-card flex flex-col items-center gap-2 cursor-pointer ${
                p.hp <= 0 ? "opacity-40 cursor-not-allowed" : ""
              }`}
            >
              <img
                src={spriteUrl(p.pokeapi_id, p.is_shiny)}
                alt={p.name}
                width={64}
                height={64}
                style={{ imageRendering: "pixelated" }}
              />
              <span className="text-sm font-bold capitalize">{p.name}</span>
              <span className="text-[10px] text-zinc-500">Lv.{p.level}</span>
              <div className="hp-bar w-full">
                <div
                  className="hp-bar-fill"
                  style={{
                    width: `${(p.hp / p.max_hp) * 100}%`,
                    background: p.hp / p.max_hp > 0.5 ? "#22c55e" : p.hp / p.max_hp > 0.2 ? "#eab308" : "#ef4444",
                  }}
                />
              </div>
              <span className="text-[10px] text-zinc-500">{p.hp}/{p.max_hp} HP</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto w-full px-4 py-6">
      {/* Back button */}
      <button onClick={() => router.push("/hub")} className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 self-start transition">
        <ArrowLeft size={18} /> Back to Hub
      </button>

      {/* Battle field */}
      <div className="flex-1 flex flex-col">
        {/* Opponent */}
        {opponent && (
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold capitalize">{opponent.name}</span>
                {isShiny && <span className="text-pokemon-yellow text-sm">✨</span>}
                <span className={`type-${opponent.types[0]} text-[10px] px-2 py-0.5 rounded-full text-white capitalize`}>
                  {opponent.types[0]}
                </span>
              </div>
              <div className="hp-bar mt-1 w-48">
                <div
                  className="hp-bar-fill"
                  style={{
                    width: `${(opponentHp / opponentMaxHp) * 100}%`,
                    background: opponentHp / opponentMaxHp > 0.5 ? "#22c55e" : opponentHp / opponentMaxHp > 0.2 ? "#eab308" : "#ef4444",
                  }}
                />
              </div>
              <span className="text-xs text-zinc-500">{opponentHp}/{opponentMaxHp} HP</span>
            </div>
            <img
              src={spriteUrl(opponent.id, isShiny)}
              alt={opponent.name}
              width={96}
              height={96}
              style={{ imageRendering: "pixelated" }}
              className={phase === "fighting" ? "animate-shake" : ""}
            />
          </div>
        )}

        {/* Player */}
        {activePokemon && (
          <div className="flex items-end justify-between mt-4">
            <img
              src={spriteUrl(activePokemon.pokeapi_id, activePokemon.is_shiny)}
              alt={activePokemon.name}
              width={96}
              height={96}
              style={{ imageRendering: "pixelated" }}
              className={phase === "fighting" ? "animate-shake" : ""}
            />
            <div className="flex-1 text-right">
              <div className="flex items-center justify-end gap-2">
                <span className="font-bold capitalize">{activePokemon.name}</span>
                <span className="text-xs text-zinc-500">Lv.{activePokemon.level}</span>
              </div>
              <div className="hp-bar mt-1 w-48 ml-auto">
                <div
                  className="hp-bar-fill"
                  style={{
                    width: `${(playerHp / activePokemon.max_hp) * 100}%`,
                    background: playerHp / activePokemon.max_hp > 0.5 ? "#22c55e" : playerHp / activePokemon.max_hp > 0.2 ? "#eab308" : "#ef4444",
                  }}
                />
              </div>
              <span className="text-xs text-zinc-500">{playerHp}/{activePokemon.max_hp} HP</span>
            </div>
          </div>
        )}

        {/* Battle log */}
        <div className="mt-6 bg-card rounded-xl p-4 h-32 overflow-y-auto text-sm space-y-1">
          {log.map((entry, i) => (
            <p
              key={i}
              className={
                entry.type === "player"
                  ? "text-pokemon-blue"
                  : entry.type === "opponent"
                    ? "text-pokemon-red"
                    : "text-accent"
              }
            >
              {entry.text}
            </p>
          ))}
        </div>

        {/* Actions */}
        {phase === "ready" && activePokemon && (
          <div className="grid grid-cols-2 gap-3 mt-6">
            {(Array.isArray(activePokemon.moves) ? activePokemon.moves : []).slice(0, 4).map((move, i) => (
              <button
                key={i}
                onClick={() => attack(i)}
                className="btn-secondary capitalize"
              >
                {typeof move === "string" ? move : "tackle"}
              </button>
            ))}
            {(!activePokemon.moves || (Array.isArray(activePokemon.moves) && activePokemon.moves.length === 0)) && (
              <button onClick={() => attack(0)} className="btn-secondary col-span-2">
                Tackle
              </button>
            )}
          </div>
        )}

        {phase === "result" && (
          <div className="mt-6 text-center">
            <h2 className={`text-2xl font-bold ${result === "win" ? "text-success" : "text-danger"}`}>
              {result === "win" ? "Victory!" : "Defeat..."}
            </h2>
            <div className="flex gap-3 justify-center mt-4">
              <button onClick={() => window.location.reload()} className="btn-primary">
                Battle Again
              </button>
              <button onClick={() => router.push("/hub")} className="btn-secondary">
                Back to Hub
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

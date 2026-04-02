"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchRandomPokemon, spriteUrl, type PokemonData } from "@/lib/pokeapi";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

type Phase = "loading" | "encounter" | "trivia" | "result";

interface TriviaQuestion {
  question: string;
  answers: string[];
  correct: number;
}

export default function CatchPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [wild, setWild] = useState<PokemonData | null>(null);
  const [isShiny, setIsShiny] = useState(false);
  const [trivia, setTrivia] = useState<TriviaQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [caught, setCaught] = useState(false);
  const [pokeballs, setPokeballs] = useState(0);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: player } = await supabase
        .from("players")
        .select("pokeballs")
        .eq("id", user.id)
        .single();

      setPokeballs(player?.pokeballs ?? 0);

      const [pokemon] = await fetchRandomPokemon(1);
      const shiny = Math.random() < 0.05;
      setWild(pokemon);
      setIsShiny(shiny);
      setPhase("encounter");
    }
    init();
  }, []);

  async function throwPokeball() {
    if (pokeballs <= 0) {
      setMessage("No Pokéballs! Visit the Shop.");
      return;
    }

    // Decrement pokéballs
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("players")
      .update({ pokeballs: pokeballs - 1 })
      .eq("id", user.id);
    setPokeballs((p) => p - 1);

    // Fetch trivia question (exclude the caught pokemon's ID)
    const res = await fetch(`/api/trivia?exclude=${wild?.id ?? 0}`);
    const q: TriviaQuestion = await res.json();
    setTrivia(q);
    setSelectedAnswer(null);
    setPhase("trivia");
  }

  async function submitAnswer(answerIndex: number) {
    if (!trivia || !wild) return;
    setSelectedAnswer(answerIndex);

    const correct = answerIndex === trivia.correct;

    // Wait a moment to show the answer
    await new Promise((r) => setTimeout(r, 1000));

    if (correct) {
      // Caught!
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await Promise.all([
        supabase.from("player_pokemon").insert({
          player_id: user.id,
          pokeapi_id: wild.id,
          name: wild.name,
          type: wild.types[0],
          hp: wild.hp,
          max_hp: wild.hp,
          atk: wild.atk,
          level: 3 + Math.floor(Math.random() * 5),
          is_shiny: isShiny,
          moves: wild.moves,
        }),
        supabase.from("pokedex_entries").upsert({
          player_id: user.id,
          pokeapi_id: wild.id,
          name: wild.name,
          type: wild.types[0],
          caught: true,
          is_shiny: isShiny,
        }, { onConflict: "player_id,pokeapi_id" }),
      ]);

      setCaught(true);
      setMessage(`Gotcha! ${wild.name} was caught!`);
    } else {
      setCaught(false);
      setMessage(`${wild.name} broke free!`);
    }

    setPhase("result");
  }

  if (phase === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 rounded-full border-4 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto w-full px-4 py-6">
      <button onClick={() => router.push("/hub")} className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 self-start transition">
        <ArrowLeft size={18} /> Back to Hub
      </button>

      {wild && (
        <div className="flex-1 flex flex-col items-center">
          {/* Wild Pokémon display */}
          <div className="pokemon-card w-full flex flex-col items-center py-8 mb-6">
            <img
              src={spriteUrl(wild.id, isShiny)}
              alt={wild.name}
              width={128}
              height={128}
              style={{ imageRendering: "pixelated" }}
              className={phase === "encounter" ? "animate-float" : caught ? "" : "opacity-50"}
            />
            <h2 className="text-xl font-bold capitalize mt-4">
              {wild.name} {isShiny && "✨"}
            </h2>
            <div className="flex gap-2 mt-2">
              {wild.types.map((t) => (
                <span key={t} className={`type-${t} text-xs px-3 py-1 rounded-full text-white capitalize`}>
                  {t}
                </span>
              ))}
            </div>
            <div className="flex gap-4 text-sm text-zinc-400 mt-2">
              <span>HP {wild.hp}</span>
              <span>ATK {wild.atk}</span>
            </div>
          </div>

          {/* Encounter phase */}
          {phase === "encounter" && (
            <div className="w-full text-center">
              <p className="text-zinc-400 mb-4">Pokéballs: {pokeballs}</p>
              <button
                onClick={throwPokeball}
                disabled={pokeballs <= 0}
                className="btn-primary text-lg px-8"
              >
                {pokeballs > 0 ? "Throw Pokéball!" : "No Pokéballs!"}
              </button>
              {message && <p className="text-danger mt-3 text-sm">{message}</p>}
              {pokeballs <= 0 && (
                <button
                  onClick={() => router.push("/shop")}
                  className="btn-secondary mt-3"
                >
                  Go to Shop
                </button>
              )}
            </div>
          )}

          {/* Trivia phase */}
          {phase === "trivia" && trivia && (
            <div className="w-full">
              <div className="pokemon-card mb-4">
                <p className="font-semibold text-center mb-4">{trivia.question}</p>
                <div className="grid grid-cols-1 gap-2">
                  {trivia.answers.map((answer, i) => (
                    <button
                      key={i}
                      onClick={() => selectedAnswer === null && submitAnswer(i)}
                      disabled={selectedAnswer !== null}
                      className={`px-4 py-3 rounded-xl text-left transition font-medium ${
                        selectedAnswer === null
                          ? "bg-white/5 hover:bg-white/10 cursor-pointer"
                          : i === trivia.correct
                            ? "bg-success/20 text-success"
                            : i === selectedAnswer
                              ? "bg-danger/20 text-danger"
                              : "bg-white/5 opacity-50"
                      }`}
                    >
                      {answer}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Result phase */}
          {phase === "result" && (
            <div className="text-center">
              <h3 className={`text-2xl font-bold ${caught ? "text-success" : "text-danger"}`}>
                {caught ? "Caught!" : "Escaped!"}
              </h3>
              <p className="text-zinc-400 mt-2">{message}</p>
              <div className="flex gap-3 justify-center mt-6">
                <button onClick={() => window.location.reload()} className="btn-primary">
                  Try Again
                </button>
                <button onClick={() => router.push("/hub")} className="btn-secondary">
                  Back to Hub
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";

export default function TitlePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden">
      {/* Background pokeball pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full border-4 border-white" />
        <div className="absolute top-40 right-20 w-24 h-24 rounded-full border-4 border-white" />
        <div className="absolute bottom-20 left-1/4 w-40 h-40 rounded-full border-4 border-white" />
        <div className="absolute bottom-40 right-1/3 w-20 h-20 rounded-full border-4 border-white" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 animate-slide-up">
        {/* Pokeball icon */}
        <div className="w-24 h-24 relative animate-float">
          <div className="w-full h-full rounded-full border-4 border-white overflow-hidden">
            <div className="h-1/2 bg-pokemon-red" />
            <div className="h-1/2 bg-white" />
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border-4 border-zinc-800" />
        </div>

        <div className="text-center">
          <h1 className="text-6xl font-black tracking-tight mb-2">
            <span className="text-pokemon-red">Pokémon</span>{" "}
            <span className="text-accent">Arena</span>
          </h1>
          <p className="text-lg text-zinc-400">
            Catch, battle, and become the champion
          </p>
        </div>

        <div className="flex flex-col gap-3 w-64 mt-4">
          <Link href="/signup" className="btn-primary text-center text-lg">
            New Game
          </Link>
          <Link href="/login" className="btn-secondary text-center">
            Continue
          </Link>
        </div>

        <p className="text-xs text-zinc-600 mt-8">
          Powered by PokéAPI &middot; Gen I
        </p>
      </div>
    </div>
  );
}

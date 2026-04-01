const BASE = "https://pokeapi.co/api/v2";

export interface PokemonData {
  id: number;
  name: string;
  types: string[];
  hp: number;
  atk: number;
  sprites: {
    front: string;
    frontShiny: string;
    artwork: string;
  };
  moves: string[];
}

export async function fetchPokemon(idOrName: number | string): Promise<PokemonData> {
  const res = await fetch(`${BASE}/pokemon/${idOrName}`);
  if (!res.ok) throw new Error(`PokéAPI error: ${res.status}`);
  const data = await res.json();

  const hp = data.stats.find((s: any) => s.stat.name === "hp")?.base_stat ?? 45;
  const atk = data.stats.find((s: any) => s.stat.name === "attack")?.base_stat ?? 45;

  const moves = data.moves
    .slice(0, 4)
    .map((m: any) => m.move.name.replace("-", " "));

  return {
    id: data.id,
    name: data.name,
    types: data.types.map((t: any) => t.type.name),
    hp,
    atk,
    sprites: {
      front: data.sprites.front_default,
      frontShiny: data.sprites.front_shiny,
      artwork:
        data.sprites.other?.["official-artwork"]?.front_default ??
        data.sprites.front_default,
    },
    moves,
  };
}

export async function fetchRandomPokemon(count: number = 1): Promise<PokemonData[]> {
  const ids = new Set<number>();
  while (ids.size < count) {
    ids.add(Math.floor(Math.random() * 151) + 1); // Gen 1
  }
  return Promise.all([...ids].map(fetchPokemon));
}

export function spriteUrl(pokeapiId: number, shiny = false): string {
  const variant = shiny ? "shiny" : "";
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${variant ? variant + "/" : ""}${pokeapiId}.png`;
}

export function artworkUrl(pokeapiId: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokeapiId}.png`;
}

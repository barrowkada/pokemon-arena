import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BASE = "https://pokeapi.co/api/v2";
const MAX_ID = 898;

const ALL_TYPES = [
  "normal", "fire", "water", "grass", "electric", "ice", "fighting",
  "poison", "ground", "flying", "psychic", "bug", "rock", "ghost",
  "dragon", "dark", "steel", "fairy",
];

const ALL_COLORS = [
  "black", "blue", "brown", "gray", "green", "pink", "purple", "red", "white", "yellow",
];

const ALL_SHAPES = [
  "ball", "squiggle", "fish", "arms", "blob", "upright", "legs", "quadruped",
  "wings", "tentacles", "heads", "humanoid", "bug-wings", "armor",
];

// In-memory cache for the lifetime of the serverless function
const cache = new Map<string, any>();

async function cachedFetch(url: string): Promise<any> {
  if (cache.has(url)) return cache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PokéAPI ${res.status}: ${url}`);
  const data = await res.json();
  cache.set(url, data);
  return data;
}

function randId(exclude?: number): number {
  let id: number;
  do {
    id = Math.floor(Math.random() * MAX_ID) + 1;
  } while (id === exclude);
  return id;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom<T>(arr: T[], count: number, exclude?: T[]): T[] {
  const filtered = exclude ? arr.filter((x) => !exclude.includes(x)) : [...arr];
  return shuffle(filtered).slice(0, count);
}

function buildQuestion(question: string, correct: string, wrongs: string[]) {
  const answers = shuffle([correct, ...wrongs.slice(0, 3)]);
  return { question, answers, correct: answers.indexOf(correct) };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ");
}

// --- Question generators ---

async function questionType(excludeId: number) {
  const id = randId(excludeId);
  const pokemon = await cachedFetch(`${BASE}/pokemon/${id}`);
  const name = capitalize(pokemon.name);
  const primaryType = pokemon.types[0].type.name as string;
  const wrongs = pickRandom(ALL_TYPES, 3, [primaryType]);
  return buildQuestion(
    `What type is ${name}?`,
    capitalize(primaryType),
    wrongs.map(capitalize),
  );
}

async function questionEvolvesInto(excludeId: number) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = randId(excludeId);
    const species = await cachedFetch(`${BASE}/pokemon-species/${id}`);
    const chain = await cachedFetch(species.evolution_chain.url);

    // Walk the chain to find this species and its next evolution
    const next = findNextEvo(chain.chain, species.name);
    if (!next) continue;

    const wrongs = await getRandomPokemonNames(3, [species.name, next]);
    return buildQuestion(
      `What does ${capitalize(species.name)} evolve into?`,
      capitalize(next),
      wrongs.map(capitalize),
    );
  }
  // Fallback to type question
  return questionType(excludeId);
}

async function questionEvolvesFrom(excludeId: number) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = randId(excludeId);
    const species = await cachedFetch(`${BASE}/pokemon-species/${id}`);
    if (!species.evolves_from_species) continue;

    const preName = species.evolves_from_species.name;
    const wrongs = await getRandomPokemonNames(3, [species.name, preName]);
    return buildQuestion(
      `What does ${capitalize(species.name)} evolve from?`,
      capitalize(preName),
      wrongs.map(capitalize),
    );
  }
  return questionType(excludeId);
}

async function questionWhichIsType(excludeId: number) {
  const type = ALL_TYPES[Math.floor(Math.random() * ALL_TYPES.length)];
  const typeData = await cachedFetch(`${BASE}/type/${type}`);
  const pokemonOfType = typeData.pokemon.map((p: any) => p.pokemon.name);

  if (pokemonOfType.length === 0) return questionType(excludeId);

  const correct = pokemonOfType[Math.floor(Math.random() * pokemonOfType.length)];

  // Get 3 pokemon NOT of this type
  const wrongs: string[] = [];
  for (let i = 0; i < 10 && wrongs.length < 3; i++) {
    const rid = randId(excludeId);
    const p = await cachedFetch(`${BASE}/pokemon/${rid}`);
    const types = p.types.map((t: any) => t.type.name);
    if (!types.includes(type) && !wrongs.includes(p.name) && p.name !== correct) {
      wrongs.push(p.name);
    }
  }

  if (wrongs.length < 3) return questionType(excludeId);

  return buildQuestion(
    `Which of these is a ${capitalize(type)} type?`,
    capitalize(correct),
    wrongs.map(capitalize),
  );
}

async function questionGeneration(excludeId: number) {
  const id = randId(excludeId);
  const species = await cachedFetch(`${BASE}/pokemon-species/${id}`);
  const genUrl = species.generation.url as string;
  const genNum = parseInt(genUrl.split("/").filter(Boolean).pop()!);
  const wrongs = pickRandom([1, 2, 3, 4, 5, 6, 7, 8], 3, [genNum]);
  return buildQuestion(
    `What generation is ${capitalize(species.name)} from?`,
    `Generation ${genNum}`,
    wrongs.map((n) => `Generation ${n}`),
  );
}

async function questionWeight(excludeId: number) {
  const id = randId(excludeId);
  const pokemon = await cachedFetch(`${BASE}/pokemon/${id}`);
  const name = capitalize(pokemon.name);
  const weightKg = (pokemon.weight / 10).toFixed(1);
  const base = pokemon.weight / 10;
  const wrongs = [
    (base * (0.4 + Math.random() * 0.3)).toFixed(1),
    (base * (1.4 + Math.random() * 0.5)).toFixed(1),
    (base * (2.0 + Math.random() * 1.0)).toFixed(1),
  ];
  return buildQuestion(
    `How much does ${name} weigh?`,
    `${weightKg} kg`,
    wrongs.map((w) => `${w} kg`),
  );
}

async function questionAbility(excludeId: number) {
  const id = randId(excludeId);
  const pokemon = await cachedFetch(`${BASE}/pokemon/${id}`);
  const name = capitalize(pokemon.name);

  if (!pokemon.abilities.length) return questionType(excludeId);

  const correct = pokemon.abilities[0].ability.name;

  // Get abilities from other random pokemon
  const wrongs: string[] = [];
  for (let i = 0; i < 10 && wrongs.length < 3; i++) {
    const rid = randId(excludeId);
    const p = await cachedFetch(`${BASE}/pokemon/${rid}`);
    for (const a of p.abilities) {
      if (a.ability.name !== correct && !wrongs.includes(a.ability.name)) {
        wrongs.push(a.ability.name);
        break;
      }
    }
  }

  if (wrongs.length < 3) return questionType(excludeId);

  return buildQuestion(
    `What ability can ${name} have?`,
    capitalize(correct),
    wrongs.map(capitalize),
  );
}

async function questionHeight(excludeId: number) {
  const id = randId(excludeId);
  const pokemon = await cachedFetch(`${BASE}/pokemon/${id}`);
  const name = capitalize(pokemon.name);
  const heightM = (pokemon.height / 10).toFixed(1);
  const base = pokemon.height / 10;
  const wrongs = [
    Math.max(0.1, base * (0.4 + Math.random() * 0.3)).toFixed(1),
    (base * (1.4 + Math.random() * 0.5)).toFixed(1),
    (base * (2.0 + Math.random() * 1.0)).toFixed(1),
  ];
  return buildQuestion(
    `How tall is ${name}?`,
    `${heightM} m`,
    wrongs.map((h) => `${h} m`),
  );
}

async function questionColor(excludeId: number) {
  const id = randId(excludeId);
  const species = await cachedFetch(`${BASE}/pokemon-species/${id}`);
  const name = capitalize(species.name);
  const correct = species.color.name as string;
  const wrongs = pickRandom(ALL_COLORS, 3, [correct]);
  return buildQuestion(
    `What color is ${name} classified as?`,
    capitalize(correct),
    wrongs.map(capitalize),
  );
}

async function questionShape(excludeId: number) {
  const id = randId(excludeId);
  const species = await cachedFetch(`${BASE}/pokemon-species/${id}`);
  const name = capitalize(species.name);

  if (!species.shape) return questionType(excludeId);

  const correct = species.shape.name as string;
  const wrongs = pickRandom(ALL_SHAPES, 3, [correct]);
  return buildQuestion(
    `What shape is ${name}?`,
    capitalize(correct),
    wrongs.map(capitalize),
  );
}

// --- Helpers ---

function findNextEvo(chain: any, name: string): string | null {
  if (chain.species.name === name) {
    if (chain.evolves_to.length > 0) {
      return chain.evolves_to[0].species.name;
    }
    return null;
  }
  for (const evo of chain.evolves_to) {
    const result = findNextEvo(evo, name);
    if (result) return result;
  }
  return null;
}

async function getRandomPokemonNames(count: number, exclude: string[]): Promise<string[]> {
  const names: string[] = [];
  for (let i = 0; i < 20 && names.length < count; i++) {
    const id = Math.floor(Math.random() * MAX_ID) + 1;
    const p = await cachedFetch(`${BASE}/pokemon/${id}`);
    if (!exclude.includes(p.name) && !names.includes(p.name)) {
      names.push(p.name);
    }
  }
  return names;
}

// --- Route handler ---

const generators = [
  questionType,
  questionEvolvesInto,
  questionEvolvesFrom,
  questionWhichIsType,
  questionGeneration,
  questionWeight,
  questionAbility,
  questionHeight,
  questionColor,
  questionShape,
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const excludeId = parseInt(searchParams.get("exclude") ?? "0") || 0;

  // Try up to 3 random generators before falling back
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const gen = generators[Math.floor(Math.random() * generators.length)];
      const question = await gen(excludeId);
      return NextResponse.json(question);
    } catch {
      // PokéAPI failure — try another generator
    }
  }

  // Ultimate fallback: simple type question
  try {
    const question = await questionType(excludeId);
    return NextResponse.json(question);
  } catch {
    return NextResponse.json(
      { error: "Failed to generate trivia" },
      { status: 500 },
    );
  }
}

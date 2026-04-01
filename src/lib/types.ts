export interface Player {
  id: string;
  handle: string;
  avatar: string;
  pokeballs: number;
  pokedollars: number;
  wins: number;
  losses: number;
  battle_strength: number;
  created_at: string;
  updated_at: string;
}

export interface PlayerPokemon {
  id: string;
  player_id: string;
  pokeapi_id: number;
  name: string;
  type: string;
  hp: number;
  max_hp: number;
  atk: number;
  level: number;
  exp: number;
  is_starter: boolean;
  is_shiny: boolean;
  moves: string[];
  slot_order: number;
  created_at: string;
}

export interface PokedexEntry {
  id: string;
  player_id: string;
  pokeapi_id: number;
  name: string;
  type: string;
  caught: boolean;
  is_shiny: boolean;
  caught_at: string;
}

export interface BattleLogEntry {
  id: string;
  player_id: string;
  opponent_pokemon_id: number;
  opponent_name: string;
  result: "win" | "loss";
  reward_type: string | null;
  player_pokemon_id: number;
  opponent_was_shiny: boolean;
  created_at: string;
}

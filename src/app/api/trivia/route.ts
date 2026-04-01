import { NextResponse } from "next/server";

interface TriviaQuestion {
  question: string;
  answers: string[];
  correct: number;
}

// Pokémon trivia bank — all Gen 1 related
const TRIVIA: TriviaQuestion[] = [
  { question: "What type is Pikachu?", answers: ["Fire", "Electric", "Normal", "Water"], correct: 1 },
  { question: "Which Pokémon is #001 in the Pokédex?", answers: ["Pikachu", "Charmander", "Bulbasaur", "Squirtle"], correct: 2 },
  { question: "What does Magikarp evolve into?", answers: ["Goldeen", "Gyarados", "Seaking", "Lapras"], correct: 1 },
  { question: "What type is super effective against Water?", answers: ["Fire", "Ground", "Grass", "Normal"], correct: 2 },
  { question: "How many original Pokémon are there in Gen 1?", answers: ["100", "151", "150", "200"], correct: 1 },
  { question: "What is Meowth's signature move?", answers: ["Scratch", "Pay Day", "Fury Swipes", "Bite"], correct: 1 },
  { question: "Which legendary bird is Ice-type?", answers: ["Moltres", "Zapdos", "Articuno", "Lugia"], correct: 2 },
  { question: "What stone evolves Eevee into Flareon?", answers: ["Water Stone", "Thunder Stone", "Fire Stone", "Moon Stone"], correct: 2 },
  { question: "What type is Gengar?", answers: ["Dark", "Psychic", "Ghost/Poison", "Ghost"], correct: 2 },
  { question: "Which Pokémon is known as the 'Seed Pokémon'?", answers: ["Oddish", "Bulbasaur", "Bellsprout", "Exeggcute"], correct: 1 },
  { question: "What is the pre-evolution of Dragonite?", answers: ["Dratini", "Dragonair", "Dragonite", "Aerodactyl"], correct: 1 },
  { question: "What type is strong against Psychic in Gen 1?", answers: ["Ghost", "Dark", "Bug", "Fighting"], correct: 2 },
  { question: "Which gym leader uses Water-type Pokémon?", answers: ["Brock", "Misty", "Lt. Surge", "Erika"], correct: 1 },
  { question: "What level does Charmeleon evolve into Charizard?", answers: ["30", "32", "36", "40"], correct: 2 },
  { question: "What is Snorlax known for?", answers: ["Speed", "Sleeping", "Flying", "Swimming"], correct: 1 },
  { question: "Which Pokémon can learn Surf and Fly?", answers: ["Charizard", "Dragonite", "Gyarados", "Pidgeot"], correct: 1 },
  { question: "What does the Moon Stone evolve Clefairy into?", answers: ["Cleffa", "Clefable", "Wigglytuff", "Jigglypuff"], correct: 1 },
  { question: "Who is the Champion in Pokémon Red/Blue?", answers: ["Gary", "Blue/Rival", "Lance", "Professor Oak"], correct: 1 },
  { question: "What type is Jigglypuff?", answers: ["Fairy", "Normal", "Normal/Fairy", "Psychic"], correct: 1 },
  { question: "Which Pokémon is #150?", answers: ["Mew", "Mewtwo", "Dragonite", "Articuno"], correct: 1 },
];

export async function GET() {
  const q = TRIVIA[Math.floor(Math.random() * TRIVIA.length)];
  return NextResponse.json(q);
}

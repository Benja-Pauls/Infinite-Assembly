import axios from 'axios';
import type { GPTResponse } from '../types/game';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const systemPrompt = `You are a creative game designer for "AI Factory Sandbox". When given a combination of ingredients and a modifier, you create a new item with these properties:

1. A creative and funny name that makes sense for the combination
2. An appropriate emoji (single emoji only)
3. A cash value (cashPerItem) that should generally increase with complexity
4. A type: either "Ingredient" or "Modifier"

Rules:
- Be creative and humorous
- Higher complexity combinations should be worth more money
- Basic combinations start around $1-100
- Complex combinations can go into millions or billions
- Use scientific, pop culture, or absurd references
- The emoji should be relevant to the item

Respond ONLY with a JSON object in this exact format:
{
  "name": "Item Name",
  "emoji": "🎯",
  "cashPerItem": 1000,
  "type": "Ingredient"
}`;

export async function combineItems(ingredients: string[], modifier: string): Promise<GPTResponse> {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
    // Return a fallback response for demo purposes
    return generateFallbackResponse(ingredients, modifier);
  }

  try {
    const prompt = `Combine these ingredients: ${ingredients.join(', ')} using the modifier: ${modifier}`;
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.8,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data.choices[0].message.content;
    const result = JSON.parse(content);
    
    // Validate the response
    if (!result.name || !result.emoji || !result.cashPerItem || !result.type) {
      throw new Error('Invalid GPT response format');
    }

    return result;
  } catch (error) {
    console.error('GPT API error:', error);
    return generateFallbackResponse(ingredients, modifier);
  }
}

function generateFallbackResponse(ingredients: string[], modifier: string): GPTResponse {
  // Fallback responses for demo purposes
  const fallbacks = [
    {
      name: 'Mysterious Goo',
      emoji: '🧪',
      cashPerItem: Math.floor(Math.random() * 1000) + 100,
      type: 'Ingredient' as const
    },
    {
      name: 'Chaos Crystal',
      emoji: '💎',
      cashPerItem: Math.floor(Math.random() * 10000) + 1000,
      type: 'Ingredient' as const
    },
    {
      name: 'Quantum Soup',
      emoji: '🍲',
      cashPerItem: Math.floor(Math.random() * 100000) + 10000,
      type: 'Ingredient' as const
    },
    {
      name: 'Hyperdimensional Widget',
      emoji: '🔧',
      cashPerItem: Math.floor(Math.random() * 1000000) + 100000,
      type: 'Modifier' as const
    },
    {
      name: 'Cosmic Blender',
      emoji: '🌌',
      cashPerItem: Math.floor(Math.random() * 10000000) + 1000000,
      type: 'Modifier' as const
    }
  ];

  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

export function getCachedCombo(ingredients: string[], modifier: string): string {
  // Create a consistent cache key
  const sortedIngredients = [...ingredients].sort();
  return `${sortedIngredients.join('+')}+${modifier}`;
}

export function getWealthMilestone(cash: number): string {
  if (cash < 1000) return "You're just getting started! 💰";
  if (cash < 10000) return "You could buy a fancy coffee machine! ☕";
  if (cash < 100000) return "You could buy a car! 🚗";
  if (cash < 1000000) return "You could buy a house! 🏠";
  if (cash < 10000000) return "You're officially a millionaire! 🎩";
  if (cash < 100000000) return "You could buy a private jet! ✈️";
  if (cash < 1000000000) return "You could buy a small island! 🏝️";
  if (cash < 10000000000) return "You're richer than most countries! 🌍";
  if (cash < 100000000000) return "You could buy Twitter! 🐦";
  if (cash < 1000000000000) return "You could fund a space program! 🚀";
  return "You have transcended earthly wealth! 🌌";
} 
import axios from 'axios';
import itemDatabase from '../data/itemDatabase.json';
import type { GPTResponse } from '../types/game';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

interface ItemData {
  name: string;
  emoji: string;
  description?: string;
  category?: string;
  rarity?: string;
  complexity?: number;
  cashPerItem?: number;
}

export class AIService {
  private static instance: AIService;
  private discoveredCombos: Map<string, ItemData> = new Map();

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  constructor() {
    this.loadDiscoveredCombos();
  }

  async combineItems(ingredients: string[], modifier: string): Promise<GPTResponse & { isNewDiscovery: boolean }> {
    const cacheKey = this.createCacheKey(ingredients, modifier);
    
    // Check if we already have this combination
    if (this.discoveredCombos.has(cacheKey)) {
      const cached = this.discoveredCombos.get(cacheKey)!;
      console.log(`🎯 Using cached result for: ${cacheKey}`);
      return {
        name: cached.name,
        emoji: cached.emoji,
        cashPerItem: cached.cashPerItem || 0,
        type: 'Ingredient',
        rarity: cached.rarity,
        category: cached.category,
        complexity: cached.complexity,
        description: cached.description,
        isNewDiscovery: false
      };
    }

    // Generate new combination using AI with pricing reasoning
    console.log(`🤖 Calling GPT for new combination: ${cacheKey}`);
    const newItem = await this.generateNewCombination(ingredients, modifier);
    this.discoveredCombos.set(cacheKey, newItem);
    this.saveDiscoveredCombos();
    
    return {
      name: newItem.name,
      emoji: newItem.emoji,
      cashPerItem: newItem.cashPerItem || 0,
      type: 'Ingredient',
      rarity: newItem.rarity,
      category: newItem.category,
      complexity: newItem.complexity,
      description: newItem.description,
      isNewDiscovery: true
    };
  }

  private async generateNewCombination(ingredients: string[], modifier: string): Promise<ItemData> {
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
      return this.generateFallbackCombination(ingredients, modifier);
    }

    try {
      const prompt = this.createAIPrompt(ingredients, modifier);
      
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: this.getSystemPrompt() },
            { role: 'user', content: prompt }
          ],
          max_tokens: 300,
          temperature: 0.7,
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
      
      // Validate and enhance the response
      return this.validateAndEnhanceResponse(result);
    } catch (error) {
      console.error('GPT API error:', error);
      return this.generateFallbackCombination(ingredients, modifier);
    }
  }

  private createAIPrompt(ingredients: string[], modifier: string): string {
    const ingredientList = ingredients.join(', ');
    
    return `Combine these ingredients: ${ingredientList} using the modifier: ${modifier}

Think about:
- What would this combination create in the real world?
- How useful, rare, or valuable would this item be?
- Consider real-world applications, scarcity, and market demand
- Think about the complexity of the process and materials involved
- Consider both practical and theoretical value

Be creative but logical. The price should reflect real-world reasoning about the item's value.`;
  }

  private getSystemPrompt(): string {
    return `You are a creative game designer and economic analyst for "AI Factory Sandbox". Create new items based on ingredient combinations and determine their realistic market value.

Your job is to:
1. Create a logical item from the ingredient combination
2. Determine a realistic price based on real-world reasoning
3. Consider scarcity, usefulness, complexity, and market demand

Rules for pricing:
- Basic elements (water, air) are worth pennies
- Simple combinations (steam, ice) are worth a few dollars
- Useful industrial materials are worth tens to hundreds
- Advanced technology is worth thousands to millions
- Revolutionary breakthroughs can be worth billions
- Consider real-world analogs and market dynamics

Respond with JSON in this exact format:
{
  "name": "Item Name",
  "emoji": "🎯",
  "description": "Brief description of what it is and its uses",
  "rarity": "common|uncommon|rare|epic|legendary|mythic|transcendent|cosmic|divine",
  "category": "element|gas|liquid|solid|mineral|medical|machinery|precious|industrial|technology|quantum|energy|ai|megastructure|singularity|cosmic|reality",
  "complexity": 1-13,
  "cashPerItem": 0.01
}

The cashPerItem should be a realistic dollar amount based on your reasoning about the item's value.`;
  }

  private validateAndEnhanceResponse(result: any): ItemData {
    // Ensure all required fields exist with realistic defaults
    const enhanced: ItemData = {
      name: result.name || 'Mysterious Substance',
      emoji: result.emoji || '🧪',
      description: result.description || 'A mysterious combination',
      rarity: result.rarity || 'common',
      category: result.category || 'element',
      complexity: Math.max(1, Math.min(13, result.complexity || 1)),
      cashPerItem: Math.max(0.01, result.cashPerItem || 0.01)
    };

    return enhanced;
  }

  private generateFallbackCombination(ingredients: string[], modifier: string): ItemData {
    const complexity = Math.min(13, ingredients.length + 1);
    const fallbacks = [
      {
        name: 'Quantum Essence',
        emoji: '⚛️',
        description: `Mysterious quantum material created by applying ${modifier.toLowerCase()} to ${ingredients.join(' and ')}`,
        rarity: 'rare',
        category: 'quantum',
        complexity,
        cashPerItem: 250.00
      },
      {
        name: 'Industrial Compound',
        emoji: '🏭',
        description: `Advanced industrial material created by applying ${modifier.toLowerCase()} to ${ingredients.join(' and ')}`,
        rarity: 'uncommon',
        category: 'industrial',
        complexity,
        cashPerItem: 45.00
      },
      {
        name: 'Crystalline Matrix',
        emoji: '💎',
        description: `Perfect crystalline structure created by applying ${modifier.toLowerCase()} to ${ingredients.join(' and ')}`,
        rarity: 'epic',
        category: 'precious',
        complexity,
        cashPerItem: 1200.00
      },
      {
        name: 'Energy Core',
        emoji: '⚡',
        description: `Concentrated energy source created by applying ${modifier.toLowerCase()} to ${ingredients.join(' and ')}`,
        rarity: 'legendary',
        category: 'energy',
        complexity,
        cashPerItem: 8500.00
      },
      {
        name: 'Neural Network',
        emoji: '🧠',
        description: `Artificial intelligence substrate created by applying ${modifier.toLowerCase()} to ${ingredients.join(' and ')}`,
        rarity: 'mythic',
        category: 'ai',
        complexity,
        cashPerItem: 150000.00
      }
    ];

    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  private createCacheKey(ingredients: string[], modifier: string): string {
    const sortedIngredients = [...ingredients].sort();
    return `${sortedIngredients.join('+')}+${modifier}`;
  }

  private loadDiscoveredCombos(): void {
    try {
      const saved = localStorage.getItem('ai-factory-discovered-combos');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.discoveredCombos = new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.error('Failed to load discovered combos:', error);
    }
  }

  private saveDiscoveredCombos(): void {
    try {
      const obj = Object.fromEntries(this.discoveredCombos);
      localStorage.setItem('ai-factory-discovered-combos', JSON.stringify(obj));
    } catch (error) {
      console.error('Failed to save discovered combos:', error);
    }
  }

  getDiscoveredCombos(): Record<string, any> {
    return Object.fromEntries(this.discoveredCombos);
  }

  getBaseElements(): Record<string, ItemData> {
    return itemDatabase.baseElements as Record<string, ItemData>;
  }

  getModifiers(): Record<string, ItemData> {
    return itemDatabase.modifiers as Record<string, ItemData>;
  }
}

// Export singleton instance
export const aiService = AIService.getInstance(); 
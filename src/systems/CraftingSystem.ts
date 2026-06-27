// Pure crafting checks. Resolution against an inventory + which upgrades exist.

import type { InventoryItem, RecipeDef } from '../state/types';
import { RECIPES } from '../data/recipes';
import { hasItems } from './InventorySystem';

export function recipeUnlocked(
  recipe: RecipeDef,
  upgradeLevel: (id: string) => number
): boolean {
  if (!recipe.requiresUpgrade) return true;
  return upgradeLevel(recipe.requiresUpgrade) > 0;
}

export function canCraft(
  recipe: RecipeDef,
  inventory: InventoryItem[],
  upgradeLevel: (id: string) => number
): boolean {
  return recipeUnlocked(recipe, upgradeLevel) && hasItems(inventory, recipe.inputs);
}

export function availableRecipes(upgradeLevel: (id: string) => number): RecipeDef[] {
  return RECIPES.filter((r) => recipeUnlocked(r, upgradeLevel));
}

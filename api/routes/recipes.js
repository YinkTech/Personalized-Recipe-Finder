const express = require('express');
const { generateRecipes } = require('../services/recipeGenerator');

const router = express.Router();

router.post('/', async (req, res) => {
  const { ingredients, preferences = '', cuisine = '' } = req.body || {};

  if (
    !Array.isArray(ingredients) ||
    ingredients.length === 0 ||
    ingredients.length > 30 ||
    ingredients.some(
      (ingredient) =>
        typeof ingredient !== 'string' ||
        ingredient.trim().length === 0 ||
        ingredient.trim().length > 80
    )
  ) {
    return res.status(400).json({
      error: 'Enter between 1 and 30 ingredients, each no longer than 80 characters.'
    });
  }

  if (
    typeof preferences !== 'string' ||
    preferences.length > 500 ||
    typeof cuisine !== 'string' ||
    cuisine.length > 80
  ) {
    return res.status(400).json({ error: 'Dietary preferences or cuisine are invalid.' });
  }

  try {
    const recipes = await generateRecipes({
      ingredients: ingredients.map((ingredient) => ingredient.trim()),
      preferences: preferences.trim(),
      cuisine: cuisine.trim()
    });

    res.json({ recipes });
  } catch (error) {
    const status = error.status || 502;
    const message = error.publicMessage || 'Recipe suggestions are temporarily unavailable.';

    console.error('Recipe generation failed', {
      status,
      upstreamStatus: error.status || null,
      upstreamCode: /^[A-Z0-9_]+$/.test(error.code || '') ? error.code : undefined,
      modelsAttempted: error.modelsAttempted
    });
    res.status(status).json({ error: message });
  }
});

module.exports = router;

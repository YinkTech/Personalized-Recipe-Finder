const DEFAULT_MODEL = 'gemini-3.8-flash';
const FALLBACK_MODELS = ['gemini-3.5-flash', 'gemini-3-flash-preview'];
const GEMINI_INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const REQUEST_TIMEOUT_MS = 30_000;

const recipeResponseSchema = {
  type: 'object',
  properties: {
    recipes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          usedIngredients: { type: 'array', items: { type: 'string' } },
          missedIngredients: { type: 'array', items: { type: 'string' } },
          detailedIngredients: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                quantity: { type: 'string' },
                available: { type: 'boolean' }
              },
              required: ['name', 'quantity', 'available']
            }
          },
          cookingInstructions: { type: 'array', items: { type: 'string' } },
          prepTimeMinutes: { type: 'integer' },
          cookTimeMinutes: { type: 'integer' },
          substitutions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                ingredient: { type: 'string' },
                options: { type: 'array', items: { type: 'string' } }
              },
              required: ['ingredient', 'options']
            }
          },
          matchReason: { type: 'string' }
        },
        required: [
          'title',
          'usedIngredients',
          'missedIngredients',
          'detailedIngredients',
          'cookingInstructions',
          'prepTimeMinutes',
          'cookTimeMinutes',
          'substitutions',
          'matchReason'
        ]
      }
    }
  },
  required: ['recipes']
};

function isStringArray(value, maxItems = 40) {
  return (
    Array.isArray(value) &&
    value.length <= maxItems &&
    value.every((item) => typeof item === 'string' && item.trim().length > 0 && item.length <= 300)
  );
}

function normalizeRecipes(response) {
  if (
    !response ||
    typeof response !== 'object' ||
    !Array.isArray(response.recipes) ||
    response.recipes.length > 5
  ) {
    throw new Error('Gemini returned an invalid recipe response.');
  }

  const ids = new Set();
  return response.recipes.map((recipe, index) => {
    if (
      !recipe ||
      typeof recipe !== 'object' ||
      typeof recipe.title !== 'string' ||
      recipe.title.trim().length === 0 ||
      recipe.title.length > 120 ||
      !isStringArray(recipe.usedIngredients) ||
      !isStringArray(recipe.missedIngredients) ||
      !Array.isArray(recipe.detailedIngredients) ||
      recipe.detailedIngredients.length > 40 ||
      !recipe.detailedIngredients.every(
        (item) =>
          item &&
          typeof item.name === 'string' &&
          item.name.trim().length > 0 &&
          item.name.length <= 120 &&
          typeof item.quantity === 'string' &&
          item.quantity.trim().length > 0 &&
          item.quantity.length <= 80 &&
          typeof item.available === 'boolean'
      ) ||
      !isStringArray(recipe.cookingInstructions, 30) ||
      !Number.isInteger(recipe.prepTimeMinutes) ||
      recipe.prepTimeMinutes < 0 ||
      recipe.prepTimeMinutes > 1440 ||
      !Number.isInteger(recipe.cookTimeMinutes) ||
      recipe.cookTimeMinutes < 0 ||
      recipe.cookTimeMinutes > 1440 ||
      !Array.isArray(recipe.substitutions) ||
      recipe.substitutions.length > 30 ||
      !recipe.substitutions.every(
        (item) =>
          item &&
          typeof item.ingredient === 'string' &&
          item.ingredient.trim().length > 0 &&
          item.ingredient.length <= 120 &&
          isStringArray(item.options, 10)
      ) ||
      typeof recipe.matchReason !== 'string' ||
      recipe.matchReason.trim().length === 0 ||
      recipe.matchReason.length > 500
    ) {
      throw new Error('Gemini returned a recipe with invalid fields.');
    }

    const slug =
      recipe.title
        .normalize('NFKD')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 100) || `recipe-${index + 1}`;
    const id = ids.has(slug) ? `${slug}-${index + 1}` : slug;
    ids.add(id);

    return {
      id,
      title: recipe.title.trim(),
      usedIngredients: recipe.usedIngredients.map((item) => item.trim()),
      missedIngredients: recipe.missedIngredients.map((item) => item.trim()),
      detailedIngredients: recipe.detailedIngredients.map((item) => ({
        name: item.name.trim(),
        quantity: item.quantity.trim(),
        available: item.available
      })),
      cookingInstructions: recipe.cookingInstructions.map((item) => item.trim()),
      prepTimeMinutes: recipe.prepTimeMinutes,
      cookTimeMinutes: recipe.cookTimeMinutes,
      substitutions: recipe.substitutions.map((item) => ({
        ingredient: item.ingredient.trim(),
        options: item.options.map((option) => option.trim())
      })),
      matchReason: recipe.matchReason.trim()
    };
  });
}

function createPrompt({ ingredients, preferences, cuisine }) {
  return [
    'Suggest up to five practical recipes based on the user input. Return only the requested JSON.',
    'Use supplied ingredients where practical. Separate supplied ingredients used from ingredients that are missing.',
    'Provide quantities, clear ordered cooking instructions, preparation time, cooking time, and useful substitutions.',
    'Respect every stated dietary preference and food restriction. Include Nigerian dishes or other requested cuisines when appropriate.',
    'Do not claim recipes were verified against a database. Do not invent nutrition facts or make medical-benefit claims.',
    'Times and quantities are estimates; keep them realistic and label quantities as estimates in the recipe instructions where helpful.',
    `Available ingredients: ${JSON.stringify(ingredients)}`,
    `Dietary preferences or restrictions: ${preferences || 'None specified'}`,
    `Cuisine: ${cuisine || 'Any suitable cuisine'}`
  ].join('\n');
}

function extractOutputText(interaction) {
  if (typeof interaction?.output_text === 'string') {
    return interaction.output_text;
  }

  if (!Array.isArray(interaction?.steps)) {
    return '';
  }

  return interaction.steps
    .filter((step) => step?.type === 'model_output' && Array.isArray(step.content))
    .flatMap((step) => step.content)
    .filter((content) => content?.type === 'text' && typeof content.text === 'string')
    .map((content) => content.text)
    .join('');
}

function mapGeminiError(error) {
  const statusValue = Number(error && (error.status || error.statusCode || error.code));
  const status = Number.isFinite(statusValue) ? statusValue : null;
  const description = String(error && error.message || '').toLowerCase();
  const code = String(error && error.code || '').toLowerCase();
  const mapped = new Error('Gemini request failed.');

  if (
    status === 429 ||
    code.includes('resource_exhausted') ||
    description.includes('resource_exhausted') ||
    description.includes('quota') ||
    description.includes('rate limit')
  ) {
    mapped.status = 429;
    mapped.publicMessage = 'Recipe generation is busy or out of quota. Please try again later.';
  } else if (
    description.includes('timeout') ||
    description.includes('timed out') ||
    description.includes('abort') ||
    code.includes('deadline_exceeded')
  ) {
    mapped.status = 504;
    mapped.publicMessage = 'Recipe generation took too long. Please try again.';
  } else if (status === 401 || status === 403) {
    mapped.status = 503;
    mapped.publicMessage =
      'Recipe service configuration was rejected. Check the server-side Gemini key and model access.';
  } else if (status === 503 && /high demand|overloaded|temporarily unavailable/i.test(description)) {
    mapped.status = 503;
    mapped.publicMessage = 'Gemini is temporarily at capacity. Please try again shortly.';
  } else if (status === null || status >= 500) {
    mapped.status = 503;
    mapped.publicMessage = 'The recipe service is temporarily unavailable. Please try again.';
  } else {
    mapped.status = 502;
    mapped.publicMessage = 'The recipe service could not complete this request.';
  }

  return mapped;
}

function shouldTryFallbackModel(error) {
  const status = Number(error && error.status);
  const description = String(error && error.message || '').toLowerCase();

  return (
    (status === 503 && /high demand|overloaded|temporarily unavailable/i.test(description)) ||
    (status === 404 && /model.*(unavailable|not found)|not available/i.test(description))
  );
}

async function generateRecipes(input) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY is not configured.');
    error.status = 503;
    error.publicMessage = 'Recipe suggestions are not configured. Set GEMINI_API_KEY on the server.';
    throw error;
  }

  const preferredModel = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const models = [...new Set([preferredModel, ...FALLBACK_MODELS])];
  const attemptedModels = [];

  for (const [index, model] of models.entries()) {
    attemptedModels.push(model);
    try {
      const response = await fetch(GEMINI_INTERACTIONS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          model,
          input: createPrompt(input),
          response_format: {
            type: 'text',
            mime_type: 'application/json',
            schema: recipeResponseSchema
          },
          store: false
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });

      const interaction = await response.json();
      if (!response.ok) {
        const apiError = new Error(interaction.error?.message || 'Gemini request failed.');
        apiError.status = response.status;
        apiError.code = interaction.error?.status || interaction.error?.code;
        throw apiError;
      }

      const outputText = extractOutputText(interaction);
      if (!outputText) {
        throw new Error('Gemini returned an empty response.');
      }

      return normalizeRecipes(JSON.parse(outputText));
    } catch (error) {
      if (error.publicMessage) {
        throw error;
      }
      if (!shouldTryFallbackModel(error) || index === models.length - 1) {
        const mappedError = mapGeminiError(error);
        mappedError.modelsAttempted = attemptedModels;
        throw mappedError;
      }
    }
  }
}

module.exports = {
  generateRecipes,
  normalizeRecipes,
  mapGeminiError,
  extractOutputText,
  shouldTryFallbackModel
};

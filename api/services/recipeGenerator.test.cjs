const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeRecipes,
  mapGeminiError,
  extractOutputText,
  generateRecipes,
  shouldTryFallbackModel
} = require('./recipeGenerator');

const validRecipe = {
  title: 'Jollof Rice',
  usedIngredients: ['rice', 'tomatoes'],
  missedIngredients: ['onion'],
  detailedIngredients: [
    { name: 'rice', quantity: '2 cups', available: true },
    { name: 'onion', quantity: '1 medium', available: false }
  ],
  cookingInstructions: ['Wash the rice.', 'Cook until tender.'],
  prepTimeMinutes: 15,
  cookTimeMinutes: 35,
  substitutions: [{ ingredient: 'onion', options: ['shallot'] }],
  matchReason: 'It uses rice and tomatoes from the ingredients provided.'
};

test('normalizes valid Gemini recipe data and creates a safe recipe id', () => {
  const [recipe] = normalizeRecipes({ recipes: [validRecipe] });

  assert.equal(recipe.id, 'jollof-rice');
  assert.equal(recipe.title, 'Jollof Rice');
  assert.deepEqual(recipe.usedIngredients, ['rice', 'tomatoes']);
  assert.equal(recipe.detailedIngredients[1].available, false);
});

test('accepts an empty recipe list', () => {
  assert.deepEqual(normalizeRecipes({ recipes: [] }), []);
});

test('rejects malformed recipe fields', () => {
  assert.throws(
    () => normalizeRecipes({ recipes: [{ ...validRecipe, cookTimeMinutes: 'soon' }] }),
    /invalid fields/
  );
});

test('rejects more recipes than the API promises', () => {
  assert.throws(
    () => normalizeRecipes({ recipes: Array.from({ length: 6 }, () => validRecipe) }),
    /invalid recipe response/
  );
});

test('maps Gemini quota errors to a retryable rate-limit response', () => {
  const error = mapGeminiError({ status: 429, message: 'resource exhausted' });

  assert.equal(error.status, 429);
  assert.match(error.publicMessage, /out of quota/i);
});

test('maps timeouts and network failures to useful service errors', () => {
  const timeout = mapGeminiError({ message: 'request timed out' });
  const network = mapGeminiError({ message: 'fetch failed' });

  assert.equal(timeout.status, 504);
  assert.equal(network.status, 503);
});

test('maps Gemini capacity errors to a clear retry message', () => {
  const error = mapGeminiError({
    status: 503,
    message: 'The model is currently experiencing high demand.'
  });

  assert.equal(error.status, 503);
  assert.match(error.publicMessage, /temporarily at capacity/i);
});

test('tries configured fallback models only for capacity or unavailable-model errors', () => {
  assert.equal(
    shouldTryFallbackModel({ status: 503, message: 'Currently experiencing high demand.' }),
    true
  );
  assert.equal(
    shouldTryFallbackModel({ status: 404, message: 'This model is not available.' }),
    true
  );
  assert.equal(shouldTryFallbackModel({ status: 401, message: 'Invalid API key.' }), false);
  assert.equal(shouldTryFallbackModel({ status: 429, message: 'Quota exceeded.' }), false);
});

test('extracts text from a REST Interactions API model output step', () => {
  const output = extractOutputText({
    steps: [
      { type: 'thought', content: [{ type: 'text', text: 'not the answer' }] },
      { type: 'model_output', content: [{ type: 'text', text: '{"recipes":[]}' }] }
    ]
  });

  assert.equal(output, '{"recipes":[]}');
});

test('sends structured requests to Gemini without logging or returning the API key', async () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalModel = process.env.GEMINI_MODEL;
  const testKey = 'test-server-only-key';
  let request;

  process.env.GEMINI_API_KEY = testKey;
  delete process.env.GEMINI_MODEL;
  global.fetch = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({
      steps: [{
        type: 'model_output',
        content: [{ type: 'text', text: JSON.stringify({ recipes: [validRecipe] }) }]
      }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const recipes = await generateRecipes({
      ingredients: ['rice', 'tomatoes'],
      preferences: '',
      cuisine: 'Nigerian'
    });

    assert.equal(recipes[0].id, 'jollof-rice');
    assert.equal(request.url, 'https://generativelanguage.googleapis.com/v1beta/interactions');
    assert.equal(request.options.headers['x-goog-api-key'], testKey);
    assert.equal(JSON.parse(request.options.body).model, 'gemini-3.8-flash');
    assert.equal(request.options.body.includes(testKey), false);
  } finally {
    global.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
    if (originalModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = originalModel;
  }
});

test('retries recipe generation with a fallback model when Gemini is at capacity', async () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalModel = process.env.GEMINI_MODEL;
  const attemptedModels = [];

  process.env.GEMINI_API_KEY = 'test-server-only-key';
  process.env.GEMINI_MODEL = 'preferred-test-model';
  global.fetch = async (_url, options) => {
    const model = JSON.parse(options.body).model;
    attemptedModels.push(model);

    if (model === 'preferred-test-model') {
      return new Response(JSON.stringify({
        error: { message: 'This model is currently experiencing high demand.' }
      }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      steps: [{
        type: 'model_output',
        content: [{ type: 'text', text: JSON.stringify({ recipes: [validRecipe] }) }]
      }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const recipes = await generateRecipes({
      ingredients: ['rice', 'tomatoes'],
      preferences: '',
      cuisine: 'Nigerian'
    });

    assert.equal(recipes[0].id, 'jollof-rice');
    assert.deepEqual(attemptedModels, ['preferred-test-model', 'gemini-3.5-flash']);
  } finally {
    global.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
    if (originalModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = originalModel;
  }
});

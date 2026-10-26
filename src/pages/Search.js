import React, { useCallback, useEffect, useState } from 'react';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useError } from '../contexts/ErrorContext';
import { CUISINE_TYPES } from '../config/constants';
import { addUserFavorite, getUserFavorites, removeUserFavorite } from '../services/favorites';
import config from '../config/config';

const Search = () => {
  const { currentUser } = useAuth();
  const { showError } = useError();
  const [ingredients, setIngredients] = useState('');
  const [preferences, setPreferences] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('Nigerian');
  const [recipes, setRecipes] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');
  const [favoriteError, setFavoriteError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [savingRecipeId, setSavingRecipeId] = useState(null);
  const [expandedRecipe, setExpandedRecipe] = useState(null);

  const refreshFavorites = useCallback(async () => {
    if (!currentUser) {
      setFavorites([]);
      return;
    }

    try {
      setFavorites(await getUserFavorites(currentUser.uid));
    } catch (fetchError) {
      console.error('Error fetching Firestore favorites:', fetchError);
      showError('Failed to load your favorites. Please try again.');
    }
  }, [currentUser, showError]);

  useEffect(() => {
    refreshFavorites();
  }, [refreshFavorites]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setRecipes([]);
    setHasSearched(false);
    setError('');
    setSuccessMessage('');

    const ingredientList = ingredients
      .split(',')
      .map((ingredient) => ingredient.trim())
      .filter(Boolean);

    try {
      const response = await fetch(`${config.apiUrl}/suggest-recipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: ingredientList,
          preferences,
          cuisine: selectedCuisine
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to find recipes.');
      }

      if (!Array.isArray(data.recipes)) {
        throw new Error('The recipe service returned an invalid response.');
      }

      setRecipes(data.recipes);
      setHasSearched(true);
    } catch (searchError) {
      const message = searchError.message || 'Recipe suggestions are temporarily unavailable.';
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (recipe) => {
    if (!currentUser) {
      const message = 'Please log in to save favorite recipes.';
      setFavoriteError(message);
      showError(message);
      return;
    }

    setSavingRecipeId(recipe.id);
    setFavoriteError('');
    setSuccessMessage('');

    try {
      const favorite = favorites.find((item) => item.id === recipe.id);
      if (favorite) {
        await removeUserFavorite(currentUser.uid, favorite.favoriteId);
        setFavorites((existing) => existing.filter((item) => item.favoriteId !== favorite.favoriteId));
        setSuccessMessage(`"${recipe.title}" removed from favorites.`);
      } else {
        const savedFavorite = await addUserFavorite(currentUser.uid, recipe);
        setFavorites((existing) => [...existing, savedFavorite]);
        setSuccessMessage(`"${recipe.title}" added to favorites.`);
      }
    } catch (saveError) {
      console.error('Error updating Firestore favorite:', saveError);
      const message = saveError.message || 'Failed to update your favorites.';
      setFavoriteError(message);
      showError(message);
    } finally {
      setSavingRecipeId(null);
    }
  };

  const isFavorite = (recipeId) =>
    favorites.some((favorite) => favorite.id === String(recipeId));

  return (
    <div className="container mx-auto mt-16 px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Find Recipes</h1>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <div>
          <label htmlFor="ingredients" className="form-label">
            Available ingredients (comma-separated)
          </label>
          <input
            id="ingredients"
            type="text"
            className="input-field"
            value={ingredients}
            onChange={(event) => setIngredients(event.target.value)}
            placeholder="e.g., chicken, rice, tomatoes"
            required
          />
        </div>

        <div>
          <label htmlFor="preferences" className="form-label">
            Dietary preferences or restrictions
          </label>
          <input
            id="preferences"
            type="text"
            className="input-field"
            value={preferences}
            onChange={(event) => setPreferences(event.target.value)}
            placeholder="e.g., vegetarian, gluten-free, no peanuts"
          />
        </div>

        <div>
          <label htmlFor="cuisine" className="form-label">Cuisine</label>
          <select
            id="cuisine"
            className="input-field"
            value={selectedCuisine}
            onChange={(event) => setSelectedCuisine(event.target.value)}
          >
            <option value="">Any cuisine</option>
            {CUISINE_TYPES.map((cuisine) => (
              <option key={cuisine} value={cuisine}>{cuisine}</option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Finding recipes…' : 'Find Recipes'}
        </button>
      </form>

      {loading && (
        <p className="mt-6" role="status">Generating recipe suggestions…</p>
      )}

      {error && (
        <div className="mt-4 rounded bg-red-100 p-4 text-red-700" role="alert">
          {error}
        </div>
      )}
      {favoriteError && (
        <div className="mt-4 rounded bg-red-100 p-4 text-red-700" role="alert">
          {favoriteError}
        </div>
      )}
      {successMessage && (
        <div className="mt-4 rounded bg-green-100 p-4 text-green-700" role="status">
          {successMessage}
        </div>
      )}

      {hasSearched && !loading && recipes.length === 0 && (
        <p className="mt-8 rounded bg-gray-100 p-6" role="status">
          No recipe suggestions matched those ingredients and preferences. Try changing your search.
        </p>
      )}

      {recipes.length > 0 && (
        <section className="mt-8" aria-labelledby="suggestions-heading">
          <h2 id="suggestions-heading" className="mb-4 text-2xl font-bold">Recipe Suggestions</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => (
              <article key={recipe.id} className="overflow-hidden rounded-lg bg-white shadow-md">
                <div className="p-4">
                  <h3 className="mb-2 text-xl font-semibold">{recipe.title}</h3>
                  <p className="mb-4 text-sm text-gray-600">{recipe.matchReason}</p>
                  <p className="mb-4 text-sm text-gray-600">
                    Estimated time: {recipe.prepTimeMinutes} min prep · {recipe.cookTimeMinutes} min cook
                  </p>

                  <div className="mb-4">
                    <h4 className="font-medium text-gray-700">Uses from your ingredients</h4>
                    {recipe.usedIngredients.length ? (
                      <ul className="list-disc pl-5">
                        {recipe.usedIngredients.map((ingredient) => <li key={ingredient}>{ingredient}</li>)}
                      </ul>
                    ) : <p className="text-sm text-gray-600">None identified</p>}
                  </div>

                  <div className="mb-4">
                    <h4 className="font-medium text-gray-700">Missing ingredients</h4>
                    {recipe.missedIngredients.length ? (
                      <ul className="list-disc pl-5">
                        {recipe.missedIngredients.map((ingredient) => <li key={ingredient}>{ingredient}</li>)}
                      </ul>
                    ) : <p className="text-sm text-gray-600">No additional ingredients identified</p>}
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedRecipe((current) => current === recipe.id ? null : recipe.id)}
                    className="mb-4 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    aria-expanded={expandedRecipe === recipe.id}
                  >
                    {expandedRecipe === recipe.id ? 'Show Less' : 'Show Recipe Details'}
                  </button>

                  {expandedRecipe === recipe.id && (
                    <div className="mb-4 border-t pt-4">
                      <h4 className="font-medium text-gray-700">Ingredients (quantities are estimates)</h4>
                      <ul className="mb-4 list-disc pl-5">
                        {recipe.detailedIngredients.map((ingredient, index) => (
                          <li key={`${ingredient.name}-${index}`} className="text-gray-600">
                            {ingredient.quantity} {ingredient.name}
                            {ingredient.available ? ' (available)' : ' (missing)'}
                          </li>
                        ))}
                      </ul>

                      <h4 className="font-medium text-gray-700">Instructions</h4>
                      <ol className="mb-4 list-decimal pl-5">
                        {recipe.cookingInstructions.map((instruction, index) => (
                          <li key={`${index}-${instruction}`} className="mb-2 text-gray-600">
                            {instruction}
                          </li>
                        ))}
                      </ol>

                      {recipe.substitutions.length > 0 && (
                        <>
                          <h4 className="font-medium text-gray-700">Possible substitutions</h4>
                          <ul className="list-disc pl-5">
                            {recipe.substitutions.map((substitution) => (
                              <li key={substitution.ingredient} className="text-gray-600">
                                {substitution.ingredient}: {substitution.options.join(', ')}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleToggleFavorite(recipe)}
                    className="btn-secondary flex items-center"
                    disabled={savingRecipeId === recipe.id}
                  >
                    {savingRecipeId === recipe.id ? (
                      <span>Saving…</span>
                    ) : isFavorite(recipe.id) ? (
                      <><FaHeart className="mr-2 text-red-500" />Remove from Favorites</>
                    ) : (
                      <><FaRegHeart className="mr-2" />Add to Favorites</>
                    )}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Search;

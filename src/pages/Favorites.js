import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useError } from '../contexts/ErrorContext';
import { FaTrash, FaHeart, FaArrowLeft } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { getUserFavorites, removeUserFavorite } from '../services/favorites';

const Favorites = () => {
  const { currentUser } = useAuth();
  const { showError } = useError();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchFavorites = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError('');
      setFavorites(await getUserFavorites(currentUser.uid));
    } catch (err) {
      console.error('Error fetching favorites:', err);
      const errorMessage = 'Failed to fetch favorites. Please try again later.';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentUser, showError]);

  useEffect(() => {
    if (currentUser) {
      fetchFavorites();
    } else {
      setLoading(false);
    }
  }, [currentUser, fetchFavorites]);

  const handleDelete = async (recipe) => {
    if (!currentUser) return;
    
    setDeletingId(recipe.id);
    setError('');
    setSuccessMessage('');
    
    try {
      await removeUserFavorite(currentUser.uid, recipe.favoriteId);

      setFavorites((existing) => existing.filter((fav) => fav.favoriteId !== recipe.favoriteId));
      setSuccessMessage('Recipe removed from favorites');
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error removing from favorites:', err);
      const errorMessage = err.message || 'Failed to remove recipe from favorites';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setDeletingId(null);
    }
  };

  if (!currentUser) {
    return (
      <div className="container mx-auto px-4 py-8 mt-16">
        <h1 className="text-3xl font-bold mb-8">My Favorites</h1>
        <div className="bg-yellow-100 p-4 rounded-lg">
          <p className="text-yellow-800">
            Please <Link to="/login" className="text-blue-600 hover:underline">log in</Link> to view your favorites.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 mt-16">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">My Favorites</h1>
        <Link 
          to="/search" 
          className="flex items-center text-primary-600 hover:text-primary-700 transition-colors duration-200"
        >
          <FaArrowLeft className="mr-2" />
          Back to Search
        </Link>
      </div>
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg shadow-md">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg shadow-md">
          {successMessage}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : favorites.length === 0 ? (
        <div className="bg-gray-100 p-8 rounded-lg text-center shadow-md">
          <FaHeart className="mx-auto text-4xl text-gray-400 mb-4" />
          <p className="text-gray-700 mb-4 text-lg">You don't have any favorite recipes yet.</p>
          <Link 
            to="/search" 
            className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            Find Recipes
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((recipe) => (
            <div
              key={recipe.id}
              className="card bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden"
            >
              {recipe.image && (
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={recipe.image} 
                    alt={recipe.title} 
                    className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <div className="p-4">
                <h3 className="text-xl font-semibold mb-2 text-gray-800">{recipe.title}</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="flex items-center">
                    <span className="w-32">Used ingredients:</span>
                    <span className="font-medium">{recipe.usedIngredients?.join(', ') || '—'}</span>
                  </p>
                  <p className="flex items-center">
                    <span className="w-32">Missing ingredients:</span>
                    <span className="font-medium">{recipe.missedIngredients?.join(', ') || '—'}</span>
                  </p>
                  <p className="flex items-center">
                    <span className="w-32">Time:</span>
                    <span className="font-medium">
                      {recipe.prepTimeMinutes} min prep, {recipe.cookTimeMinutes} min cook (estimated)
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Added: {recipe.addedAt ? new Date(recipe.addedAt).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div className="mt-4 flex justify-end">
                  <button 
                    onClick={() => handleDelete(recipe)}
                    className="text-red-500 hover:text-red-700 focus:outline-none flex items-center transition-colors duration-200"
                    disabled={deletingId === recipe.id}
                    aria-label="Remove from favorites"
                  >
                    {deletingId === recipe.id ? (
                      <span className="animate-spin mr-2">⌛</span>
                    ) : (
                      <FaTrash className="mr-2" />
                    )}
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Favorites; 
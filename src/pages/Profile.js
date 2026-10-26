import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useError } from '../contexts/ErrorContext';
import { db } from '../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { DIETARY_PREFERENCES, CUISINE_TYPES, MEAL_TYPES } from '../config/constants';

const Profile = () => {
  const { currentUser } = useAuth();
  const { showError } = useError();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preferences, setPreferences] = useState({
    dietaryPreferences: [],
    cuisineTypes: ['African'],
    mealTypes: []
  });

  useEffect(() => {
    const fetchUserPreferences = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setPreferences({
            dietaryPreferences: userData.dietaryPreferences || [],
            cuisineTypes: userData.cuisineTypes || ['African'],
            mealTypes: userData.mealTypes || []
          });
        }
      } catch (err) {
        const errorMessage = 'Failed to load preferences';
        setError(errorMessage);
        showError(errorMessage);
        console.error('Error loading preferences:', err);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchUserPreferences();
    }
  }, [currentUser, showError]);

  const handlePreferenceChange = (type, value) => {
    setPreferences(prev => ({
      ...prev,
      [type]: prev[type].includes(value)
        ? prev[type].filter(item => item !== value)
        : [...prev[type], value]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        dietaryPreferences: preferences.dietaryPreferences,
        cuisineTypes: preferences.cuisineTypes,
        mealTypes: preferences.mealTypes,
        updatedAt: new Date().toISOString()
      });
      setSuccess('Preferences updated successfully!');
    } catch (err) {
      const errorMessage = 'Failed to update preferences';
      setError(errorMessage);
      showError(errorMessage);
      console.error('Error updating preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto mt-16">
      <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Dietary Preferences</h2>
          <div className="grid grid-cols-2 gap-4">
            {DIETARY_PREFERENCES.map(pref => (
              <label key={pref} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={preferences.dietaryPreferences.includes(pref)}
                  onChange={() => handlePreferenceChange('dietaryPreferences', pref)}
                  className="form-checkbox h-5 w-5 text-primary-600"
                />
                <span>{pref}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Cuisine Types</h2>
          <div className="grid grid-cols-2 gap-4">
            {CUISINE_TYPES.map(cuisine => (
              <label key={cuisine} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={preferences.cuisineTypes.includes(cuisine)}
                  onChange={() => handlePreferenceChange('cuisineTypes', cuisine)}
                  className="form-checkbox h-5 w-5 text-primary-600"
                />
                <span>{cuisine}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Meal Types</h2>
          <div className="grid grid-cols-2 gap-4">
            {MEAL_TYPES.map(meal => (
              <label key={meal} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={preferences.mealTypes.includes(meal)}
                  onChange={() => handlePreferenceChange('mealTypes', meal)}
                  className="form-checkbox h-5 w-5 text-primary-600"
                />
                <span>{meal}</span>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-100 text-green-700 rounded">
            {success}
          </div>
        )}

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Preferences'}
        </button>
      </form>
    </div>
  );
};

export default Profile; 
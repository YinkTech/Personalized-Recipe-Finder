import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

const favoritesCollection = (userId) => collection(db, 'users', userId, 'favorites');

export async function getUserFavorites(userId) {
  const favoritesQuery = query(favoritesCollection(userId), orderBy('addedAt', 'desc'));
  const snapshot = await getDocs(favoritesQuery);

  return snapshot.docs.map((favoriteDoc) => {
    const data = favoriteDoc.data();
    const addedAt = data.addedAt?.toDate
      ? data.addedAt.toDate().toISOString()
      : data.addedAt || null;

    return {
      ...data.recipe,
      id: String(data.recipe.id),
      favoriteId: favoriteDoc.id,
      addedAt
    };
  });
}

export async function addUserFavorite(userId, recipe) {
  const recipeId = String(recipe.id);
  const favoriteRef = doc(favoritesCollection(userId), recipeId);

  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(favoriteRef);
    if (existing.exists()) {
      throw new Error('This recipe is already in your favorites.');
    }

    transaction.set(favoriteRef, {
      recipe: { ...recipe, id: recipeId },
      addedAt: serverTimestamp()
    });
  });

  return {
    ...recipe,
    id: recipeId,
    favoriteId: favoriteRef.id,
    addedAt: new Date().toISOString()
  };
}

export function removeUserFavorite(userId, favoriteId) {
  return deleteDoc(doc(db, 'users', userId, 'favorites', favoriteId));
}

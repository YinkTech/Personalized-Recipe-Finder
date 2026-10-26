const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { applicationDefault, initializeApp } = require('firebase-admin/app');
const { FieldValue, Timestamp, getFirestore } = require('firebase-admin/firestore');

async function main() {
  const exportPath = process.argv[2];
  if (!exportPath) {
    throw new Error('Usage: node scripts/import-mongo-favorites.js <mongoexport-json-file>');
  }
  if (!process.env.FIREBASE_PROJECT_ID) {
    throw new Error('Set FIREBASE_PROJECT_ID to the destination Firebase project.');
  }

  const records = JSON.parse(readFileSync(exportPath, 'utf8'));
  if (!Array.isArray(records)) {
    throw new Error('The MongoDB export must be a JSON array.');
  }

  const prepared = records.map((record, index) => {
    if (
      !record ||
      typeof record.userId !== 'string' ||
      !record.userId ||
      !record.recipe ||
      record.recipe.id === undefined ||
      record.recipe.id === null
    ) {
      throw new Error(`MongoDB export record ${index + 1} is missing its userId or recipe.id.`);
    }

    const exportedDate =
      record.addedAt && typeof record.addedAt === 'object'
        ? record.addedAt.$date
        : record.addedAt;
    const dateValue =
      exportedDate && typeof exportedDate === 'object' && exportedDate.$numberLong
        ? Number(exportedDate.$numberLong)
        : exportedDate;
    const parsedDate = dateValue ? new Date(dateValue) : new Date();
    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error(`MongoDB export record ${index + 1} has an invalid addedAt date.`);
    }
    const recipeId = String(record.recipe.id);
    const favoriteId = createHash('sha256')
      .update(`${record.userId}\0${recipeId}`)
      .digest('hex');

    return {
      userId: record.userId,
      favoriteId,
      recipe: { ...record.recipe, id: recipeId },
      addedAt
    };
  });

  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
  const db = getFirestore();

  for (let offset = 0; offset < prepared.length; offset += 400) {
    const batch = db.batch();
    prepared.slice(offset, offset + 400).forEach((favorite) => {
      const favoriteRef = db.doc(
        `users/${favorite.userId}/favorites/${favorite.favoriteId}`
      );
      batch.set(
        favoriteRef,
        {
          recipe: favorite.recipe,
          addedAt: Timestamp.fromDate(favorite.addedAt),
          migratedFromMongo: true,
          migratedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    });
    await batch.commit();
  }

  console.log(`Imported ${prepared.length} favorites into Firebase project ${process.env.FIREBASE_PROJECT_ID}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

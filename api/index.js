const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const recipeRoutes = require('./routes/recipes');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '16kb' }));
app.use('/api/suggest-recipe', recipeRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API is running' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled API error', { name: err.name });
  res.status(500).json({ error: 'Something went wrong!' });
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
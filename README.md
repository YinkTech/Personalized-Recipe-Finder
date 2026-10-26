# RecipeAI - Personalized Recipe Finder

A modern web application that helps users discover personalized recipes based on their ingredients and preferences, powered by AI.

## Features

- **Ingredient-Based Search**: Find recipes using ingredients you have at home
- **AI-Powered Suggestions**: Get personalized recipe recommendations using OpenAI
- **Dietary Preferences**: Filter recipes based on dietary needs (vegan, gluten-free, etc.)
- **Favorite Recipes**: Save and manage your favorite recipes
- **User Profiles**: Customize your preferences and dietary restrictions
- **Responsive Design**: Beautiful UI that works on all devices

## Tech Stack

- **Frontend**: React.js with Tailwind CSS
- **Backend**: Firebase (Authentication & Firestore)
- **Recipe suggestions**: Google Gemini through a server-side Express API
- **Styling**: Tailwind CSS for modern, responsive design

## Getting Started

### Prerequisites

- Node.js (v20 or higher)
- npm or yarn
- Firebase account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/recipe-finder.git
   cd recipe-finder
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` in the project root and provide your Firebase web app values and Gemini API key:
   ```
   REACT_APP_FIREBASE_API_KEY=your_firebase_web_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   REACT_APP_FIREBASE_APP_ID=your_firebase_app_id
   REACT_APP_FIREBASE_MEASUREMENT_ID=optional_measurement_id
   GEMINI_API_KEY=your_google_ai_studio_api_key
   GEMINI_MODEL=gemini-3.8-flash
   ```
   Get Firebase values from **Firebase console → Project settings → General → Your apps** and get the Gemini key from [Google AI Studio](https://aistudio.google.com/). The Gemini key is read by the server; never rename it with a `REACT_APP_` prefix. Only `REACT_APP_FIREBASE_MEASUREMENT_ID` is optional. Do not commit `.env`.

4. Start the development server:
   ```bash
   npm run dev
   ```
   This starts the React app and the local API. The API listens on port `5001` by default.

### Firebase Setup

1. Create a new Firebase project
2. Enable Email/Password Authentication and create a Firestore database.
3. Register a Web app in the project and copy its configuration values into the root `.env` file using the variable names above.
4. Restart the development server after changing `.env`; Create React App reads environment variables when it starts.
5. Publish the rules in [`firestore.rules`](./firestore.rules) in the Firebase console. User profiles and favorites are restricted to their signed-in owner.

### Gemini API

Create an API key in Google AI Studio and set `GEMINI_API_KEY` in the server environment. `GEMINI_MODEL` is optional; it defaults to `gemini-3.8-flash`. If a model is temporarily overloaded or unavailable, the API tries `gemini-3.5-flash` and `gemini-3-flash-preview`. For Vercel, configure both variables in the project's server-side Environment Variables settings and redeploy. The model returns structured recipes; preparation times and quantities are estimates, and suggestions are not database-verified or nutritional/medical advice.

The server accepts `CORS_ORIGIN` as an optional comma-separated list when the frontend and API are hosted on different origins. Same-origin production deployments do not need it.

### Existing MongoDB favorites

Before retiring an existing MongoDB database, export its `favorites` collection and import it into the same Firebase project. The import is idempotent and does not delete or modify the MongoDB source:

```bash
mongoexport --uri="$MONGODB_URI" --collection=favorites --jsonArray --out=favorites-export.json
GOOGLE_APPLICATION_CREDENTIALS=/secure/path/firebase-service-account.json \
FIREBASE_PROJECT_ID=your_firebase_project_id \
node scripts/import-mongo-favorites.js favorites-export.json
```

Use a Firebase service account with Firestore write access and keep its JSON file outside the repository. Check that the expected documents exist under `users/{userId}/favorites` and that users can see their imported favorites before decommissioning the old database. The script uses deterministic document IDs, so it can be rerun safely. Delete the export and service-account file securely after verifying the migration.

## Project Structure

```
src/
├── components/     # Reusable UI components
├── config/        # Configuration files
├── contexts/      # React contexts
├── pages/         # Page components
└── utils/         # Utility functions
```

## Features in Detail

### Ingredient Search
- Enter ingredients you have
- Get recipe suggestions based on available ingredients
- Filter by dietary preferences and cuisine types

### AI Integration
- Get personalized recipe suggestions
- Ingredient substitutions, quantities, cooking times, and instructions
- Gemini API credentials stay on the server and are never included in the browser bundle

# User Profiles
- Save favorite recipes
- Set dietary preferences
- Track cooking history

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Spoonacular API for recipe data
- OpenAI for AI-powered suggestions
- Firebase for backend services
- Tailwind CSS for styling 
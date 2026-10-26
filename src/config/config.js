// Configuration for different environments
const config = {
  development: {
    apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:5001/api'
  },
  production: {
    apiUrl: process.env.REACT_APP_API_URL || '/api'
  }
};

// Get the current environment
const environment = process.env.NODE_ENV || 'development';

// Export the config for the current environment
export default config[environment]; 
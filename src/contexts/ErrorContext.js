import React, { createContext, useState, useContext } from 'react';

const ErrorContext = createContext();

export const useError = () => {
  return useContext(ErrorContext);
};

export const ErrorProvider = ({ children }) => {
  const [error, setError] = useState(null);

  const showError = (errorMessage) => {
    setError(errorMessage);
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    error,
    showError,
    clearError
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
};

export default ErrorContext; 
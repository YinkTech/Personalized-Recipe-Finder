import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorProvider, useError } from './contexts/ErrorContext';
import Navbar from './components/Navbar';
import LoadingSpinner from './components/LoadingSpinner';
import Error from './pages/Error';

// Lazy load components
const Home = React.lazy(() => import('./pages/Home'));
const Search = React.lazy(() => import('./pages/Search'));
const Favorites = React.lazy(() => import('./pages/Favorites'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Login = React.lazy(() => import('./pages/Login'));
const Signup = React.lazy(() => import('./pages/Signup'));

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
};

// Error Boundary component
const ErrorBoundary = ({ children }) => {
  const { error, clearError } = useError();
  
  if (error) {
    return <Error error={error} resetError={clearError} />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <ErrorProvider>
          <ErrorBoundary>
            <div className="min-h-screen bg-gray-50">
              <Navbar />
              <main className="container mx-auto px-4 py-8">
                <Suspense fallback={<LoadingSpinner />}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route
                      path="/search"
                      element={
                        <ProtectedRoute>
                          <Search />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/favorites"
                      element={
                        <ProtectedRoute>
                          <Favorites />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="*" element={<Error error="Page not found" />} />
                  </Routes>
                </Suspense>
              </main>
            </div>
          </ErrorBoundary>
        </ErrorProvider>
      </AuthProvider>
    </Router>
  );
}

export default App; 
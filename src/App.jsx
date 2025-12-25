import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MobileWrapper from './components/Layout/MobileWrapper';

// Auth
import { AuthProvider } from './features/auth/context/AuthContext';
import ProtectedRoute from './features/auth/components/ProtectedRoute';
import Login from './features/auth/pages/Login';
import Register from './features/auth/pages/Register';
import ForgotPassword from './features/auth/pages/ForgotPassword';
import ResetPassword from './features/auth/pages/ResetPassword';

// Pages
import Home from './pages/Home';
import Import from './pages/Import';
import Summary from './pages/Summary';
import Flashcards from './pages/Flashcards';
import Quiz from './pages/Quiz';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Collection from './pages/Collection';

import { UserProvider } from './context/UserContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <UserProvider>
                  <MobileWrapper>
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/import" element={<Import />} />
                      <Route path="/summary" element={<Summary />} />
                      <Route path="/flashcards" element={<Flashcards />} />
                      <Route path="/quiz" element={<Quiz />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/collection" element={<Collection />} />
                    </Routes>
                  </MobileWrapper>
                </UserProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

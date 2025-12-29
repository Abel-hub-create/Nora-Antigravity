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
import Study from './pages/Study';
import StudyDetail from './pages/StudyDetail';
import StudyFlashcards from './pages/StudyFlashcards';
import StudyQuiz from './pages/StudyQuiz';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Collection from './pages/Collection';
import Process from './pages/Process';
import FolderDetail from './pages/FolderDetail';

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
                      <Route path="/study" element={<Study />} />
                      <Route path="/study/:id" element={<StudyDetail />} />
                      <Route path="/study/:id/flashcards" element={<StudyFlashcards />} />
                      <Route path="/study/:id/quiz" element={<StudyQuiz />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/folders/:id" element={<FolderDetail />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/collection" element={<Collection />} />
                      <Route path="/process" element={<Process />} />
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

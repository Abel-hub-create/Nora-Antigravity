import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MobileWrapper from './components/Layout/MobileWrapper';

// Auth
import { AuthProvider } from './features/auth/context/AuthContext';
import ProtectedRoute from './features/auth/components/ProtectedRoute';
import AuthLayout from './features/auth/components/AuthLayout';
import Login from './features/auth/pages/Login';
import Register from './features/auth/pages/Register';
import ForgotPassword from './features/auth/pages/ForgotPassword';
import ResetPassword from './features/auth/pages/ResetPassword';
import VerifyEmailSent from './features/auth/pages/VerifyEmailSent';
import VerifyEmail from './features/auth/pages/VerifyEmail';

// Pages
import Home from './pages/Home';
import Import from './pages/Import';
import Study from './pages/Study';
import StudyDetail from './pages/StudyDetail';
import StudyFlashcards from './pages/StudyFlashcards';
import StudyQuiz from './pages/StudyQuiz';
import StudyRevision from './pages/StudyRevision';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Collection from './pages/Collection';
import Shop from './pages/Shop';
import Process from './pages/Process';
import FolderDetail from './pages/FolderDetail';
import Feedback from './pages/Feedback';
import Assistant from './pages/Assistant';
import Exercises from './pages/Exercises';
import ExerciseDetail from './pages/ExerciseDetail';

import { UserProvider } from './context/UserContext';
import { RevisionProvider } from './context/RevisionContext';
import { useTimeLight } from './hooks/useTimeLight';
import { AdminAuthProvider } from './features/admin/context/AdminAuthContext';
import AdminProtectedRoute from './features/admin/components/AdminProtectedRoute';
import AdminLogin from './features/admin/pages/AdminLogin';
import AdminDashboard from './features/admin/pages/AdminDashboard';
import AdminUsers from './features/admin/pages/AdminUsers';
import AdminUserDetail from './features/admin/pages/AdminUserDetail';
import AdminAnnouncements from './features/admin/pages/AdminAnnouncements';
import AdminPlans from './features/admin/pages/AdminPlans';
import AdminSchoolRequests from './features/admin/pages/AdminSchoolRequests';
import AdminPromoCodes from './features/admin/pages/AdminPromoCodes';
import AdminDebug from './features/admin/pages/AdminDebug';
import AdminXpConfig from './features/admin/pages/AdminXpConfig';
import AdminConversations from './features/admin/pages/AdminConversations';
import AdminSystemPrompts from './features/admin/pages/AdminSystemPrompts';
import Pricing from './pages/Pricing';

function AppWithLight({ children }) {
  useTimeLight();
  return children;
}

function App() {
  return (
    <AppWithLight>
    <AuthProvider>
      <Router>
        <Routes>
          {/* Admin Panel — completely isolated, no AuthProvider/UserProvider */}
          <Route path="/admin/*" element={
            <AdminAuthProvider>
              <Routes>
                <Route path="login" element={<AdminLogin />} />
                <Route path="dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
                <Route path="users" element={<AdminProtectedRoute><AdminUsers /></AdminProtectedRoute>} />
                <Route path="users/:id" element={<AdminProtectedRoute><AdminUserDetail /></AdminProtectedRoute>} />
                <Route path="plans" element={<AdminProtectedRoute><AdminPlans /></AdminProtectedRoute>} />
                <Route path="school-requests" element={<AdminProtectedRoute><AdminSchoolRequests /></AdminProtectedRoute>} />
                <Route path="promo-codes" element={<AdminProtectedRoute><AdminPromoCodes /></AdminProtectedRoute>} />
                <Route path="announcements" element={<AdminProtectedRoute><AdminAnnouncements /></AdminProtectedRoute>} />
                <Route path="conversations" element={<AdminProtectedRoute><AdminConversations /></AdminProtectedRoute>} />
                <Route path="system-prompts" element={<AdminProtectedRoute><AdminSystemPrompts /></AdminProtectedRoute>} />
                <Route path="debug" element={<AdminProtectedRoute><AdminDebug /></AdminProtectedRoute>} />
                <Route path="xp-config" element={<AdminProtectedRoute><AdminXpConfig /></AdminProtectedRoute>} />
                <Route path="" element={<Navigate to="dashboard" replace />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Routes>
            </AdminAuthProvider>
          } />

          {/* Public Auth Routes - Always light theme */}
          <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
          <Route path="/register" element={<AuthLayout><Register /></AuthLayout>} />
          <Route path="/forgot-password" element={<AuthLayout><ForgotPassword /></AuthLayout>} />
          <Route path="/reset-password/:token" element={<AuthLayout><ResetPassword /></AuthLayout>} />
          <Route path="/verify-email-sent" element={<AuthLayout><VerifyEmailSent /></AuthLayout>} />
          <Route path="/verify-email/:token" element={<AuthLayout><VerifyEmail /></AuthLayout>} />

          {/* Protected Routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <UserProvider>
                  <RevisionProvider>
                    <MobileWrapper>
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/import" element={<Import />} />
                      <Route path="/study" element={<Study />} />
                      <Route path="/study/:id" element={<StudyDetail />} />
                      <Route path="/study/:id/flashcards" element={<StudyFlashcards />} />
                      <Route path="/study/:id/quiz" element={<StudyQuiz />} />
                      <Route path="/study/:id/revision" element={<StudyRevision />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/folders/:id" element={<FolderDetail />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/pricing" element={<Pricing />} />
                      <Route path="/collection" element={<Collection />} />
                      <Route path="/shop" element={<Shop />} />
                      <Route path="/process" element={<Process />} />
                      <Route path="/feedback" element={<Feedback />} />
                      <Route path="/assistant" element={<Assistant />} />
                      <Route path="/exercises" element={<Exercises />} />
                      <Route path="/exercises/:id" element={<ExerciseDetail />} />
                    </Routes>
                    </MobileWrapper>
                  </RevisionProvider>
                </UserProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
    </AppWithLight>
  );
}

export default App;

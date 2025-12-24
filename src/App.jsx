import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MobileWrapper from './components/Layout/MobileWrapper';

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
    <UserProvider>
      <Router>
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
      </Router>
    </UserProvider>
  );
}

export default App;

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// Components
import Header from './components/Header';

// Pages
import Home from './pages/Home';
import Messages from './pages/Messages';

// Context
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="App">
            <Header />
            <main className="app-main">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/messages" element={<Messages />} />
                {/* Additional routes will be added here */}
              </Routes>
            </main>
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App; 
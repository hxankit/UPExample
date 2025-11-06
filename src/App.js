import React, { useState, useEffect } from 'react';
import PinScreen from './components/PinScreen';
import FileManager from './components/FileManager';
import ErrorBoundary from './ErrorBoundary';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPin, setCurrentPin] = useState(null);

  useEffect(() => {
    // Check if user has a PIN stored in sessionStorage
    const storedPin = sessionStorage.getItem('userPin');
    if (storedPin) {
      setCurrentPin(storedPin);
      setIsAuthenticated(true);
    }
  }, []);

  const handlePinSubmit = (pin) => {
    setCurrentPin(pin);
    setIsAuthenticated(true);
    sessionStorage.setItem('userPin', pin);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentPin(null);
    sessionStorage.removeItem('userPin');
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {!isAuthenticated ? (
          <PinScreen onPinSubmit={handlePinSubmit} />
        ) : (
          <FileManager pin={currentPin} onLogout={handleLogout} />
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;


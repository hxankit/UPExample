import React, { useState } from 'react';

function PinScreen({ onPinSubmit }) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isNewUser) {
      // Creating new PIN
      if (pin.length < 4) {
        setError('PIN must be at least 4 digits');
        return;
      }
      if (pin !== confirmPin) {
        setError('PINs do not match');
        return;
      }

      try {
        const response = await fetch('/api/pin/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pin }),
        });

        const data = await response.json();
        if (data.ok) {
          onPinSubmit(pin);
        } else {
          setError(data.error || 'Failed to create PIN');
        }
      } catch (err) {
        setError('Network error. Please try again.');
      }
    } else {
      // Verifying existing PIN
      if (pin.length < 4) {
        setError('Please enter a valid PIN');
        return;
      }

      try {
        const response = await fetch('/api/pin/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pin }),
        });

        const data = await response.json();
        if (data.ok) {
          onPinSubmit(pin);
        } else {
          setError(data.error || 'Invalid PIN');
        }
      } catch (err) {
        setError('Network error. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">File Manager</h1>
          <p className="text-gray-600">
            {isNewUser ? 'Create your PIN' : 'Enter your PIN to access your files'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
              PIN
            </label>
            <input
              id="pin"
              type="password"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, '').slice(0, 10));
                setError('');
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="Enter PIN"
              maxLength={10}
              required
            />
          </div>

          {isNewUser && (
            <div>
              <label htmlFor="confirmPin" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm PIN
              </label>
              <input
                id="confirmPin"
                type="password"
                value={confirmPin}
                onChange={(e) => {
                  setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 10));
                  setError('');
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="Confirm PIN"
                maxLength={10}
                required
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
          >
            {isNewUser ? 'Create PIN' : 'Access Files'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsNewUser(!isNewUser);
              setPin('');
              setConfirmPin('');
              setError('');
            }}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {isNewUser ? 'Already have a PIN? Sign in' : "Don't have a PIN? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PinScreen;


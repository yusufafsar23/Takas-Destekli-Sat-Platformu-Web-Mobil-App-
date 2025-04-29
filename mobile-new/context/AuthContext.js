import React, { createContext, useState, useContext } from 'react';

// Create AuthContext
export const AuthContext = createContext();

// Custom hook to use AuthContext
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Login function (mock)
  const login = async (email, password) => {
    setIsLoading(true);
    
    // Simple timeout to simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockUser = {
      id: '1',
      name: 'Ayşe Yılmaz',
      email: email,
      location: 'İstanbul, Türkiye',
      joinDate: 'Nisan 2023',
    };
    
    setUser(mockUser);
    setIsLoggedIn(true);
    setIsLoading(false);
    return { success: true };
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true);
    
    // Simple timeout to simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setUser(null);
    setIsLoggedIn(false);
    setIsLoading(false);
    return { success: true };
  };

  // Authentication context value
  const authContextValue = {
    user,
    isLoading,
    isLoggedIn,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}; 
import React from 'react';
import { StatusBar, SafeAreaView } from 'react-native';
import RootLayout from './app/_layout';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <SafeAreaView style={{ flex: 1 }}>
          <StatusBar barStyle="dark-content" />
          <RootLayout />
        </SafeAreaView>
      </SocketProvider>
    </AuthProvider>
  );
} 
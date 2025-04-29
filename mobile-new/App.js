import React from 'react';
import { StatusBar, SafeAreaView } from 'react-native';
import RootLayout from './app/_layout';

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      <RootLayout />
    </SafeAreaView>
  );
} 
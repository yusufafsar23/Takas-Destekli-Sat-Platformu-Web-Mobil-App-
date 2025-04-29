import React from 'react';
import { View, StyleSheet } from 'react-native';
import TabLayout from './(tabs)/_layout';

export default function RootLayout() {
  return (
    <View style={styles.container}>
      <TabLayout />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 
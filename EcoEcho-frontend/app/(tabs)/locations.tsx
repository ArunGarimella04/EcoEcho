import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function LocationsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recycling Locations</Text>
      <Text style={styles.subtitle}>Find nearby recycling centers and drop-off points</Text>
      {/* Location content will be implemented here */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#122118',
  },
  title: {
    fontSize: 24,
    color: '#38e07b',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#96c5a9',
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ChallengesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Challenges</Text>
      <Text style={styles.subtitle}>Join challenges and compete with the community</Text>
      {/* Challenges content will be implemented here */}
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

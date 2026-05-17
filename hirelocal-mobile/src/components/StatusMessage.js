import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const config = {
  info:    { bg: '#e3f2fd', color: '#1565c0', border: '#1565c0' },
  success: { bg: '#e6f4ea', color: '#2e7d32', border: '#2e7d32' },
  error:   { bg: '#ffebee', color: '#c33',    border: '#c33' },
};

export default function StatusMessage({ type = 'info', message }) {
  if (!message) return null;
  const { bg, color, border } = config[type] || config.info;
  return (
    <View style={[styles.box, { backgroundColor: bg, borderLeftColor: border }]}>
      <Text style={[styles.text, { color }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
});

import React from 'react';
import { Text } from 'react-native';
import { colors } from '../constants/theme';

export default function StarRating({ rating, size = 14 }) {
  const clamped = Math.round(Math.max(0, Math.min(5, Number(rating) || 0)));
  return (
    <Text style={{ fontSize: size, color: colors.accent }}>
      {'★'.repeat(clamped)}{'☆'.repeat(5 - clamped)}
    </Text>
  );
}

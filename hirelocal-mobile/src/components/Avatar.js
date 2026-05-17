import React from 'react';
import { View, Text, Image } from 'react-native';
import { colors } from '../constants/theme';

export default function Avatar({ provider, size = 48, square = false }) {
  const initials = ((provider?.name || 'HL').slice(0, 2)).toUpperCase();
  const borderRadius = square ? Math.round(size * 0.17) : size / 2;

  const style = { width: size, height: size, borderRadius };

  if (provider?.photo && provider.photo.trim() !== '') {
    return <Image source={{ uri: provider.photo }} style={style} resizeMode="cover" />;
  }

  return (
    <View style={[style, { backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.35 }}>{initials}</Text>
    </View>
  );
}

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { radius, shadow } from '../constants/theme';

const PHOTO_HEIGHT = 300;
const CARD_RADIUS = 24;

function Bone({ style }) {
  return <View style={[styles.bone, style]} />;
}

export default function ProviderCardSkeleton() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      {/* Banner photo placeholder */}
      <Bone style={styles.photo} />

      {/* Content */}
      <View style={styles.content}>
        <Bone style={styles.name} />

        <View style={styles.ratingRow}>
          <Bone style={styles.stars} />
          <Bone style={styles.count} />
        </View>

        <Bone style={styles.location} />

        <Bone style={styles.bioLine1} />
        <Bone style={styles.bioLine2} />

        <View style={styles.tagsRow}>
          <Bone style={styles.tag} />
          <Bone style={styles.tag} />
        </View>

        <Bone style={styles.button} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: CARD_RADIUS,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(16,35,29,0.08)',
    ...shadow,
  },
  bone: {
    backgroundColor: 'rgba(16,35,29,0.1)',
    borderRadius: 6,
  },

  photo: {
    width: '100%',
    height: PHOTO_HEIGHT,
    borderRadius: 0,
  },

  content: { padding: 18 },

  name: { width: 160, height: 20, borderRadius: 4, marginBottom: 10 },

  ratingRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  stars: { width: 80, height: 13, borderRadius: 4 },
  count: { width: 28, height: 13, borderRadius: 4 },

  location: { width: 130, height: 13, borderRadius: 4, marginBottom: 12 },

  bioLine1: { width: '95%', height: 13, borderRadius: 4, marginBottom: 6 },
  bioLine2: { width: '75%', height: 13, borderRadius: 4, marginBottom: 18 },

  tagsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tag: { width: 72, height: 26, borderRadius: radius.full },

  button: { height: 40, borderRadius: radius.full },
});

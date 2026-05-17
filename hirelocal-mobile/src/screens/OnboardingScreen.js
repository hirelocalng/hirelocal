import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Dimensions, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '../constants/theme';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: 'search-circle-outline',
    iconColor: '#0f766e',
    bg: '#f4fcfa',
    title: 'Find Skilled Workers Near You',
    body: 'Search for verified plumbers, electricians, tailors, cleaners, and more — filtered by category, state, and LGA.',
  },
  {
    icon: 'shield-checkmark-outline',
    iconColor: '#17352f',
    bg: '#faf8f3',
    title: 'Every Provider is Verified',
    body: 'All providers upload a government-issued ID. You see real people with real skills, not anonymous listings.',
  },
  {
    icon: 'call-outline',
    iconColor: '#0a5f58',
    bg: '#f0faf8',
    title: 'Contact Directly, No Middleman',
    body: 'Get the provider\'s phone and WhatsApp instantly. No apps to manage, no booking fees — just direct contact.',
  },
];

export default function OnboardingScreen({ onDone }) {
  const flatRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [index, setIndex] = useState(0);

  function next() {
    if (index < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      onDone();
    }
  }

  function onViewableItemsChanged({ viewableItems }) {
    if (viewableItems.length > 0) {
      setIndex(viewableItems[0].index);
    }
  }

  const viewabilityConfig = { viewAreaCoveragePercentThreshold: 50 };
  const viewabilityConfigCallbackPairs = useRef([{ viewabilityConfig, onViewableItemsChanged }]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Skip button */}
      <TouchableOpacity style={styles.skipBtn} onPress={onDone}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <Animated.FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
        renderItem={({ item }) => (
          <View style={[styles.slide, { backgroundColor: item.bg }]}>
            <View style={[styles.iconCircle, { backgroundColor: `${item.iconColor}18` }]}>
              <Ionicons name={item.icon} size={72} color={item.iconColor} />
            </View>
            <Text style={styles.slideTitle}>{item.title}</Text>
            <Text style={styles.slideBody}>{item.body}</Text>
          </View>
        )}
      />

      {/* Dots + button */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.35, 1, 0.35],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: dotWidth, opacity }]}
              />
            );
          })}
        </View>

        <TouchableOpacity style={styles.nextBtn} onPress={next}>
          <Text style={styles.nextBtnText}>
            {index === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons
            name={index === SLIDES.length - 1 ? 'checkmark' : 'arrow-forward'}
            size={18}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4fcfa' },

  skipBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  skipText: { fontSize: 14, fontWeight: '600', color: colors.muted },

  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingBottom: 40,
  },
  iconCircle: {
    width: 148,
    height: 148,
    borderRadius: 74,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  slideTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    fontFamily: fonts.heading,
    textAlign: 'center',
    lineHeight: 33,
    marginBottom: 16,
  },
  slideBody: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 25,
  },

  footer: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(16,35,29,0.06)',
    gap: 20,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand,
  },
  nextBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.full,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    fontFamily: fonts.heading,
  },
});

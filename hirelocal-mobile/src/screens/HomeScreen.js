import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, RefreshControl, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ProviderCard from '../components/ProviderCard';
import ProviderCardSkeleton from '../components/ProviderCardSkeleton';
import { colors, radius, shadow, fonts } from '../constants/theme';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { getNearbySearchParams } from '../utils/location';

const CATEGORIES = [
  'Plumbing', 'Electrical Repairs', 'Cleaning', 'Fashion Design',
  'Painting', 'Carpentry', 'Generator Repair', 'Hair Styling',
  'AC Technician', 'POP Installation',
];

const WHY_ITEMS = [
  {
    num: '01',
    title: 'Direct Contact, No Middleman',
    body: 'Skip the back-and-forth. Message plumbers, electricians, tailors directly on WhatsApp or call them. No waiting for responses through an app.',
  },
  {
    num: '02',
    title: 'Verified & Reviewed Professionals',
    body: "Every provider is verified with government ID and real customer reviews. No guessing if they're trustworthy.",
  },
  {
    num: '03',
    title: 'Fast, Local, Affordable',
    body: 'Find workers in your exact area within minutes. No unnecessary costs. Service happens locally.',
  },
];

const HERO_METRICS = [
  { icon: 'search-outline', title: 'Fast Search', body: 'Browse by category, state, LGA, and keyword to find exactly who you need.' },
  { icon: 'shield-checkmark-outline', title: 'Verified Profiles', body: 'Every provider is verified with a government ID before they appear in search.' },
  { icon: 'call-outline', title: 'Direct Contact', body: "Get the provider's phone and WhatsApp number instantly — no middleman." },
];

export default function HomeScreen({ navigation }) {
  const { provider: authProvider } = useAuth();
  const [category, setCategory] = useState('');
  const [state, setState] = useState('');
  const [query, setQuery] = useState('');
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locating, setLocating] = useState(false);

  // Animated blob values for the hero gradient
  const blob1 = useRef(new Animated.Value(0)).current;
  const blob2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blob1, { toValue: 1, duration: 6000, useNativeDriver: true }),
        Animated.timing(blob1, { toValue: 0, duration: 6000, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(blob2, { toValue: 1, duration: 8500, useNativeDriver: true }),
        Animated.timing(blob2, { toValue: 0, duration: 8500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const blob1Style = {
    opacity: blob1.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.24] }),
    transform: [{ scale: blob1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }) }],
  };
  const blob2Style = {
    opacity: blob2.interpolate({ inputRange: [0, 1], outputRange: [0.07, 0.16] }),
    transform: [{ scale: blob2.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }],
  };

  function goToProviderAccount() {
    if (authProvider) {
      navigation.navigate('AccountTab');
    } else {
      navigation.navigate('AccountTab', { screen: 'Register' });
    }
  }

  useEffect(() => {
    loadFeatured();
  }, []);

  async function loadFeatured(isPull = false) {
    isPull ? setRefreshing(true) : setLoading(true);
    try {
      const { data } = await api.search();
      setProviders((data.providers || []).slice(0, 10));
    } catch {}
    isPull ? setRefreshing(false) : setLoading(false);
  }

  function handleSearch() {
    navigation.navigate('SearchTab', {
      screen: 'Search',
      params: { category, state, query },
    });
  }

  async function handleNearMe() {
    setLocating(true);
    const params = await getNearbySearchParams();
    setLocating(false);
    if (params) {
      navigation.navigate('SearchTab', { screen: 'Search', params });
    }
  }

  function handleCategoryChip(cat) {
    navigation.navigate('SearchTab', { screen: 'Search', params: { category: cat } });
  }

  function goToProfile(id) {
    navigation.navigate('Profile', { id });
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.logo}>HireLocal</Text>
        <View style={styles.headerLinks}>
          {authProvider ? (
            <TouchableOpacity onPress={() => navigation.navigate('AccountTab')}>
              <Text style={styles.headerLink}>Dashboard</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity onPress={() => navigation.navigate('AccountTab')}>
                <Text style={styles.headerLink}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('AccountTab', { screen: 'Register' })}>
                <Text style={styles.headerLink}>Register</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadFeatured(true)}
            tintColor="#7ee8e2"
            colors={[colors.brand]}
          />
        }
      >

        {/* ── Hero: dark gradient with animated blobs ── */}
        <LinearGradient
          colors={['#17352f', '#1a4038', '#0d2622']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          {/* Decorative blobs */}
          <Animated.View style={[styles.blob, styles.blob1, blob1Style]} />
          <Animated.View style={[styles.blob, styles.blob2, blob2Style]} />

          {/* ── Hero copy ── */}
          <View style={styles.heroCard}>
            <View style={styles.eyebrowBadge}>
              <Text style={styles.eyebrow}>Local jobs · trusted people · faster connections</Text>
            </View>
            <Text style={styles.h1}>
              Find reliable artisans and service professionals in your area.
            </Text>
            <Text style={styles.heroCopy}>
              HireLocal helps clients discover verified plumbers, electricians, cleaners, tailors,
              painters, repair technicians, and other skilled workers without the usual guesswork.
            </Text>

            {/* Action buttons */}
            <View style={styles.actionCol}>
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={() => navigation.navigate('SearchTab', { screen: 'Search' })}
              >
                <Text style={styles.btnPrimaryText}>Start Searching</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnGlass} onPress={goToProviderAccount}>
                <Text style={styles.btnGlassText}>List Your Skill</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Featured providers ── */}
          <View style={styles.featuredList}>
            {loading ? (
              [0, 1, 2, 3].map((i) => <ProviderCardSkeleton key={i} />)
            ) : providers.length === 0 ? (
              <Text style={styles.emptyText}>No providers found yet.</Text>
            ) : (
              providers.map((p) => (
                <ProviderCard key={p.id} provider={p} onPress={() => goToProfile(p.id)} />
              ))
            )}
          </View>

          {/* ── Feature metric cards (glassmorphism) ── */}
          <View style={styles.metricsCol}>
            {HERO_METRICS.map((m) => (
              <View key={m.title} style={styles.metricCard}>
                <View style={styles.metricIconWrap}>
                  <Ionicons name={m.icon} size={20} color="#7ee8e2" />
                </View>
                <View style={styles.metricText}>
                  <Text style={styles.metricTitle}>{m.title}</Text>
                  <Text style={styles.metricBody}>{m.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ── Spotlight panel (dark teal card, quick search) ── */}
        <View style={styles.spotlightSection}>
          <View style={styles.spotlight}>
            <View style={styles.spotlightHead}>
              <View style={styles.softBadge}>
                <Text style={styles.softBadgeText}>Quick Client Search</Text>
              </View>
              <Text style={styles.spotlightCopy}>
                Find skilled local workers in seconds. Enter what you need and where.
              </Text>
            </View>

            <View style={styles.spotlightForm}>
              <Text style={styles.inputLabel}>Category</Text>
              <TextInput
                style={styles.spotlightInput}
                placeholder="e.g. Plumber, Tailor, Electrician"
                placeholderTextColor="rgba(16,35,29,0.38)"
                value={category}
                onChangeText={setCategory}
                returnKeyType="next"
              />
              <Text style={styles.inputLabel}>State</Text>
              <TextInput
                style={styles.spotlightInput}
                placeholder="e.g. Lagos"
                placeholderTextColor="rgba(16,35,29,0.38)"
                value={state}
                onChangeText={setState}
                returnKeyType="next"
              />
              <Text style={styles.inputLabel}>What do you need?</Text>
              <TextInput
                style={styles.spotlightInput}
                placeholder="e.g. Generator repair, AC service"
                placeholderTextColor="rgba(16,35,29,0.38)"
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              <TouchableOpacity style={styles.spotlightBtn} onPress={handleSearch}>
                <Text style={styles.spotlightBtnText}>Search Professionals</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.nearMeBtn}
                onPress={handleNearMe}
                disabled={locating}
              >
                <Ionicons name="location-outline" size={16} color={colors.brand} />
                <Text style={styles.nearMeBtnText}>
                  {locating ? 'Getting location…' : 'Find providers near me'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.miniGrid}>
              <View style={styles.miniCard}>
                <Text style={styles.miniLabel}>Top Categories</Text>
                <Text style={styles.miniBody}>Home repairs, beauty, fashion, cleaning, and maintenance.</Text>
              </View>
              <View style={styles.miniCard}>
                <Text style={styles.miniLabel}>Best Use</Text>
                <Text style={styles.miniBody}>Perfect for nearby jobs where trust and speed matter most.</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Why Choose HireLocal ── */}
        <View style={styles.whySection}>
          <Text style={styles.h2}>Why Choose HireLocal</Text>
          {WHY_ITEMS.map((item) => (
            <View key={item.num} style={styles.whyCard}>
              <Text style={styles.whyNum}>{item.num}</Text>
              <Text style={styles.whyTitle}>{item.title}</Text>
              <Text style={styles.whyBody}>{item.body}</Text>
            </View>
          ))}

          <View style={styles.joinCard}>
            <Text style={styles.joinTitle}>Join 1,200+ Satisfied Clients</Text>
            <View style={styles.actionColLight}>
              <TouchableOpacity
                style={styles.btnPrimaryDark}
                onPress={() => navigation.navigate('SearchTab', { screen: 'Search' })}
              >
                <Text style={styles.btnPrimaryText}>Start Searching</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimaryDark} onPress={goToProviderAccount}>
                <Text style={styles.btnPrimaryText}>List Your Skill</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Popular services ── */}
        <View style={styles.sectionContrast}>
          <Text style={[styles.eyebrowDark, styles.centered]}>Popular services</Text>
          <Text style={[styles.h2, styles.centered]}>
            Built around the work people actually search for every day
          </Text>
          <View style={styles.tagCloud}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={styles.chip}
                onPress={() => handleCategoryChip(cat)}
              >
                <Text style={styles.chipText}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── CTA panel ── */}
        <View style={styles.ctaSection}>
          <View style={styles.ctaPanel}>
            <Text style={styles.ctaEyebrow}>For skilled workers</Text>
            <Text style={styles.ctaTitle}>
              Turn your local reputation into a professional online profile.
            </Text>
            <Text style={styles.ctaBody}>
              Create an account, get verified, collect reviews, and let clients discover
              your work by location.
            </Text>
            <View style={styles.ctaActions}>
              <TouchableOpacity style={styles.btnPrimary} onPress={goToProviderAccount}>
                <Text style={styles.btnPrimaryText}>Create Provider Account</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => navigation.navigate('AccountTab')}
              >
                <Text style={styles.btnSecondaryText}>View Dashboard</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerCopy}>© 2026 HireLocal Nigeria. All rights reserved.</Text>
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => navigation.navigate('Privacy')}>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Terms')}>
              <Text style={styles.footerLink}>Terms of Service</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceDark },
  centered: { textAlign: 'center' },

  /* Header */
  header: {
    backgroundColor: colors.surfaceDark,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.2)',
  },
  logo: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    fontFamily: fonts.heading,
    letterSpacing: -0.5,
  },
  headerLinks: { flexDirection: 'row', gap: 16 },
  headerLink: { color: 'rgba(255,255,255,0.82)', fontWeight: '600', fontSize: 12 },

  scroll: { flex: 1, backgroundColor: colors.bg },

  /* ── Hero gradient ── */
  hero: {
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 32,
    overflow: 'hidden',
    position: 'relative',
  },

  /* Background blobs */
  blob: {
    position: 'absolute',
    borderRadius: 9999,
  },
  blob1: {
    width: 340,
    height: 340,
    backgroundColor: '#0f766e',
    top: -100,
    right: -100,
  },
  blob2: {
    width: 240,
    height: 240,
    backgroundColor: '#2ec4b6',
    bottom: 60,
    left: -80,
  },

  /* Glassmorphism hero card */
  heroCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 28,
    padding: 24,
    marginBottom: 24,
  },
  eyebrowBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(126,232,226,0.15)',
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(126,232,226,0.25)',
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7ee8e2',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  h1: {
    fontSize: 30,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: fonts.heading,
    lineHeight: 38,
    marginBottom: 12,
  },
  heroCopy: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 24,
    marginBottom: 22,
  },

  /* Buttons */
  actionCol: { flexDirection: 'column', gap: 10, marginBottom: 4 },
  actionColLight: { flexDirection: 'column', gap: 10, marginBottom: 0 },
  btnPrimary: {
    backgroundColor: colors.brand,
    borderRadius: radius.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnPrimaryDark: {
    backgroundColor: colors.brand,
    borderRadius: radius.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15, fontFamily: fonts.heading },
  btnGlass: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  btnGlassText: { color: '#ffffff', fontWeight: '700', fontSize: 15, fontFamily: fonts.heading },
  btnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16,35,29,0.18)',
  },
  btnSecondaryText: { color: colors.text, fontWeight: '700', fontSize: 15, fontFamily: fonts.heading },

  /* Featured providers */
  featuredList: { marginBottom: 24 },
  emptyText: { textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginTop: 12, fontSize: 14 },

  /* Glassmorphism metric cards */
  metricsCol: { gap: 12 },
  metricCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  metricIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(126,232,226,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderWidth: 1,
    borderColor: 'rgba(126,232,226,0.2)',
  },
  metricText: { flex: 1 },
  metricTitle: { fontSize: 15, fontWeight: '700', color: '#ffffff', marginBottom: 4, fontFamily: fonts.heading },
  metricBody: { fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 20 },

  /* Spotlight section */
  spotlightSection: {
    backgroundColor: colors.surfaceDark,
    paddingHorizontal: 16,
    paddingVertical: 28,
  },
  spotlight: {
    backgroundColor: '#0a4240',
    borderRadius: 32,
    padding: 24,
  },
  spotlightHead: { marginBottom: 20 },
  softBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 12,
  },
  softBadgeText: { color: 'rgba(244,252,250,0.92)', fontWeight: '700', fontSize: 13 },
  spotlightCopy: { color: 'rgba(244,252,250,0.88)', fontSize: 16, lineHeight: 24 },

  spotlightForm: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brandDark,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 7,
  },
  spotlightInput: {
    borderWidth: 1.5,
    borderColor: 'rgba(16,35,29,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
    backgroundColor: '#fafafa',
    marginBottom: 14,
    minHeight: 52,
  },
  spotlightBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 2,
  },
  spotlightBtnText: { color: '#fff', fontWeight: '700', fontSize: 16, fontFamily: fonts.heading },
  nearMeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 10,
  },
  nearMeBtnText: { color: colors.brand, fontWeight: '600', fontSize: 14 },

  miniGrid: { flexDirection: 'row', gap: 10 },
  miniCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 20,
    padding: 16,
  },
  miniLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(244,252,250,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  miniBody: { fontSize: 13, color: 'rgba(244,252,250,0.85)', lineHeight: 20 },

  /* Why section */
  whySection: {
    backgroundColor: '#faf8f3',
    padding: 20,
    paddingTop: 36,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fonts.heading,
    marginBottom: 16,
    lineHeight: 30,
  },
  whyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    marginBottom: 14,
  },
  whyNum: { fontSize: 32, fontWeight: '700', color: '#e94560', marginBottom: 16 },
  whyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 6 },
  whyBody: { fontSize: 13, color: '#666', lineHeight: 22 },

  joinCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'stretch',
    marginBottom: 8,
  },
  joinTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fonts.heading,
    marginBottom: 18,
    textAlign: 'center',
  },

  /* Popular services */
  eyebrowDark: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brandDark,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    marginBottom: 8,
  },
  sectionContrast: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 28,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(16,35,29,0.05)',
  },
  tagCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 13,
    ...shadow,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text, fontFamily: fonts.heading },

  /* CTA */
  ctaSection: { padding: 16 },
  ctaPanel: {
    borderRadius: 36,
    padding: 24,
    backgroundColor: colors.brandDark,
  },
  ctaEyebrow: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    fontFamily: fonts.heading,
    marginBottom: 10,
    lineHeight: 26,
  },
  ctaBody: { fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 20, marginBottom: 16 },
  ctaActions: { flexDirection: 'column', gap: 10 },

  /* Footer */
  footer: { padding: 20, paddingTop: 24, alignItems: 'center', gap: 10 },
  footerCopy: { fontSize: 12, color: colors.muted },
  footerLinks: { flexDirection: 'row', gap: 16 },
  footerLink: { fontSize: 12, color: colors.muted, fontWeight: '600' },
});

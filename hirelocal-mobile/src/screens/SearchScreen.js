import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ScrollView, KeyboardAvoidingView, Platform, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProviderCard from '../components/ProviderCard';
import ProviderCardSkeleton from '../components/ProviderCardSkeleton';
import { colors, radius, shadow, fonts } from '../constants/theme';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { getNearbySearchParams } from '../utils/location';
import { Ionicons } from '@expo/vector-icons';

const FILTER_CHIPS = ['Plumbing', 'Electrical', 'Cleaning', 'Fashion', 'Carpentry', 'Painting'];

export default function SearchScreen({ navigation, route }) {
  const { provider: authProvider } = useAuth();
  const initial = route.params || {};

  const [category, setCategory] = useState(initial.category || '');
  const [state, setState] = useState(initial.state || '');
  const [lga, setLga] = useState(initial.lga || '');
  const [query, setQuery] = useState(initial.query || '');
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState('');
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    doSearch();
  }, []);

  async function doSearch(isPull = false) {
    isPull ? setRefreshing(true) : setLoading(true);
    setSummary('');
    try {
      const { data } = await api.search({ category, state, lga, query });
      const list = data.success ? (data.providers || []) : [];
      setProviders(list);
      setSummary(
        list.length
          ? `${list.length} provider${list.length === 1 ? '' : 's'} found`
          : 'No matching providers found.'
      );
    } catch {
      setSummary('Unable to load results. Check your connection.');
    }
    isPull ? setRefreshing(false) : setLoading(false);
  }

  async function handleNearMe() {
    setLocating(true);
    const params = await getNearbySearchParams();
    setLocating(false);
    if (!params) return;
    setState(params.state || '');
    setLga(params.lga || '');
    setCategory('');
    setQuery('');
    setLoading(true);
    setSummary('');
    try {
      const { data } = await api.search(params);
      const list = data.success ? (data.providers || []) : [];
      setProviders(list);
      setSummary(list.length ? `${list.length} provider${list.length === 1 ? '' : 's'} found near you` : 'No providers found near your location.');
    } catch {
      setSummary('Unable to load results.');
    }
    setLoading(false);
  }

  function applyChip(cat) {
    const next = category === cat ? '' : cat;
    setCategory(next);
    setLga('');
    setQuery('');
    setLoading(true);
    setSummary('');
    api.search({ category: next, state }).then(({ data }) => {
      const list = data.success ? (data.providers || []) : [];
      setProviders(list);
      setSummary(
        list.length
          ? `${list.length} provider${list.length === 1 ? '' : 's'} found`
          : 'No matching providers found.'
      );
      setLoading(false);
    }).catch(() => {
      setSummary('Unable to load results.');
      setLoading(false);
    });
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

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <FlatList
          data={loading ? [] : providers}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={() => doSearch(true)}
          ListHeaderComponent={
            <View>
              {/* ── Page title ── */}
              <View style={styles.hero}>
                <Text style={styles.eyebrow}>Search marketplace</Text>
                <Text style={styles.h1}>Find local workers with confidence.</Text>
                <Text style={styles.heroCopy}>
                  Filter by category, state, LGA, or keyword to find verified professionals near you.
                </Text>
              </View>

              {/* ── Search panel ── */}
              <View style={styles.searchPanel}>

                {/* Row 1: Category + State */}
                <View style={styles.row}>
                  <View style={styles.inputWrap}>
                    <Text style={styles.label}>Category</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Plumber, Tailor…"
                      placeholderTextColor="rgba(16,35,29,0.35)"
                      value={category}
                      onChangeText={setCategory}
                      returnKeyType="search"
                    />
                  </View>
                  <View style={styles.inputWrap}>
                    <Text style={styles.label}>State</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Lagos"
                      placeholderTextColor="rgba(16,35,29,0.35)"
                      value={state}
                      onChangeText={setState}
                      returnKeyType="search"
                    />
                  </View>
                </View>

                {/* Row 2: LGA + Keyword */}
                <View style={styles.row}>
                  <View style={styles.inputWrap}>
                    <Text style={styles.label}>LGA</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ikeja"
                      placeholderTextColor="rgba(16,35,29,0.35)"
                      value={lga}
                      onChangeText={setLga}
                      returnKeyType="search"
                    />
                  </View>
                  <View style={styles.inputWrap}>
                    <Text style={styles.label}>Keyword</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Repair, urgent…"
                      placeholderTextColor="rgba(16,35,29,0.35)"
                      value={query}
                      onChangeText={setQuery}
                      onSubmitEditing={doSearch}
                      returnKeyType="search"
                    />
                  </View>
                </View>

                {/* Search button */}
                <TouchableOpacity style={styles.searchBtn} onPress={doSearch}>
                  <Text style={styles.searchBtnText}>Search Providers</Text>
                </TouchableOpacity>

                {/* Near me */}
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

                {/* Quick-filter chips */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsContent}
                >
                  {FILTER_CHIPS.map((cat) => {
                    const active = category === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => applyChip(cat)}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* ── Results header ── */}
              <View style={styles.resultsHeader}>
                <View>
                  <Text style={styles.eyebrow}>Results</Text>
                  <Text style={styles.h2}>Available providers</Text>
                </View>
                {!!summary && (
                  <View style={styles.summaryPill}>
                    <Text style={styles.summaryText}>{summary}</Text>
                  </View>
                )}
              </View>

              {/* Skeleton cards while loading */}
              {loading && [0, 1, 2].map((i) => <ProviderCardSkeleton key={i} />)}
            </View>
          }
          renderItem={({ item }) => (
            <ProviderCard
              provider={item}
              onPress={() => navigation.navigate('Profile', { id: item.id })}
            />
          )}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyTitle}>No providers found</Text>
                <Text style={styles.emptyBody}>
                  {summary || 'Try a different category, location, or keyword.'}
                </Text>
              </View>
            ) : null
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceDark },

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
  headerLink: { color: 'rgba(255,255,255,0.82)', fontWeight: '600', fontSize: 13 },

  /* List container */
  list: { padding: 16, paddingTop: 20, backgroundColor: colors.bg, flexGrow: 1 },

  /* Hero */
  hero: { marginBottom: 20 },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brandDark,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  h1: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    fontFamily: fonts.heading,
    lineHeight: 30,
    marginBottom: 6,
  },
  h2: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fonts.heading,
  },
  heroCopy: { fontSize: 14, color: colors.muted, lineHeight: 21 },

  /* Search panel */
  searchPanel: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(16,35,29,0.07)',
    ...shadow,
  },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  inputWrap: { flex: 1 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brandDark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: 'rgba(16,35,29,0.1)',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.text,
    backgroundColor: '#fafafa',
    minHeight: 46,
  },

  /* Search button */
  searchBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 2,
  },
  searchBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    fontFamily: fonts.heading,
    letterSpacing: 0.2,
  },

  /* Near me button */
  nearMeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 2,
    marginBottom: 6,
  },
  nearMeBtnText: { color: colors.brand, fontWeight: '600', fontSize: 14 },

  /* Filter chips */
  chipsContent: { paddingVertical: 2, gap: 8 },
  chip: {
    backgroundColor: 'rgba(16,35,29,0.06)',
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: colors.brand },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    fontFamily: fonts.heading,
  },
  chipTextActive: { color: '#fff' },

  /* Results header */
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 14,
    gap: 10,
  },
  summaryPill: {
    backgroundColor: 'rgba(15,118,110,0.1)',
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand,
  },

  /* Empty state */
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: { fontSize: 40, marginBottom: 14 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fonts.heading,
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 21,
  },
});

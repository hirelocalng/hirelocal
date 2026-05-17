import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Modal, Linking,
  Dimensions, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import StarRating from '../components/StarRating';
import StatusMessage from '../components/StatusMessage';
import { colors, radius, shadow, fonts } from '../constants/theme';
import { api, formatLocation } from '../utils/api';
// logProfileView / logContact fire-and-forget — backend uses them to push notifications to the provider

const { width } = Dimensions.get('window');
const PHOTO_BANNER_HEIGHT = 300;
const COL_GAP = 12;
const CONTENT_PAD = 16;
const PHOTO_COL_SIZE = (width - CONTENT_PAD * 2 - COL_GAP) / 2;

export default function ProfileScreen({ route, navigation }) {
  const { id } = route.params;
  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const [reviewerName, setReviewerName] = useState('');
  const [rating, setRating] = useState('');
  const [comment, setComment] = useState('');
  const [reviewStatus, setReviewStatus] = useState({ type: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadProfile();
    api.logProfileView(id); // fire-and-forget
  }, [id]);

  async function loadProfile(isPull = false) {
    isPull ? setRefreshing(true) : setLoading(true);
    try {
      const { data } = await api.getProvider(id);
      if (data.success) {
        setProvider(data.provider);
        setReviews(data.reviews || []);
      }
    } catch {}
    isPull ? setRefreshing(false) : setLoading(false);
  }

  function handleCall() {
    const phone = provider?.phone;
    if (!phone) return;
    api.logContact(id, 'call'); // fire-and-forget
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Error', 'Unable to open phone app.'));
  }

  function handleWhatsApp() {
    const wa = provider?.whatsapp;
    if (!wa) return;
    api.logContact(id, 'whatsapp'); // fire-and-forget
    const number = String(wa).replace(/\D/g, '').replace(/^0/, '234');
    Linking.openURL(`https://wa.me/${number}`).catch(() => Alert.alert('Error', 'Unable to open WhatsApp.'));
  }

  async function submitReview() {
    if (!reviewerName.trim() || !rating || !comment.trim()) {
      setReviewStatus({ type: 'error', message: 'Please fill all review fields.' });
      return;
    }
    setSubmitting(true);
    setReviewStatus({ type: 'info', message: 'Submitting review…' });
    try {
      const { data } = await api.submitReview({
        provider_id: id,
        reviewer_name: reviewerName,
        rating,
        comment,
      });
      if (data.success) {
        setReviewStatus({ type: 'success', message: 'Review submitted successfully.' });
        setReviewerName(''); setRating(''); setComment('');
        loadProfile();
      } else {
        setReviewStatus({ type: 'error', message: data.message || 'Unable to submit review.' });
      }
    } catch {
      setReviewStatus({ type: 'error', message: 'Unable to submit review right now.' });
    }
    setSubmitting(false);
  }

  /* ── Loading state ── */
  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  /* ── Not found state ── */
  if (!provider) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Not Found</Text>
        </View>
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyText}>Provider not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const location = formatLocation(provider) || 'Location not set';
  const hasPhoto = provider.photo && provider.photo.trim() !== '';
  const initials = (provider.name || 'HL').slice(0, 2).toUpperCase();
  const workPhotos = provider.work_photos || [];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadProfile(true)}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }
      >

        {/* ── Hero banner ── */}
        <View style={styles.heroBanner}>
          {hasPhoto ? (
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={() => setLightboxSrc(provider.photo)}
              style={styles.bannerTouch}
            >
              <Image
                source={{ uri: provider.photo }}
                style={styles.bannerPhoto}
                resizeMode="contain"
              />
            </TouchableOpacity>
          ) : (
            <View style={[styles.bannerPhoto, styles.bannerFallback]}>
              <Text style={styles.bannerInitials}>{initials}</Text>
            </View>
          )}

          {/* Floating back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Verified badge */}
          {provider.verified && (
            <View style={styles.verifiedOverlay}>
              <Text style={styles.verifiedText}>✓ Verified</Text>
            </View>
          )}
        </View>

        {/* ── Provider identity ── */}
        <View style={styles.identityBlock}>
          <Text style={styles.providerName}>{provider.name}</Text>

          <View style={styles.metaRow}>
            {!!provider.skill && (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>{provider.skill}</Text>
              </View>
            )}
            {!!provider.category && (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>{provider.category}</Text>
              </View>
            )}
          </View>

          <Text style={styles.locationText}>📍 {location}</Text>

          {!!provider.bio && (
            <Text style={styles.bioText}>{provider.bio}</Text>
          )}

          <View style={styles.ratingBlock}>
            <StarRating rating={provider.rating} size={16} />
            <Text style={styles.ratingValue}>{provider.rating || '0.0'}</Text>
            <Text style={styles.ratingCount}>({provider.review_count || 0} reviews)</Text>
          </View>
        </View>

        <View style={styles.content}>

          {/* ── Contact buttons ── */}
          <View style={styles.contactRow}>
            {provider.phone && (
              <TouchableOpacity style={styles.btnCall} onPress={handleCall}>
                <Ionicons name="call" size={18} color="#fff" />
                <Text style={styles.btnCallText}>Call Provider</Text>
              </TouchableOpacity>
            )}
            {provider.whatsapp && (
              <TouchableOpacity style={styles.btnWA} onPress={handleWhatsApp}>
                <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                <Text style={styles.btnWAText}>WhatsApp</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Quick stats ── */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{provider.rating || '—'}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{provider.review_count || 0}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{provider.views || 0}</Text>
              <Text style={styles.statLabel}>Profile Views</Text>
            </View>
          </View>

          {/* ── Work photo gallery — 2-column grid ── */}
          <View style={styles.card}>
            <Text style={styles.sectionEyebrow}>Portfolio</Text>
            <Text style={styles.sectionTitle}>Work photos</Text>

            {workPhotos.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No work photos uploaded yet.</Text>
              </View>
            ) : (
              <View style={styles.photoGrid}>
                {workPhotos.map((uri, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.photoTile}
                    onPress={() => setLightboxSrc(uri)}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={{ uri }}
                      style={styles.photoImg}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* ── Reviews ── */}
          <View style={styles.card}>
            <Text style={styles.sectionEyebrow}>Client feedback</Text>
            <Text style={styles.sectionTitle}>Reviews</Text>

            {reviews.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No reviews yet. Be the first to leave one below.</Text>
              </View>
            ) : (
              reviews.map((r, i) => (
                <View key={i} style={[styles.reviewCard, i < reviews.length - 1 && styles.reviewDivider]}>
                  <View style={styles.reviewHead}>
                    <Text style={styles.reviewerName}>{r.reviewer_name}</Text>
                    <View style={styles.reviewRatingPill}>
                      <Text style={styles.reviewRatingText}>{r.rating}/5</Text>
                    </View>
                  </View>
                  <StarRating rating={r.rating} size={13} />
                  <Text style={styles.reviewComment}>{r.comment || 'No comment.'}</Text>
                </View>
              ))
            )}
          </View>

          {/* ── Leave a review ── */}
          <View style={styles.card}>
            <Text style={styles.sectionEyebrow}>Share your experience</Text>
            <Text style={styles.sectionTitle}>Leave a review</Text>
            <StatusMessage type={reviewStatus.type} message={reviewStatus.message} />

            <Text style={styles.formLabel}>Your Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Emeka Okafor"
              placeholderTextColor="rgba(16,35,29,0.35)"
              value={reviewerName}
              onChangeText={setReviewerName}
            />

            <Text style={styles.formLabel}>Rating</Text>
            <View style={styles.ratingBtnRow}>
              {['5', '4', '3', '2', '1'].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.ratingBtn, rating === r && styles.ratingBtnActive]}
                  onPress={() => setRating(r)}
                >
                  <Text style={[styles.ratingBtnText, rating === r && styles.ratingBtnTextActive]}>
                    {r}★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>Comment</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Tell others about your experience…"
              placeholderTextColor="rgba(16,35,29,0.35)"
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.btnSubmit, submitting && { opacity: 0.6 }]}
              onPress={submitReview}
              disabled={submitting}
            >
              <Text style={styles.btnSubmitText}>
                {submitting ? 'Submitting…' : 'Submit Review'}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>

      {/* ── Lightbox ── */}
      <Modal
        visible={!!lightboxSrc}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxSrc(null)}
      >
        <TouchableOpacity
          style={styles.lightbox}
          activeOpacity={1}
          onPress={() => setLightboxSrc(null)}
        >
          <TouchableOpacity style={styles.lightboxCloseBtn} onPress={() => setLightboxSrc(null)}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          {lightboxSrc && (
            <Image
              source={{ uri: lightboxSrc }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceDark },
  scroll: { flex: 1, backgroundColor: colors.bg },

  /* Loading state */
  navBar: {
    backgroundColor: colors.surfaceDark,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  loadingWrap: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.muted, fontSize: 15 },

  /* ── Hero banner ── */
  heroBanner: {
    width: '100%',
    height: PHOTO_BANNER_HEIGHT,
    backgroundColor: colors.surfaceDark,
    position: 'relative',
  },
  bannerTouch: { width: '100%', height: '100%' },
  bannerPhoto: { width: '100%', height: '100%' },
  bannerFallback: {
    backgroundColor: colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerInitials: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 80,
    fontWeight: '700',
    fontFamily: fonts.heading,
  },

  /* Floating back button */
  backBtn: {
    position: 'absolute',
    top: 14,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 999,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Verified overlay */
  verifiedOverlay: {
    position: 'absolute',
    top: 14,
    right: 16,
    backgroundColor: colors.brand,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  verifiedText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  /* ── Identity block ── */
  identityBlock: {
    backgroundColor: '#fff',
    paddingHorizontal: CONTENT_PAD,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(16,35,29,0.06)',
  },
  providerName: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    fontFamily: fonts.heading,
    marginBottom: 10,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  metaChip: {
    backgroundColor: 'rgba(15,118,110,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  metaChipText: { fontSize: 12, fontWeight: '700', color: colors.brand },

  locationText: { fontSize: 13, color: colors.muted, marginBottom: 10 },

  bioText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 23,
    marginBottom: 14,
  },

  ratingBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  ratingCount: { fontSize: 13, color: colors.muted },

  /* ── Content area ── */
  content: { padding: CONTENT_PAD, paddingTop: 16 },

  /* Contact buttons */
  contactRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  btnCall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.full,
    paddingVertical: 14,
  },
  btnCallText: { color: '#fff', fontWeight: '700', fontSize: 14, fontFamily: fonts.heading },
  btnWA: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#25d366',
    borderRadius: radius.full,
    paddingVertical: 14,
  },
  btnWAText: { color: '#fff', fontWeight: '700', fontSize: 14, fontFamily: fonts.heading },

  /* Stats row */
  statsRow: {
    backgroundColor: '#fff',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(16,35,29,0.07)',
    ...shadow,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(16,35,29,0.08)' },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.text, fontFamily: fonts.heading },
  statLabel: { fontSize: 11, color: colors.muted, marginTop: 2, fontWeight: '600' },

  /* Section card */
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(16,35,29,0.07)',
    ...shadow,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brandDark,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fonts.heading,
    marginBottom: 14,
  },

  /* 2-column photo grid */
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: COL_GAP,
  },
  photoTile: {
    width: PHOTO_COL_SIZE,
    height: PHOTO_COL_SIZE,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(16,35,29,0.06)',
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },

  /* Reviews */
  reviewCard: { paddingVertical: 12 },
  reviewDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(16,35,29,0.06)',
    marginBottom: 4,
  },
  reviewHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewerName: { fontSize: 14, fontWeight: '700', color: colors.text },
  reviewRatingPill: {
    backgroundColor: 'rgba(15,118,110,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  reviewRatingText: { fontSize: 12, fontWeight: '700', color: colors.brand },
  reviewComment: { fontSize: 13, color: colors.muted, lineHeight: 19, marginTop: 6 },

  /* Review form */
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brandDark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 7,
  },
  input: {
    borderWidth: 1.5,
    borderColor: 'rgba(16,35,29,0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: '#fafafa',
    marginBottom: 14,
    minHeight: 48,
  },
  textarea: { minHeight: 110, paddingTop: 12 },
  ratingBtnRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  ratingBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(16,35,29,0.1)',
    backgroundColor: '#fafafa',
    alignItems: 'center',
  },
  ratingBtnActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  ratingBtnText: { fontSize: 14, fontWeight: '700', color: colors.text },
  ratingBtnTextActive: { color: '#fff' },
  btnSubmit: {
    backgroundColor: colors.brand,
    borderRadius: radius.full,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 2,
  },
  btnSubmitText: { color: '#fff', fontWeight: '700', fontSize: 15, fontFamily: fonts.heading },

  /* Empty states */
  emptyState: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyStateText: { color: colors.muted, fontSize: 14, textAlign: 'center' },

  /* Lightbox */
  lightbox: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxCloseBtn: {
    position: 'absolute',
    top: 52,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  lightboxImage: {
    width: width * 0.94,
    height: width * 0.94,
    borderRadius: 12,
  },
});

import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import StarRating from './StarRating';
import { colors, radius, shadow, fonts } from '../constants/theme';
import { formatLocation } from '../utils/api';

const PHOTO_HEIGHT = 300;
const CARD_RADIUS = 24;

export default function ProviderCard({ provider, onPress }) {
  const location = formatLocation(provider) || 'Location pending';
  const initials = ((provider?.name || 'HL').slice(0, 2)).toUpperCase();
  const hasPhoto = provider?.photo && provider.photo.trim() !== '';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>

      {/* ── Banner photo ── */}
      <View style={styles.photoWrap}>
        {hasPhoto ? (
          <Image source={{ uri: provider.photo }} style={styles.photo} resizeMode="contain" />
        ) : (
          <View style={[styles.photo, styles.photoFallback]}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
        )}

        {/* Verified badge overlaid on photo */}
        {provider.verified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✓ Verified</Text>
          </View>
        )}
      </View>

      {/* ── Card content ── */}
      <View style={styles.content}>

        <Text style={styles.name} numberOfLines={1}>{provider.name}</Text>

        <View style={styles.ratingRow}>
          <StarRating rating={provider.rating} size={13} />
          <Text style={styles.reviewCount}>({provider.review_count || 0})</Text>
        </View>

        <Text style={styles.location} numberOfLines={1}>📍 {location}</Text>

        <Text style={styles.bio} numberOfLines={2}>
          {provider.bio || 'No bio added yet.'}
        </Text>

        {(!!provider.skill || !!provider.category) && (
          <View style={styles.tagsRow}>
            {!!provider.skill && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{provider.skill}</Text>
              </View>
            )}
            {!!provider.category && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{provider.category}</Text>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.viewBtn} onPress={onPress}>
          <Text style={styles.viewBtnText}>View Profile →</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
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

  /* Banner photo */
  photoWrap: {
    width: '100%',
    height: PHOTO_HEIGHT,
    position: 'relative',
    backgroundColor: colors.surfaceDark,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoFallback: {
    backgroundColor: colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#fff',
    fontSize: 56,
    fontWeight: '700',
    fontFamily: fonts.heading,
    opacity: 0.85,
  },

  /* Verified badge — sits on top of the photo, top-right */
  verifiedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.brand,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  verifiedText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  /* Content section */
  content: {
    padding: 18,
  },

  name: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fonts.heading,
    marginBottom: 6,
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  reviewCount: {
    fontSize: 13,
    color: colors.muted,
  },

  location: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 10,
  },

  bio: {
    fontSize: 14,
    color: '#555',
    lineHeight: 21,
    marginBottom: 14,
  },

  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    backgroundColor: 'rgba(15,118,110,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand,
  },

  /* View Profile — solid dark green, premium feel */
  viewBtn: {
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.full,
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: fonts.heading,
    letterSpacing: 0.2,
  },
});

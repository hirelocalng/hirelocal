import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Avatar from './Avatar';
import StarRating from './StarRating';
import { colors, radius, fonts } from '../constants/theme';
import { formatLocation } from '../utils/api';

export default function ResultCard({ provider, onPress }) {
  const location = formatLocation(provider) || 'Location pending';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Head: avatar + eyebrow + name | verified pill */}
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <Avatar provider={provider} size={48} />
          <View>
            <Text style={styles.eyebrow}>
              {provider.verified ? 'Verified provider' : 'Provider'}
            </Text>
            <Text style={styles.name} numberOfLines={1}>{provider.name}</Text>
          </View>
        </View>
        <View style={[styles.pill, provider.verified ? styles.pillSuccess : styles.pillWarm]}>
          <Text style={[styles.pillText, provider.verified ? styles.pillTextSuccess : styles.pillTextWarm]}>
            {provider.verified ? 'Verified' : 'Pending'}
          </Text>
        </View>
      </View>

      {/* Meta pills: skill + location */}
      <View style={styles.metaRow}>
        <View style={styles.pill}>
          <Text style={styles.pillText} numberOfLines={1}>
            {provider.skill || 'Skilled worker'}
          </Text>
        </View>
        <View style={[styles.pill, styles.pillWarm]}>
          <Text style={[styles.pillText, styles.pillTextWarm]} numberOfLines={1}>
            {location}
          </Text>
        </View>
      </View>

      {/* Bio */}
      <Text style={styles.bio} numberOfLines={2}>
        {provider.bio || 'No bio added yet.'}
      </Text>

      {/* Rating row */}
      <View style={styles.ratingRow}>
        <View style={styles.ratingLeft}>
          <StarRating rating={provider.rating} size={13} />
          <Text style={styles.ratingValue}>{provider.rating || '0.00'}</Text>
        </View>
        <Text style={styles.reviewCount}>{provider.review_count || 0} review(s)</Text>
      </View>

      {/* View Full Profile button — secondary style, full width */}
      <TouchableOpacity style={styles.viewBtn} onPress={onPress}>
        <Text style={styles.viewBtnText}>View Full Profile</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(16,35,29,0.08)',
    marginBottom: 12,
  },

  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 0,
  },
  headLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brandDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },

  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    marginBottom: 14,
  },

  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(15,118,110,0.1)',
  },
  pillWarm: { backgroundColor: 'rgba(239,143,73,0.16)' },
  pillSuccess: { backgroundColor: 'rgba(33,115,95,0.14)' },
  pillText: { fontSize: 13, fontWeight: '700', color: colors.brandDark },
  pillTextWarm: { color: '#8f4b17' },
  pillTextSuccess: { color: colors.success },

  bio: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 14,
  },

  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  ratingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingValue: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  reviewCount: { fontSize: 13, color: colors.muted },

  viewBtn: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(16,35,29,0.18)',
    borderRadius: radius.full,
    paddingVertical: 13,
    alignItems: 'center',
  },
  viewBtnText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
    fontFamily: fonts.heading,
  },
});

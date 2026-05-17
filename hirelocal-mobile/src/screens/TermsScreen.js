import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../constants/theme';

const SECTIONS = [
  {
    heading: '1. Acceptance of Terms',
    body: 'By creating an account or using HireLocal, you confirm you have read and agree to these terms. If you do not agree, do not use this platform.',
  },
  {
    heading: '2. What HireLocal Does',
    body: 'HireLocal is a listing and discovery platform. We are not responsible for the quality, safety, or outcome of any service arranged through our platform. All services are contracted directly between client and provider.',
  },
  {
    heading: '3. Provider Responsibilities',
    bullets: [
      'Provide accurate and truthful profile information',
      'Upload a valid government-issued ID for verification',
      'Only list services you are genuinely qualified to provide',
      'Respond to clients professionally',
      'Not impersonate another person or business',
    ],
  },
  {
    heading: '4. Client Responsibilities',
    bullets: [
      'Use the platform for lawful purposes only',
      'Not harass or abuse providers',
      'Understand HireLocal is not party to any client-provider agreement',
    ],
  },
  {
    heading: '5. Subscription and Payments',
    highlight: 'Free Trial: Every new provider gets 7 days free. After that, ₦1,000 every 14 days is required to keep your profile visible.',
    bullets: [
      'Unpaid profiles are hidden from search but not deleted',
      'Paying anytime restores visibility immediately',
      'Payments processed by Korapay',
      'Subscription payments are non-refundable',
    ],
  },
  {
    heading: '6. Prohibited Use',
    bullets: [
      'Fake or duplicate profiles',
      'Listing illegal services',
      'Harassment of any kind',
      'Manipulating search rankings dishonestly',
    ],
  },
  {
    heading: '7. Termination',
    body: 'HireLocal can suspend or remove any account that violates these terms, without notice or refund.',
  },
  {
    heading: '8. Limitation of Liability',
    body: 'HireLocal is not liable for any dispute, loss, or damage arising from services arranged between clients and providers through this platform.',
  },
  {
    heading: '9. Governing Law',
    body: 'These terms are governed by the laws of the Federal Republic of Nigeria.',
  },
  {
    heading: '10. Contact Us',
    body: 'hirelocal.ng@gmail.com',
    bold: true,
  },
];

export default function TermsScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Terms of Service</Text>
          <Text style={styles.heroSub}>Last updated: April 2026 · Governed by Nigerian Law</Text>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.intro}>
            By accessing or using HireLocal, you agree to be bound by these Terms of Service.
          </Text>

          {SECTIONS.map((s) => (
            <View key={s.heading} style={styles.section}>
              <View style={styles.sectionHeadRow}>
                <View style={styles.accentBar} />
                <Text style={styles.sectionHeading}>{s.heading}</Text>
              </View>
              {s.highlight && (
                <View style={styles.highlightBox}>
                  <Text style={styles.highlightText}>{s.highlight}</Text>
                </View>
              )}
              {s.body && (
                <Text style={[styles.para, s.bold && styles.bold]}>{s.body}</Text>
              )}
              {s.bullets && s.bullets.map((b, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>{b}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9ff' },

  hero: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 36,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  backText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    fontFamily: fonts.heading,
    marginBottom: 6,
  },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },

  body: { padding: 24, paddingBottom: 48 },

  intro: {
    fontSize: 15,
    color: '#444',
    lineHeight: 24,
    marginBottom: 24,
  },

  section: { marginBottom: 24 },
  sectionHeadRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  accentBar: {
    width: 4,
    height: '100%',
    minHeight: 20,
    backgroundColor: '#e94560',
    borderRadius: 2,
    marginRight: 10,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f3460',
    fontFamily: fonts.heading,
    flexShrink: 1,
  },

  highlightBox: {
    backgroundColor: '#f0f2ff',
    borderWidth: 1,
    borderColor: '#dde3f5',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  highlightText: { fontSize: 14, color: '#333', lineHeight: 22 },

  para: { fontSize: 15, color: '#444', lineHeight: 26 },
  bold: { fontWeight: '700' },

  bulletRow: { flexDirection: 'row', marginBottom: 6, paddingLeft: 4 },
  bullet: { fontSize: 15, color: '#e94560', marginRight: 8, lineHeight: 24 },
  bulletText: { fontSize: 15, color: '#444', lineHeight: 24, flex: 1 },
});

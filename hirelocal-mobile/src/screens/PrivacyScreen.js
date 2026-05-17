import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../constants/theme';

const SECTIONS = [
  {
    heading: '1. Who We Are',
    body: 'HireLocal is a Nigerian online marketplace that connects skilled service providers with clients looking to hire them. We operate in Nigeria and are governed by Nigerian law.',
  },
  {
    heading: '2. What We Collect',
    body: 'When a provider registers, we collect:',
    bullets: [
      'Full name',
      'Email address',
      'Phone number and WhatsApp number',
      'Location — State, LGA, and City/Area',
      'Skill category and service description',
      'Short biography',
      'Work photos (minimum 3, maximum 5)',
      'Government-issued ID (National ID, Voter\'s Card, Driver\'s License, or International Passport) for verification only',
    ],
  },
  {
    heading: '3. Why We Collect It',
    body: 'Profile information is used to create a public listing visible to clients. Your government-issued ID is collected solely to verify your identity for the Verified badge. It is never shown publicly.',
  },
  {
    heading: '4. How We Store It',
    body: 'All data is stored securely in an encrypted database. Passwords are hashed and never stored in plain text. ID documents are stored in a protected directory and only accessed by admins for verification.',
  },
  {
    heading: '5. Who We Share It With',
    body: 'We do not sell, rent, or trade your data. Payment processing is handled by Korapay. Your ID documents are never shared with any third party.',
  },
  {
    heading: '6. Your Rights',
    bullets: [
      'Access the personal data we hold about you',
      'Request correction of inaccurate data',
      'Request deletion of your account and all data including your ID photo',
    ],
    body: 'Email us at hirelocal.ng@gmail.com with subject "Data Request".',
  },
  {
    heading: '7. Cookies',
    body: 'We use basic session cookies for login only. No tracking or advertising cookies.',
  },
  {
    heading: '8. Changes to This Policy',
    body: 'We may update this policy at any time. Continued use of HireLocal means you accept the updated policy.',
  },
  {
    heading: '9. Contact Us',
    body: 'hirelocal.ng@gmail.com',
    bold: true,
  },
];

export default function PrivacyScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Privacy Policy</Text>
          <Text style={styles.heroSub}>Last updated: April 2026 · Governed by Nigerian Law (NDPR)</Text>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.intro}>
            Your privacy matters to us. This policy explains what information HireLocal collects,
            why we collect it, and how we protect it. By using HireLocal, you agree to this policy.
          </Text>

          {SECTIONS.map((s) => (
            <View key={s.heading} style={styles.section}>
              <View style={styles.sectionHeadRow}>
                <View style={styles.accentBar} />
                <Text style={styles.sectionHeading}>{s.heading}</Text>
              </View>
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

  para: { fontSize: 15, color: '#444', lineHeight: 26 },
  bold: { fontWeight: '700' },

  bulletRow: { flexDirection: 'row', marginBottom: 6, paddingLeft: 4 },
  bullet: { fontSize: 15, color: '#e94560', marginRight: 8, lineHeight: 24 },
  bulletText: { fontSize: 15, color: '#444', lineHeight: 24, flex: 1 },
});

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../utils/api';
import { colors, radius, shadow, fonts } from '../constants/theme';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSubmit() {
    setMessage(null);
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Please enter your email address.' });
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.forgotPassword(email.trim());
      if (data.success) {
        setMessage({ type: 'success', text: data.message || 'Reset link sent. Check your email.' });
      } else {
        setMessage({ type: 'error', text: data.message || 'Could not send reset link.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Unable to reach server. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.logo}>HireLocal</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Reset Password</Text>
            <Text style={styles.cardSub}>
              Enter your account email and we'll send you a link to reset your password.
            </Text>

            {message && (
              <View style={[styles.msgBox, message.type === 'success' ? styles.msgSuccess : styles.msgError]}>
                <Text style={[styles.msgText, message.type === 'success' ? styles.msgTextSuccess : styles.msgTextError]}>
                  {message.text}
                </Text>
              </View>
            )}

            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send Reset Link</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backLink}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceDark },
  header: {
    backgroundColor: colors.surfaceDark,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  logo: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    fontFamily: fonts.heading,
    letterSpacing: -0.5,
  },
  scroll: { padding: 16, backgroundColor: colors.bg, flexGrow: 1 },

  card: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: 20,
    marginTop: 16,
    ...shadow,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 6 },
  cardSub: { fontSize: 13, color: colors.muted, lineHeight: 19, marginBottom: 18 },

  msgBox: {
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  msgSuccess: { backgroundColor: '#e6f4ea', borderLeftColor: '#2e7d32' },
  msgError: { backgroundColor: '#ffebee', borderLeftColor: '#c33' },
  msgText: { fontSize: 13, lineHeight: 18 },
  msgTextSuccess: { color: '#2e7d32' },
  msgTextError: { color: '#c33' },

  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: 'rgba(255,255,255,0.9)',
    marginBottom: 14,
  },

  btn: {
    backgroundColor: colors.brand,
    borderRadius: radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  backLink: { color: colors.brand, fontWeight: '600', textAlign: 'center', fontSize: 14 },
});

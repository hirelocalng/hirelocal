import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { colors, radius, shadow, fonts } from '../constants/theme';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.login({ email: email.trim(), password });
      if (data.success) {
        await login(data.token, data.provider);
      } else {
        setError(data.message || 'Invalid email or password.');
      }
    } catch {
      setError('Unable to reach the server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.logo}>HireLocal</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.copyBlock}>
            <Text style={styles.eyebrow}>Provider access</Text>
            <Text style={styles.h1}>Welcome back to your HireLocal dashboard.</Text>
            <Text style={styles.copy}>
              Login to manage your provider profile, check reviews, and monitor your listing views.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Provider Login</Text>
            <Text style={styles.cardSub}>Enter your account details to continue.</Text>

            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
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

            <View style={styles.labelRow}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.forgotLink}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[styles.input, { paddingRight: 60, marginBottom: 0 }]}
                placeholder="••••••••"
                placeholderTextColor={colors.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.showBtn} onPress={() => setShowPassword((v) => !v)}>
                <Text style={styles.showBtnText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Login</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.note}>
              New here?{' '}
              <Text style={styles.link} onPress={() => navigation.navigate('Register')}>
                Create a provider account
              </Text>
            </Text>
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

  copyBlock: { marginBottom: 20 },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brandDark,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  h1: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    fontFamily: fonts.heading,
    lineHeight: 28,
    marginBottom: 8,
  },
  copy: { fontSize: 14, color: colors.muted, lineHeight: 20 },

  card: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: 20,
    ...shadow,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
  cardSub: { fontSize: 13, color: colors.muted, marginBottom: 16 },

  errorBox: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#c33',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  errorText: { color: '#c33', fontSize: 13, lineHeight: 18 },

  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  forgotLink: { fontSize: 12, color: colors.brand, fontWeight: '600' },

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
  passwordWrap: { position: 'relative', marginBottom: 14 },
  showBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  showBtnText: { fontSize: 13, fontWeight: '600', color: colors.muted },

  btn: {
    backgroundColor: colors.brand,
    borderRadius: radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  note: { fontSize: 13, color: colors.muted, textAlign: 'center' },
  link: { color: colors.brand, fontWeight: '600' },
});

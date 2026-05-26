import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
  Modal, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { colors, radius, shadow, fonts } from '../constants/theme';

const ID_TYPES = ['National ID', "Voter's Card", "Driver's License", 'International Passport'];
const MIN_PHOTOS = 3;
const MAX_PHOTOS = 10;

export default function RegisterScreen({ navigation }) {
  const { login } = useAuth();

  const [form, setForm] = useState({
    name: '', email: '', phone: '', whatsapp: '', password: '',
    skill: '', category: '', state: '', lga: '', city: '', bio: '', id_type: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [idPhoto, setIdPhoto] = useState(null);
  const [workPhotos, setWorkPhotos] = useState([]);
  const [showIdTypePicker, setShowIdTypePicker] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');

  function set(field) {
    return (val) => setForm((f) => ({ ...f, [field]: val }));
  }

  async function pickImage(setter, allowsMultiple = false) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: !allowsMultiple,
      quality: 0.75,
      base64: true,
      allowsMultipleSelection: allowsMultiple,
      selectionLimit: allowsMultiple ? MAX_PHOTOS - workPhotos.length : 1,
    });
    if (result.canceled) return;

    if (allowsMultiple) {
      const newPhotos = result.assets
        .slice(0, MAX_PHOTOS - workPhotos.length)
        .map((a) => `data:image/jpeg;base64,${a.base64}`);
      setWorkPhotos((prev) => [...prev, ...newPhotos].slice(0, MAX_PHOTOS));
    } else {
      const asset = result.assets[0];
      setter(`data:image/jpeg;base64,${asset.base64}`);
    }
  }

  function removeWorkPhoto(index) {
    setWorkPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function validate() {
    const { name, email, password, skill, state, id_type } = form;
    if (!name.trim() || !email.trim() || !password || !skill.trim() || !state.trim()) {
      setError('Please fill all required fields (name, email, password, skill, state).');
      return false;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return false;
    }
    if (!id_type) {
      setError('Please select your ID type.');
      return false;
    }
    if (!idPhoto) {
      setError('Please upload your ID photo for verification.');
      return false;
    }
    if (workPhotos.length < MIN_PHOTOS) {
      setError(`Please upload at least ${MIN_PHOTOS} work photos (you have ${workPhotos.length}).`);
      return false;
    }
    return true;
  }

  function handleSubmit() {
    setError('');
    if (!validate()) return;
    setShowTerms(true);
  }

  async function submitRegistration() {
    setShowTerms(false);
    setLoading(true);
    setProgress('Preparing your profile…');

    try {
      const payload = {
        ...form,
        id_photo: idPhoto,
        work_photos: workPhotos,
      };
      if (profilePhoto) payload.photo = profilePhoto;

      setProgress('Uploading your profile…');
      const { data } = await api.register(payload);

      if (!data.success) throw new Error(data.message || 'Registration failed.');

      setProgress('Account created!');
      await login(data.token, data.provider);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
      setLoading(false);
      setProgress('');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.logo}>HireLocal</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.copyBlock}>
            <Text style={styles.eyebrow}>Provider onboarding</Text>
            <Text style={styles.h1}>Create a profile clients can trust.</Text>
            <Text style={styles.copy}>
              Add your service details, location, and bio so nearby clients can find you quickly.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Provider Registration</Text>
            <Text style={styles.cardSub}>
              Registration requires {MIN_PHOTOS}–{MAX_PHOTOS} work photos and one verification ID photo.
            </Text>

            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {loading && (
              <View style={styles.progressBox}>
                <ActivityIndicator color={colors.brand} size="large" style={{ marginBottom: 10 }} />
                <Text style={styles.progressText}>{progress}</Text>
                <Text style={styles.progressNote}>Please wait — do not close this screen.</Text>
              </View>
            )}

            {/* Personal info */}
            <Field label="Full Name *" value={form.name} onChangeText={set('name')} placeholder="Your full name" />
            <Field label="Email Address *" value={form.email} onChangeText={set('email')} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
            <Field label="Phone Number" value={form.phone} onChangeText={set('phone')} placeholder="+234…" keyboardType="phone-pad" />
            <Field label="WhatsApp Number" value={form.whatsapp} onChangeText={set('whatsapp')} placeholder="+234…" keyboardType="phone-pad" />

            {/* Password */}
            <Text style={styles.label}>Password *</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[styles.input, { paddingRight: 60, marginBottom: 0 }]}
                placeholder="Min 6 characters"
                placeholderTextColor={colors.muted}
                value={form.password}
                onChangeText={set('password')}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.showBtn} onPress={() => setShowPassword((v) => !v)}>
                <Text style={styles.showBtnText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>

            {/* Work details */}
            <Field label="Skill *" value={form.skill} onChangeText={set('skill')} placeholder="Plumbing, Tailoring, Generator Repair…" />
            <Field label="Category" value={form.category} onChangeText={set('category')} placeholder="Home Repair, Beauty, Fashion, Cleaning…" />
            <Field label="State *" value={form.state} onChangeText={set('state')} placeholder="Lagos, Abuja…" />
            <Field label="LGA" value={form.lga} onChangeText={set('lga')} placeholder="Ikeja, Wuse…" />
            <Field label="City / Area" value={form.city} onChangeText={set('city')} placeholder="Your local area" />

            {/* Bio */}
            <Text style={styles.label}>Short Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your experience, specialty, and the jobs you handle best."
              placeholderTextColor={colors.muted}
              value={form.bio}
              onChangeText={set('bio')}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* ID Type picker */}
            <Text style={styles.label}>ID Type *</Text>
            <TouchableOpacity style={styles.picker} onPress={() => setShowIdTypePicker(true)}>
              <Text style={form.id_type ? styles.pickerValue : styles.pickerPlaceholder}>
                {form.id_type || 'Select an ID type'}
              </Text>
            </TouchableOpacity>

            {/* ID Photo */}
            <Text style={[styles.label, { marginTop: 14 }]}>ID Photo for Verification *</Text>
            <Text style={styles.helpText}>Upload a clear photo of your ID (required).</Text>
            <TouchableOpacity style={styles.uploadBtn} onPress={() => pickImage(setIdPhoto)}>
              <Text style={styles.uploadBtnText}>{idPhoto ? 'Replace ID Photo' : 'Choose ID Photo'}</Text>
            </TouchableOpacity>
            {idPhoto && (
              <Image source={{ uri: idPhoto }} style={styles.previewSingle} resizeMode="cover" />
            )}

            {/* Profile Picture */}
            <Text style={[styles.label, { marginTop: 14 }]}>Profile Picture</Text>
            <Text style={styles.helpText}>Appears on your public profile.</Text>
            <TouchableOpacity style={styles.uploadBtn} onPress={() => pickImage(setProfilePhoto)}>
              <Text style={styles.uploadBtnText}>{profilePhoto ? 'Replace Profile Picture' : 'Choose Profile Picture'}</Text>
            </TouchableOpacity>
            {profilePhoto && (
              <Image source={{ uri: profilePhoto }} style={styles.previewAvatar} resizeMode="cover" />
            )}

            {/* Work Photos */}
            <Text style={[styles.label, { marginTop: 14 }]}>
              Work Photos * ({workPhotos.length}/{MAX_PHOTOS})
            </Text>
            <Text style={styles.helpText}>
              Upload {MIN_PHOTOS}–{MAX_PHOTOS} photos of completed jobs.
            </Text>
            {workPhotos.length < MAX_PHOTOS && (
              <TouchableOpacity style={styles.uploadBtn} onPress={() => pickImage(null, true)}>
                <Text style={styles.uploadBtnText}>Add Work Photos</Text>
              </TouchableOpacity>
            )}
            <View style={styles.workGrid}>
              {workPhotos.map((uri, i) => (
                <View key={i} style={styles.workTile}>
                  <Image source={{ uri }} style={styles.workPhoto} resizeMode="cover" />
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeWorkPhoto(i)}>
                    <Text style={styles.removeBtnText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.btnText}>Create Account</Text>
            </TouchableOpacity>

            <Text style={styles.note}>
              Already registered?{' '}
              <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
                Login here
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ID Type Modal */}
      <Modal visible={showIdTypePicker} transparent animationType="slide" onRequestClose={() => setShowIdTypePicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowIdTypePicker(false)} activeOpacity={1}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select ID Type</Text>
            {ID_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={styles.modalOption}
                onPress={() => { set('id_type')(type); setShowIdTypePicker(false); }}
              >
                <Text style={[styles.modalOptionText, form.id_type === type && styles.modalOptionActive]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Terms Modal */}
      <Modal visible={showTerms} transparent animationType="slide" onRequestClose={() => setShowTerms(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.termsSheet}>
            <View style={styles.termsHeader}>
              <Text style={styles.termsTitle}>Terms of Service</Text>
              <Text style={styles.termsSub}>Last updated: April 2026 · Governed by Nigerian Law</Text>
            </View>
            <ScrollView style={styles.termsBody}>
              <Text style={styles.termsText}>
                By creating an account on HireLocal, you confirm you have read and agree to these Terms of Service.{'\n\n'}
                <Text style={styles.termsHeading}>1. What HireLocal Does{'\n'}</Text>
                HireLocal is a listing and discovery platform. We are not responsible for the quality, safety, or outcome of any service arranged through our platform.{'\n\n'}
                <Text style={styles.termsHeading}>2. Provider Responsibilities{'\n'}</Text>
                • Provide accurate and truthful profile information{'\n'}
                • Upload a valid government-issued ID for verification{'\n'}
                • Only list services you are genuinely qualified to provide{'\n'}
                • Respond to clients professionally{'\n\n'}
                <Text style={styles.termsHeading}>3. Subscription and Payments{'\n'}</Text>
                Every new provider gets 7 days free. After that, ₦1,000 every 14 days is required to keep your profile visible. Unpaid profiles are hidden but not deleted. Payments are processed by Korapay and are non-refundable.{'\n\n'}
                <Text style={styles.termsHeading}>4. Prohibited Use{'\n'}</Text>
                Fake profiles, illegal services, harassment, and dishonest ranking manipulation are prohibited.{'\n\n'}
                <Text style={styles.termsHeading}>5. Termination{'\n'}</Text>
                HireLocal can suspend or remove any account that violates these terms, without notice or refund.{'\n\n'}
                <Text style={styles.termsHeading}>6. Governing Law{'\n'}</Text>
                These terms are governed by the laws of the Federal Republic of Nigeria.{'\n\n'}
                Contact: hirelocal.ng@gmail.com
              </Text>
            </ScrollView>
            <View style={styles.termsFooter}>
              <Text style={styles.termsFootNote}>You must accept to create an account.</Text>
              <View style={styles.termsActions}>
                <TouchableOpacity style={styles.declineBtn} onPress={() => setShowTerms(false)}>
                  <Text style={styles.declineBtnText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.acceptBtn} onPress={submitRegistration}>
                  <Text style={styles.acceptBtnText}>Accept & Register</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, ...props }) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={colors.muted} {...props} />
    </>
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

  copyBlock: { marginBottom: 16 },
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
  cardSub: { fontSize: 13, color: colors.muted, marginBottom: 16, lineHeight: 19 },

  errorBox: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#c33',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  errorText: { color: '#c33', fontSize: 13, lineHeight: 18 },

  progressBox: {
    backgroundColor: 'rgba(15,118,110,0.06)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  progressText: { fontSize: 15, fontWeight: '700', color: colors.brand, marginBottom: 4 },
  progressNote: { fontSize: 12, color: colors.muted },

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
  textArea: { height: 100, paddingTop: 12 },

  passwordWrap: { position: 'relative', marginBottom: 14 },
  showBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  showBtnText: { fontSize: 13, fontWeight: '600', color: colors.muted },

  picker: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  pickerValue: { fontSize: 15, color: colors.text },
  pickerPlaceholder: { fontSize: 15, color: colors.muted },

  helpText: { fontSize: 12, color: colors.muted, marginBottom: 8 },

  uploadBtn: {
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadBtnText: { color: colors.brand, fontWeight: '600', fontSize: 14 },

  previewSingle: {
    width: '100%',
    height: 140,
    borderRadius: radius.sm,
    marginBottom: 10,
  },
  previewAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: colors.brand,
  },

  workGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  workTile: { width: '31%', aspectRatio: 1, position: 'relative' },
  workPhoto: { width: '100%', height: '100%', borderRadius: radius.sm },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { color: '#fff', fontSize: 16, lineHeight: 18 },

  btn: {
    backgroundColor: colors.brand,
    borderRadius: radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  note: { fontSize: 13, color: colors.muted, textAlign: 'center' },
  link: { color: colors.brand, fontWeight: '600' },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 34,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 14 },
  modalOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalOptionText: { fontSize: 15, color: colors.text },
  modalOptionActive: { color: colors.brand, fontWeight: '700' },

  termsSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  termsHeader: {
    backgroundColor: colors.surfaceDark,
    padding: 20,
  },
  termsTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  termsSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  termsBody: { padding: 20, maxHeight: 340 },
  termsText: { fontSize: 13, color: '#333', lineHeight: 22 },
  termsHeading: { fontWeight: '700', color: colors.brandDark },
  termsFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: '#fafafa',
  },
  termsFootNote: { fontSize: 12, color: colors.muted, marginBottom: 12 },
  termsActions: { flexDirection: 'row', gap: 10 },
  declineBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  declineBtnText: { fontWeight: '600', color: colors.muted },
  acceptBtn: {
    flex: 2,
    backgroundColor: colors.brand,
    borderRadius: radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  acceptBtnText: { fontWeight: '700', color: '#fff' },
});

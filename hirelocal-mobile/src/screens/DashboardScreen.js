import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Image,
  Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { colors, radius, shadow, fonts } from '../constants/theme';
import Avatar from '../components/Avatar';

const MIN_PHOTOS = 3;
const MAX_PHOTOS = 10;

export default function DashboardScreen({ navigation }) {
  const { provider, updateProvider, logout } = useAuth();

  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [workPhotos, setWorkPhotos] = useState([]);
  const [photosChanged, setPhotosChanged] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  useFocusEffect(
    useCallback(() => {
      if (provider) {
        setEditForm({
          phone: provider.phone || '',
          whatsapp: provider.whatsapp || '',
          skill: provider.skill || '',
          category: provider.category || '',
          state: provider.state || '',
          lga: provider.lga || '',
          city: provider.city || '',
          bio: provider.bio || '',
        });
        setWorkPhotos(Array.isArray(provider.work_photos) ? [...provider.work_photos] : []);
        setPhotosChanged(false);
      }
    }, [provider])
  );

  if (!provider) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const subscription = provider.subscription || {};

  function setField(field) {
    return (val) => setEditForm((f) => ({ ...f, [field]: val }));
  }

  async function pickProfilePhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled) {
      const uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setEditForm((f) => ({ ...f, _newPhoto: uri }));
    }
  }

  async function pickMoreWorkPhotos() {
    if (workPhotos.length >= MAX_PHOTOS) {
      Alert.alert('Limit reached', `You can have up to ${MAX_PHOTOS} work photos.`);
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - workPhotos.length,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled) {
      const newUris = result.assets
        .slice(0, MAX_PHOTOS - workPhotos.length)
        .map((a) => `data:image/jpeg;base64,${a.base64}`);
      setWorkPhotos((prev) => [...prev, ...newUris].slice(0, MAX_PHOTOS));
      setPhotosChanged(true);
    }
  }

  function removeWorkPhoto(index) {
    setWorkPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotosChanged(true);
  }

  async function handleSave() {
    if (!editForm.skill?.trim() || !editForm.state?.trim()) {
      setSaveMsg({ type: 'error', text: 'Skill and State are required.' });
      return;
    }
    if (photosChanged && (workPhotos.length < MIN_PHOTOS || workPhotos.length > MAX_PHOTOS)) {
      setSaveMsg({ type: 'error', text: `Please keep ${MIN_PHOTOS}–${MAX_PHOTOS} work photos.` });
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    try {
      const payload = { ...editForm };
      delete payload._newPhoto;
      if (editForm._newPhoto) payload.photo = editForm._newPhoto;
      if (photosChanged) payload.work_photos = workPhotos;

      const { data } = await api.updateMe(payload);
      if (data.success) {
        await updateProvider(data.provider);
        setSaveMsg({ type: 'success', text: 'Profile updated successfully!' });
        setPhotosChanged(false);
      } else {
        setSaveMsg({ type: 'error', text: data.message || 'Update failed.' });
      }
    } catch {
      setSaveMsg({ type: 'error', text: 'Unable to reach server. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleRenew() {
    setPaying(true);
    try {
      const redirectUrl = 'https://hirelocal.ng/dashboard.html';
      const { data } = await api.initializePayment(redirectUrl);
      if (data.success && data.payment?.checkoutUrl) {
        await Linking.openURL(data.payment.checkoutUrl);
      } else {
        Alert.alert('Payment Error', data.message || 'Could not initialize payment.');
      }
    } catch {
      Alert.alert('Payment Error', 'Unable to reach payment server. Please try again.');
    } finally {
      setPaying(false);
    }
  }

  function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  }

  const location = [provider.city, provider.lga, provider.state].filter(Boolean).join(', ');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.logo}>HireLocal</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutLink}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Provider dashboard</Text>
            <Text style={styles.h1}>Your business snapshot</Text>
          </View>
          <View style={[styles.chip, subscription.isActive ? styles.chipActive : styles.chipWarn]}>
            <Text style={[styles.chipText, subscription.isActive ? styles.chipTextActive : styles.chipTextWarn]}>
              {subscription.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* Stats strip */}
        <View style={styles.statsRow}>
          {[
            { label: 'Plan', value: provider.plan || 'Free' },
            { label: 'Verification', value: provider.verified ? 'Verified' : 'Pending', color: provider.verified ? colors.success : '#ed6c02' },
            { label: 'Views', value: String(provider.views || 0) },
            { label: 'Reviews', value: String(provider.review_count || 0) },
          ].map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={[styles.statValue, stat.color && { color: stat.color }]}>{stat.value}</Text>
            </View>
          ))}
        </View>

        {/* Profile summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profile Summary</Text>
          <View style={styles.profileRow}>
            <Avatar provider={provider} size={64} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.profileName}>{provider.name}</Text>
              <Text style={styles.profileSub}>{provider.skill || 'No skill set'}</Text>
              <Text style={styles.profileSub}>{location || 'No location set'}</Text>
            </View>
          </View>
          {!!provider.bio && <Text style={styles.profileBio}>{provider.bio}</Text>}
        </View>

        {/* Subscription card */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View>
              <Text style={styles.eyebrow}>Subscription</Text>
              <Text style={styles.cardTitle}>Visibility plan</Text>
            </View>
            <View style={[styles.chip, subscription.isActive ? styles.chipActive : styles.chipWarn]}>
              <Text style={[styles.chipText, subscription.isActive ? styles.chipTextActive : styles.chipTextWarn]}>
                {subscription.status || 'Expired'}
              </Text>
            </View>
          </View>
          <View style={styles.subMetaRow}>
            <View style={styles.subMeta}>
              <Text style={styles.statLabel}>Expiry Date</Text>
              <Text style={styles.statValue}>
                {subscription.expiryDate ? new Date(subscription.expiryDate).toLocaleDateString() : 'Not set'}
              </Text>
            </View>
            <View style={styles.subMeta}>
              <Text style={styles.statLabel}>Days Remaining</Text>
              <Text style={styles.statValue}>{subscription.daysRemaining || 0}</Text>
            </View>
          </View>
          <Text style={styles.subNote}>
            {subscription.isActive
              ? 'Your profile is visible to customers.'
              : 'Your profile is hidden. Renew to become visible again.'}
          </Text>
          <TouchableOpacity
            style={[styles.btn, paying && styles.btnDisabled]}
            onPress={handleRenew}
            disabled={paying}
          >
            {paying ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Renew Now — ₦1,000</Text>}
          </TouchableOpacity>
        </View>

        {/* Work photos gallery */}
        {(provider.work_photos || []).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.eyebrow}>Your work photos</Text>
            <Text style={styles.cardTitle}>Portfolio gallery</Text>
            <View style={styles.photoGrid}>
              {provider.work_photos.map((uri, i) => (
                <TouchableOpacity key={i} onPress={() => setLightbox(uri)} activeOpacity={0.85}>
                  <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Edit profile form */}
        {editForm && (
          <View style={styles.card}>
            <Text style={styles.eyebrow}>Update profile</Text>
            <Text style={styles.cardTitle}>Edit your listing</Text>

            {saveMsg && (
              <View style={[styles.msgBox, saveMsg.type === 'success' ? styles.msgSuccess : styles.msgError]}>
                <Text style={[styles.msgText, saveMsg.type === 'success' ? styles.msgTextSuccess : styles.msgTextError]}>
                  {saveMsg.text}
                </Text>
              </View>
            )}

            {/* Profile picture */}
            <TouchableOpacity style={styles.uploadBtn} onPress={pickProfilePhoto}>
              <Text style={styles.uploadBtnText}>
                {editForm._newPhoto ? 'Replace Profile Picture' : 'Change Profile Picture'}
              </Text>
            </TouchableOpacity>
            {editForm._newPhoto && (
              <Image source={{ uri: editForm._newPhoto }} style={styles.previewAvatar} resizeMode="cover" />
            )}

            <EditField label="Phone Number" value={editForm.phone} onChangeText={setField('phone')} keyboardType="phone-pad" />
            <EditField label="WhatsApp Number" value={editForm.whatsapp} onChangeText={setField('whatsapp')} keyboardType="phone-pad" />
            <EditField label="Skill *" value={editForm.skill} onChangeText={setField('skill')} />
            <EditField label="Category" value={editForm.category} onChangeText={setField('category')} />
            <EditField label="State *" value={editForm.state} onChangeText={setField('state')} />
            <EditField label="LGA" value={editForm.lga} onChangeText={setField('lga')} />
            <EditField label="City / Area" value={editForm.city} onChangeText={setField('city')} />

            <Text style={styles.editLabel}>Short Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editForm.bio}
              onChangeText={setField('bio')}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor={colors.muted}
            />

            {/* Work photos editor */}
            <Text style={[styles.editLabel, { marginTop: 4 }]}>
              Work Photos ({workPhotos.length}/{MAX_PHOTOS})
            </Text>
            {workPhotos.length < MAX_PHOTOS && (
              <TouchableOpacity style={styles.uploadBtn} onPress={pickMoreWorkPhotos}>
                <Text style={styles.uploadBtnText}>Add Work Photos</Text>
              </TouchableOpacity>
            )}
            <View style={styles.photoGrid}>
              {workPhotos.map((uri, i) => (
                <View key={i} style={styles.workTile}>
                  <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeWorkPhoto(i)}>
                    <Text style={styles.removeBtnText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.btn, saving && styles.btnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Growth checklist */}
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Growth checklist</Text>
          <Text style={styles.cardTitle}>How to improve your profile</Text>
          {[
            'Add a profile picture to build trust with clients.',
            'Write a strong bio that describes your best services.',
            'Use a clear phone number and WhatsApp contact.',
            'Upload 3–10 work photos to showcase your skills.',
            'Ask happy clients to leave reviews on your profile.',
          ].map((tip, i) => (
            <Text key={i} style={styles.tipText}>• {tip}</Text>
          ))}
        </View>
      </ScrollView>

      {/* Lightbox */}
      <Modal visible={!!lightbox} transparent animationType="fade" onRequestClose={() => setLightbox(null)}>
        <TouchableOpacity style={styles.lightboxOverlay} onPress={() => setLightbox(null)} activeOpacity={1}>
          {lightbox && (
            <Image source={{ uri: lightbox }} style={styles.lightboxImage} resizeMode="contain" />
          )}
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function EditField({ label, ...props }) {
  return (
    <>
      <Text style={styles.editLabel}>{label}</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    fontFamily: fonts.heading,
    letterSpacing: -0.5,
  },
  logoutLink: { color: 'rgba(255,255,255,0.75)', fontWeight: '600', fontSize: 14 },
  scroll: { padding: 16, backgroundColor: colors.bg },

  heroRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brandDark,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  h1: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    fontFamily: fonts.heading,
    lineHeight: 28,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  chipActive: { backgroundColor: 'rgba(33,115,95,0.14)' },
  chipWarn: { backgroundColor: 'rgba(237,108,2,0.12)' },
  chipText: { fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: colors.success },
  chipTextWarn: { color: '#ed6c02' },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: radius.md,
    padding: 12,
    ...shadow,
    alignItems: 'center',
  },
  statLabel: { fontSize: 10, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  statValue: { fontSize: 15, fontWeight: '800', color: colors.text },

  card: {
    backgroundColor: '#fff',
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 14,
    ...shadow,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 },

  profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  profileName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 2 },
  profileSub: { fontSize: 13, color: colors.muted },
  profileBio: { fontSize: 13, color: colors.muted, lineHeight: 19 },

  subMetaRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  subMeta: { flex: 1 },
  subNote: { fontSize: 13, color: colors.muted, marginBottom: 14 },

  btn: {
    backgroundColor: colors.brand,
    borderRadius: radius.full,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  photoThumb: { width: 90, height: 90, borderRadius: radius.sm },
  workTile: { position: 'relative' },
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

  msgBox: { borderLeftWidth: 4, borderRadius: 8, padding: 12, marginBottom: 12 },
  msgSuccess: { backgroundColor: '#e6f4ea', borderLeftColor: '#2e7d32' },
  msgError: { backgroundColor: '#ffebee', borderLeftColor: '#c33' },
  msgText: { fontSize: 13, lineHeight: 18 },
  msgTextSuccess: { color: '#2e7d32' },
  msgTextError: { color: '#c33' },

  uploadBtn: {
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: radius.sm,
    paddingVertical: 11,
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadBtnText: { color: colors.brand, fontWeight: '600', fontSize: 14 },

  previewAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: colors.brand,
  },

  editLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.text,
    backgroundColor: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
  },
  textArea: { height: 90, paddingTop: 11 },

  tipText: { fontSize: 13, color: colors.muted, lineHeight: 22 },

  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: { width: '100%', height: '80%' },
});

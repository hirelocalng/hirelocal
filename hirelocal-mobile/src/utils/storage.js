import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TOKEN: 'hirelocal_auth_token',
  PROVIDER: 'hirelocal_provider',
};

export const getToken = () => AsyncStorage.getItem(KEYS.TOKEN);

export const setToken = (token) => AsyncStorage.setItem(KEYS.TOKEN, token);

export const getProvider = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PROVIDER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setProvider = (provider) =>
  AsyncStorage.setItem(KEYS.PROVIDER, JSON.stringify(provider));

export const clearAuth = () =>
  AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.PROVIDER]);

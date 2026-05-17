import * as Location from 'expo-location';
import { Alert } from 'react-native';

export async function getNearbySearchParams() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Location Access Needed',
      'Please allow location access so HireLocal can find providers near you.',
      [{ text: 'OK' }]
    );
    return null;
  }

  let coords;
  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    coords = pos.coords;
  } catch {
    Alert.alert('Location Error', 'Unable to get your location. Please try again.');
    return null;
  }

  let state = '';
  let lga = '';
  try {
    const [place] = await Location.reverseGeocodeAsync({
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
    // expo-location returns region = state, subregion = LGA/district
    state = place?.region || place?.city || '';
    lga = place?.subregion || place?.district || '';
  } catch {
    // Reverse geocode failed — still do a location-based search with coords
  }

  return { state, lga };
}

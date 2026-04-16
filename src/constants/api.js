import { Platform } from 'react-native';

export const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
export const APIURL = `${BASE_URL}/api`;

// export const BASE_URL = 'https://backenddkgold.safprotech.com';
// export const APIURL = `${BASE_URL}/api`;

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Same live backend the web app talks to — no separate mobile API.
export const BASE_URL = 'https://backend-production-6f2b.up.railway.app/api';

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('vmg_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

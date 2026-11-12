import axios from 'axios';

export const API_BASE_URL = 'http://127.0.0.1:8000';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

export async function fetchSymptomList() {
  const { data } = await client.get('/symptoms');
  return data.symptoms;
}

export async function getReport(symptoms) {
  const { data } = await client.post('/report', { symptoms });
  return data;
}

export async function getPrediction(symptoms) {
  const { data } = await client.post('/predict', { symptoms });
  return data;
}

export async function getExplanation(symptoms) {
  const { data } = await client.post('/explain', { symptoms });
  return data;
}

export function isNetworkError(error) {
  return !error.response;
}
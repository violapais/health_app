import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';

import SymptomChecklist from '../components/SymptomChecklist';
import {
  fetchSymptomList,
  getReport,
  isNetworkError,
} from '../services/api';

export default function SymptomInputScreen({ navigation }) {
  const [symptoms, setSymptoms] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const loadSymptoms = useCallback(async () => {
    setLoadingList(true);
    setError(null);

    try {
      const list = await fetchSymptomList();
      setSymptoms(list);
    } catch (err) {
      setError(
        isNetworkError(err)
          ? 'Cannot reach the server. Check your connection and that the backend is running.'
          : 'Something went wrong loading symptoms.'
      );
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadSymptoms();
  }, [loadSymptoms]);

  const toggle = (symptom) => {
    setSelected((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom]
    );
  };

  const handleGetReport = async () => {
    if (selected.length === 0) {
      Alert.alert(
        'Select symptoms',
        'Please select at least one symptom to continue.'
      );
      return;
    }

    setSubmitting(true);

    try {
      const report = await getReport(selected);

      navigation.navigate('Report', {
        report,
        symptoms: selected,
      });
    } catch (err) {
      const message = isNetworkError(err)
        ? 'No connection to the server. Please check your internet and try again.'
        : 'The server had trouble generating your report. Please try again.';

      Alert.alert('Report failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingList) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0f766e" />

        <Text style={styles.loadingText}>
          Loading symptom list...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {error}
        </Text>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadSymptoms}
        >
          <Text style={styles.retryButtonText}>
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <Text style={styles.helper}>
        Select every symptom you're experiencing.
      </Text>

      <Text style={styles.selectedText}>
        Selected: {selected.length}
      </Text>

      <SymptomChecklist
        symptoms={symptoms}
        selected={selected}
        onToggle={toggle}
      />

      <TouchableOpacity
        style={[
          styles.cta,
          (submitting || selected.length === 0) &&
            styles.ctaDisabled,
        ]}
        onPress={handleGetReport}
        disabled={submitting || selected.length === 0}
      >
        {submitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.ctaText}>
            Get Report
          </Text>
        )}
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },

  loadingText: {
    marginTop: 12,
    color: '#334155',
    fontSize: 16,
    fontWeight: '600',
  },

  errorText: {
    textAlign: 'center',
    color: '#b91c1c',
    marginBottom: 16,
    fontSize: 16,
    fontWeight: '600',
  },

  retryButton: {
    backgroundColor: '#0f766e',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },

  retryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },

  helper: {
    color: '#1e293b',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },

  selectedText: {
    color: '#0f766e',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
  },

  cta: {
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },

  ctaDisabled: {
    backgroundColor: '#94a3b8',
  },

  ctaText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 17,
  },
});
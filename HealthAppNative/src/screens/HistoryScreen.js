import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const RISK_COLORS = { Low: '#16a34a', Medium: '#d97706', High: '#dc2626' };

export default function HistoryScreen({ navigation }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth().currentUser?.uid;
    if (!uid) { setLoading(false); return; }

    const unsubscribe = firestore()
      .collection('users').doc(uid).collection('reports')
      .orderBy('timestamp', 'desc')
      .onSnapshot((snapshot) => {
        setEntries(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }, () => setLoading(false));

    return unsubscribe;
  }, []);

  // Call this from ReportScreen after a successful /report call, e.g.:
  //   await saveReportToHistory(symptoms, report)
  // Included here for reference / reuse.

  if (loading) {
    return (
      <View style={styles.centered}><ActivityIndicator size="large" color="#0f766e" /></View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No past checks yet. Run a symptom check to see it here.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      data={entries}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Report', { report: item, symptoms: item.symptoms })}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.disease}>{item.disease}</Text>
            <Text style={styles.date}>
              {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleString() : ''}
            </Text>
          </View>
          <View style={[styles.riskDot, { backgroundColor: RISK_COLORS[item.risk_level] || '#94a3b8' }]} />
        </TouchableOpacity>
      )}
    />
  );
}


export async function saveReportToHistory(symptoms, report) {
  const user = auth().currentUser;

  console.log('Firebase current user:', user?.uid ?? 'NOT SIGNED IN');

  if (!user) {
    throw new Error('No Firebase user is signed in.');
  }

  try {
    const docRef = await firestore()
      .collection('users')
      .doc(user.uid)
      .collection('reports')
      .add({
        ...report,
        symptoms,
        timestamp: firestore.FieldValue.serverTimestamp(),
      });

    console.log('Report saved successfully. Document ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Firestore save error:', error.code, error.message);
    throw error;
  }
}


import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#000000" barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.logo}>✚</Text>
        <Text style={styles.appName}>Health Companion</Text>
        <Text style={styles.tagline}>
          Your health, your priority.
        </Text>
      </View>

      <View style={styles.welcomeSection}>
        <Text style={styles.welcome}>Welcome!</Text>
        <Text style={styles.description}>
          Take a step towards understanding your health.
          Check your symptoms and get helpful health insights.
        </Text>
      </View>

      <View style={styles.mainCard}>
        <Text style={styles.cardIcon}>🩺</Text>
        <Text style={styles.cardTitle}>Symptom Checker</Text>
        <Text style={styles.cardDescription}>
          Enter your symptoms and receive a health prediction
          with an explanation and recommended specialty.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('SymptomInput')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>
            Check My Symptoms  →
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Your health matters. Stay informed.
        </Text>
        <Text style={styles.disclaimer}>
          This app provides informational predictions and does not
          replace professional medical advice.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingHorizontal: 22,
    paddingTop: 30,
  },

  header: {
    alignItems: 'center',
    marginBottom: 35,
  },

  logo: {
    color: '#2DD4BF',
    fontSize: 42,
    fontWeight: 'bold',
    marginBottom: 5,
  },

  appName: {
    color: '#2DD4BF',
    fontSize: 25,
    fontWeight: '800',
  },

  tagline: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 6,
  },

  welcomeSection: {
    marginBottom: 25,
  },

  welcome: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '800',
    marginBottom: 10,
  },

  description: {
    color: '#94A3B8',
    fontSize: 15,
    lineHeight: 23,
  },

  mainCard: {
    backgroundColor: '#102C2B',
    borderRadius: 20,
    padding: 23,
    borderWidth: 1,
    borderColor: '#0F766E',
    marginBottom: 18,
  },

  cardIcon: {
    fontSize: 38,
    marginBottom: 14,
  },

  cardTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 10,
  },

  cardDescription: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 22,
  },

  primaryButton: {
    backgroundColor: '#0F766E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 15,
    padding: 17,
    borderWidth: 1,
    borderColor: '#334155',
  },

  historyIcon: {
    fontSize: 27,
    marginRight: 14,
  },

  historyTextContainer: {
    flex: 1,
  },

  historyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  historyDescription: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 5,
  },

  arrow: {
    color: '#2DD4BF',
    fontSize: 28,
    fontWeight: 'bold',
  },

  footer: {
    marginTop: 'auto',
    paddingVertical: 22,
    alignItems: 'center',
  },

  footerText: {
    color: '#2DD4BF',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },

  disclaimer: {
    color: '#64748B',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 16,
  },
});

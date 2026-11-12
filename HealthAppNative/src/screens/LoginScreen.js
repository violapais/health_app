
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const PASSWORD_RULES = [
  { label: '8+ characters', test: (p) => p.length >= 8 },
  { label: 'Uppercase (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { label: 'Lowercase (a-z)', test: (p) => /[a-z]/.test(p) },
  { label: 'Number (0-9)', test: (p) => /[0-9]/.test(p) },
  { label: 'Special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export default function LoginScreen({ navigation }) {
  const [isRegister, setIsRegister] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [showGenderOptions, setShowGenderOptions] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      Alert.alert('Missing information', 'Please enter an email and password.');
      return;
    }

    // Apply password complexity only during registration.
    if (isRegister) {
      const failedRule = PASSWORD_RULES.find(
        (rule) => !rule.test(password)
      );

      if (failedRule) {
        Alert.alert(
          'Weak password',
          `Your password must satisfy: ${failedRule.label}.`
        );
        return;
      }
    }

    if (isRegister && !name.trim()) {
      Alert.alert('Missing information', 'Please enter your full name.');
      return;
    }

    if (isRegister && !age.trim()) {
      Alert.alert('Missing information', 'Please enter your age.');
      return;
    }

    if (isRegister && !gender.trim()) {
      Alert.alert('Missing information', 'Please select your gender.');
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        const cred = await auth().createUserWithEmailAndPassword(
          cleanEmail,
          password
        );

        await firestore()
          .collection('users')
          .doc(cred.user.uid)
          .set({
            name: name.trim(),
            age: age ? Number(age) : null,
            gender: gender.trim(),
            email: cleanEmail,
            createdAt: firestore.FieldValue.serverTimestamp(),
          });

        Alert.alert(
          'Account created',
          'Your account has been created successfully.',
          [
            {
              text: 'OK',
              onPress: () => navigation.replace('Home'),
            },
          ]
        );
      } else {
        await auth().signInWithEmailAndPassword(cleanEmail, password);
        navigation.replace('Home');
      }
    } catch (err) {
      console.log('AUTH ERROR:', err);
      console.log('AUTH ERROR CODE:', err?.code);

      if (
        isRegister &&
        (
          err?.code === 'auth/email-already-in-use' ||
          err?.code === 'auth/credential-already-in-use'
        )
      ) {
        Alert.alert(
          'Email already registered',
          'This email already has a Firebase account. Please log in instead.',
          [
            {
              text: 'LOG IN',
              onPress: () => {
                setIsRegister(false);
                setPassword('');
              },
            },
            { text: 'OK', style: 'cancel' },
          ]
        );
      } else if (
        !isRegister &&
        (
          err?.code === 'auth/invalid-credential' ||
          err?.code === 'auth/wrong-password' ||
          err?.code === 'auth/user-not-found'
        )
      ) {
        Alert.alert(
          'Login failed',
          'Incorrect email or password. Please check your details.'
        );
      } else if (err?.code === 'auth/invalid-email') {
        Alert.alert('Invalid email', 'Please enter a valid email address.');
      } else if (err?.code === 'auth/weak-password') {
        Alert.alert(
          'Weak password',
          'Firebase requires a password of at least 6 characters.'
        );
      } else {
        Alert.alert(
          'Authentication error',
          err?.message || 'Something went wrong. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Symptom Checker</Text>

      <Text style={styles.subtitle}>
        {isRegister ? 'Create your account' : 'Welcome back'}
      </Text>

      {isRegister && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor="#94A3B8"
            value={name}
            onChangeText={setName}
            selectionColor="#2DD4BF"
            autoCapitalize="words"
          />

          {/* AGE AND GENDER */}
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.rowItem]}
              placeholder="Age"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              value={age}
              onChangeText={setAge}
              selectionColor="#2DD4BF"
            />

            <View style={[styles.genderContainer, styles.rowItem]}>
              <TouchableOpacity
                style={styles.genderDropdown}
                onPress={() => setShowGenderOptions(!showGenderOptions)}
                activeOpacity={0.8}
              >
                <Text
                  style={
                    gender
                      ? styles.genderSelected
                      : styles.genderPlaceholder
                  }
                  numberOfLines={1}
                >
                  {gender || 'Select Gender'}
                </Text>

                <Text style={styles.dropdownArrow}>
                  {showGenderOptions ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {showGenderOptions && (
                <View style={styles.genderOptions}>
                  {['Male', 'Female', 'Others'].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={styles.genderOption}
                      onPress={() => {
                        setGender(option);
                        setShowGenderOptions(false);
                      }}
                    >
                      <Text style={styles.genderOptionText}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </>
      )}

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#94A3B8"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        selectionColor="#2DD4BF"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#94A3B8"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        selectionColor="#2DD4BF"
      />

      {/* PASSWORD REQUIREMENTS */}
      {isRegister && (
        <View style={styles.passwordHintContainer}>
          <Text style={styles.passwordHintTitle}>
            Password requirements
          </Text>

          <View style={styles.passwordRules}>
            {PASSWORD_RULES.map((rule, index) => {
              const passed = rule.test(password);

              return (
                <View
                  key={index}
                  style={[
                    styles.passwordRule,
                    passed && password.length > 0
                      ? styles.passwordRulePassed
                      : null,
                  ]}
                >
                  <Text style={styles.passwordRuleIcon}>
                    {password.length > 0
                      ? passed ? '✓' : '○'
                      : '•'}
                  </Text>
                  <Text style={styles.passwordRuleText}>
                    {rule.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.buttonText}>
            {isRegister ? 'Register' : 'Log In'}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          setIsRegister(!isRegister);
          setPassword('');
          setShowGenderOptions(false);
        }}
        disabled={loading}
        activeOpacity={0.7}
      >
        <Text style={styles.switchText}>
          {isRegister
            ? 'Already have an account? Log in'
            : 'New here? Create an account'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#000000',
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#2DD4BF',
    textAlign: 'center',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 17,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 30,
  },

  input: {
    width: '100%',
    height: 58,
    backgroundColor: '#1E293B',
    color: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#475569',
    fontSize: 16,
    fontWeight: '600',
  },

  row: {
    flexDirection: 'row',
    gap: 12,
    zIndex: 10,
    elevation: 10,
  },

  rowItem: {
    flex: 1,
  },

  genderContainer: {
    position: 'relative',
    zIndex: 1000,
    elevation: 12,
    marginBottom: 14,
  },

  genderDropdown: {
    height: 58,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#475569',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  genderPlaceholder: {
    color: '#94A3B8',
    fontSize: 14,
    flexShrink: 1,
  },

  genderSelected: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },

  dropdownArrow: {
    color: '#2DD4BF',
    fontSize: 14,
    marginLeft: 4,
  },

  genderOptions: {
    position: 'absolute',
    top: 63,
    left: 0,
    right: 0,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#475569',
    zIndex: 1001,
    elevation: 16,
  },

  genderOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#475569',
  },

  genderOptionText: {
    color: '#FFFFFF',
    fontSize: 16,
  },

  passwordHintContainer: {
    marginTop: -4,
    marginBottom: 14,
  },

  passwordHintTitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },

  passwordRules: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },

  passwordRule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 8,
  },

  passwordRulePassed: {
    borderColor: '#0F766E',
    backgroundColor: '#123B3A',
  },

  passwordRuleIcon: {
    color: '#2DD4BF',
    fontSize: 13,
    fontWeight: '800',
    marginRight: 5,
  },

  passwordRuleText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },

  button: {
    width: '100%',
    height: 58,
    backgroundColor: '#0F766E',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 20,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  switchText: {
    color: '#2DD4BF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
});

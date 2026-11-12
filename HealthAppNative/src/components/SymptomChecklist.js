import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

const CATEGORY_KEYWORDS = {
  General: [
    'fatigue',
    'fever',
    'chills',
    'sweating',
    'weight',
    'lethargy',
    'malaise',
    'weakness',
    'dehydration',
    'appetite',
    'restlessness',
    'irritability',
    'lymph',
  ],

  Respiratory: [
    'cough',
    'breath',
    'phlegm',
    'throat',
    'nose',
    'congestion',
    'sinus',
    'sneez',
    'chest_pain',
    'sputum',
  ],

  Digestive: [
    'stomach',
    'acidity',
    'vomit',
    'indigestion',
    'constipation',
    'diarrhoea',
    'nausea',
    'abdominal',
    'belly',
    'gases',
    'itching_internal',
    'bleeding',
    'distension',
    'yellow',
    'urine',
  ],

  Skin: [
    'itching',
    'skin',
    'rash',
    'nodal',
    'dischromic',
    'pimples',
    'blackheads',
    'scurring',
    'peeling',
    'dusting',
    'nails',
    'blister',
    'nose',
    'crust',
    'bruising',
    'spots',
  ],

  Musculoskeletal: [
    'joint',
    'muscle',
    'back_pain',
    'neck',
    'knee',
    'hip',
    'swelling_joints',
    'stiffness',
    'painful_walking',
    'cramps',
  ],

  Neurological: [
    'headache',
    'dizziness',
    'balance',
    'unsteadiness',
    'spinning',
    'visual',
    'vision',
    'speech',
    'sensorium',
    'coma',
    'smell',
    'concentration',
    'depression',
    'anxiety',
    'mood',
  ],
};

function categorize(symptom) {
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => symptom.includes(keyword))) {
      return category;
    }
  }

  return 'Other';
}

function formatLabel(symptom) {
  return symptom
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SymptomChecklist({
  symptoms,
  selected,
  onToggle,
}) {
  const [query, setQuery] = useState('');

  const grouped = useMemo(() => {
    const searchText = query.trim().toLowerCase();

    const filtered = symptoms.filter((symptom) =>
      symptom.toLowerCase().includes(searchText)
    );

    const groups = {};

    filtered.forEach((symptom) => {
      const category = categorize(symptom);

      if (!groups[category]) {
        groups[category] = [];
      }

      groups[category].push(symptom);
    });

    return Object.entries(groups).sort(([a], [b]) =>
      a.localeCompare(b)
    );
  }, [symptoms, query]);

  return (
    <View style={styles.container}>

      {/* Search box */}
      <TextInput
        style={styles.search}
        placeholder="Search symptoms..."
        placeholderTextColor="#64748b"
        value={query}
        onChangeText={setQuery}
      />

      {/* Symptom list */}
      <FlatList
        data={grouped}
        keyExtractor={([category]) => category}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const [category, items] = item;

          return (
            <View style={styles.section}>

              <Text style={styles.sectionTitle}>
                {category}
              </Text>

              <View style={styles.chipWrap}>

                {items.map((symptom) => {
                  const active = selected.includes(symptom);

                  return (
                    <TouchableOpacity
                      key={symptom}
                      activeOpacity={0.7}
                      style={[
                        styles.chip,
                        active && styles.chipActive,
                      ]}
                      onPress={() => onToggle(symptom)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active && styles.chipTextActive,
                        ]}
                      >
                        {formatLabel(symptom)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

              </View>
            </View>
          );
        }}

        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No symptoms found
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
  },

  search: {
    height: 52,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,

    marginBottom: 12,

    borderWidth: 1,
    borderColor: '#cbd5e1',

    color: '#0f172a',
    fontSize: 16,
  },

  listContent: {
    paddingBottom: 120,
  },

  section: {
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',

    marginBottom: 10,

    textTransform: 'uppercase',
  },

  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,

    marginRight: 8,
    marginBottom: 8,

    borderRadius: 20,

    backgroundColor: '#ffffff',

    borderWidth: 1,
    borderColor: '#94a3b8',

    elevation: 1,
  },

  chipActive: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
  },

  chipText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },

  chipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },

  emptyText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
  },
});
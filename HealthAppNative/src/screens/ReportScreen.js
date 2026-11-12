
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const ConfidenceRing = ({ percentage }) => {
  const size = 150;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePercentage = Math.max(0, Math.min(100, percentage));
  const dashOffset =
    circumference - (safePercentage / 100) * circumference;

  return (
    <View style={styles.ringContainer}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#0f766e"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      <View style={styles.ringTextContainer}>
        <Text style={styles.ringPercentage}>
          {safePercentage.toFixed(1)}%
        </Text>
        <Text style={styles.ringLabel}>Confidence</Text>
      </View>
    </View>
  );
};

const formatLabel = (value) => {
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const ReportScreen = ({ route, navigation }) => {
  const report = route?.params?.report;
  const symptoms = route?.params?.symptoms ?? [];

  const savedRef = useRef(false);

  // Save the report once if the history service is available.
  useEffect(() => {
    if (!report || savedRef.current) return;

    savedRef.current = true;

    // Report display does not depend on saving history.
    // Existing history-saving code can remain separate.
  }, [report]);

  if (!report) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.title}>No report data received</Text>

        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.buttonText}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Prediction details from FastAPI.
  const disease = report.disease ?? 'Prediction unavailable';

  const rawConfidence = Number(report.confidence ?? 0);
  const confidence =
    rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence;

  // Risk assessment.
  const riskDetail = report.risk_detail ?? {};

  const riskLevel = String(
    report.risk_level ?? riskDetail.level ?? 'Not available'
  ).toUpperCase();

  const riskMessage =
    riskDetail.message ??
    riskDetail.detail ??
    'Please seek medical advice if your symptoms persist or worsen.';

  // AI-generated explanation of the prediction.
  const explanation =
    report.llm_explanation ??
    'No prediction explanation is available.';

  // Disease information from MedlinePlus.
  const diseaseInformation = report.disease_information ?? {};
  const diseaseMeaning = diseaseInformation.available
  ? String(diseaseInformation.summary || '')
      .split(/(?<=[.!?])\s+/)
      .slice(0, 6)
      .join(' ')
  : null;

  const diseaseSource =
    diseaseInformation.source ?? 'MedlinePlus';

  const diseaseSourceUrl =
    diseaseInformation.source_url ?? null;

  // Symptom contribution information.
  const contributors = Array.isArray(
    report.top_contributing_symptoms
  )
    ? report.top_contributing_symptoms
    : [];

  // Remove missing or invalid symptom names and values.
  const chartData = contributors
    .filter((item) => {
      if (!item || typeof item.symptom !== 'string') {
        return false;
      }

      const name = item.symptom.trim().toLowerCase();

      if (
        name === '' ||
        name === 'nan' ||
        name === 'n-a-n' ||
        item.shap_value === null ||
        item.shap_value === undefined
      ) {
        return false;
      }

      return Number.isFinite(Number(item.shap_value));
    })
    .map((item, index) => ({
      id: `${item.symptom}-${index}`,
      name: formatLabel(item.symptom.trim()),
      value: Number(item.shap_value) * 100,
    }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  const maxAbsValue = Math.max(
    0.000001,
    ...chartData.map((item) => Math.abs(item.value))
  );

  const goHome = () => navigation.navigate('Home');

  const openDiseaseSource = async () => {
    if (!diseaseSourceUrl) return;

    try {
      await Linking.openURL(diseaseSourceUrl);
    } catch (error) {
      console.warn('Could not open disease information source:', error);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Prediction Report</Text>

      {/* Predicted disease */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Predicted Disease</Text>

        <Text style={styles.diseaseName}>{disease}</Text>

        <Text style={styles.smallText}>
          This is a model prediction, not a confirmed diagnosis.
        </Text>
      </View>

      {/* Circular confidence percentage */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Prediction Confidence
        </Text>

        <ConfidenceRing percentage={confidence} />

        <Text style={styles.centerText}>
          This percentage represents the model's confidence in its
          prediction. It is not the probability that you have the disease.
        </Text>
      </View>

      {/* About the disease - MedlinePlus information */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>About the Disease</Text>

        {diseaseMeaning ? (
          <>
            <Text style={styles.bodyText}>
              {diseaseMeaning}
            </Text>

            <View style={styles.sourceContainer}>
              <Text style={styles.sourceLabel}>
                Medical information source:
              </Text>

              <Text style={styles.sourceText}>
                {diseaseSource}
              </Text>

              {diseaseSourceUrl ? (
                <TouchableOpacity
                  onPress={openDiseaseSource}
                  style={styles.sourceButton}
                >
                  <Text style={styles.sourceButtonText}>
                    Read more on MedlinePlus
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </>
        ) : (
          <Text style={styles.bodyText}>
            Verified disease information is currently unavailable
            for {disease}. Please consult a qualified healthcare
            professional for reliable information.
          </Text>
        )}
      </View>

      {/* Explanation of prediction */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          What This Prediction Means
        </Text>

        <Text style={styles.bodyText}>{explanation}</Text>
      </View>

      {/* Symptoms entered */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Your Reported Symptoms
        </Text>

        {symptoms.length > 0 ? (
          symptoms.map((symptom, index) => (
            <View
              key={`${symptom}-${index}`}
              style={styles.symptomItem}
            >
              <Text style={styles.symptomBullet}>•</Text>

              <Text style={styles.bodyText}>
                {formatLabel(symptom)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.bodyText}>
            No symptoms were provided.
          </Text>
        )}
      </View>

      {/* Symptom contribution chart */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Contributing Symptoms
        </Text>

        <Text style={styles.chartSubtitle}>
          How much each symptom contributes to the prediction (SHAP %).
        </Text>

        <View style={styles.legendRow}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: '#0f766e' },
            ]}
          />

          <Text style={styles.legendText}>
            Positive contribution
          </Text>

          <View
            style={[
              styles.legendDot,
              { backgroundColor: '#dc2626' },
            ]}
          />

          <Text style={styles.legendText}>
            Negative contribution
          </Text>
        </View>

        {chartData.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            nestedScrollEnabled
          >
            <View style={styles.chartContent}>
              {chartData.map((item) => {
                const barWidth =
                  (Math.abs(item.value) / maxAbsValue) * 140;

                const isPositive = item.value >= 0;

                return (
                  <View key={item.id} style={styles.chartRow}>
                    <Text style={styles.chartSymptom}>
                      {item.name}
                    </Text>

                    <View style={styles.barTrack}>
                      <View style={styles.zeroLine} />

                      <View
                        style={[
                          styles.bar,
                          {
                            width: barWidth,
                            left: isPositive
                              ? 150
                              : 150 - barWidth,
                            backgroundColor: isPositive
                              ? '#0f766e'
                              : '#dc2626',
                          },
                        ]}
                      />
                    </View>

                    <Text style={styles.chartValue}>
                      {item.value.toFixed(2)}%
                    </Text>
                  </View>
                );
              })}

              <View style={styles.axisRow}>
                <Text style={styles.axisText}>Negative</Text>
                <Text style={styles.axisText}>0</Text>
                <Text style={styles.axisText}>Positive</Text>
              </View>
            </View>
          </ScrollView>
        ) : (
          <Text style={styles.bodyText}>
            No valid symptom contribution data is available.
          </Text>
        )}

        <Text style={styles.chartNote}>
          Positive and negative values show how symptoms influence the
          model's prediction. A negative value does not automatically
          mean that a symptom is harmful or dangerous. SHAP values
          are contribution scores, not disease probabilities.
        </Text>
      </View>

      {/* Risk level */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Risk Assessment</Text>

        <Text
          style={[
            styles.riskLevel,
            riskLevel === 'HIGH'
              ? styles.highRisk
              : riskLevel === 'MEDIUM'
                ? styles.mediumRisk
                : styles.lowRisk,
          ]}
        >
          {riskLevel}
        </Text>

        <Text style={styles.bodyText}>{riskMessage}</Text>
      </View>

      {/* Medical recommendation */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Recommended Specialist
        </Text>

        <Text style={styles.bodyText}>
          {report.recommended_specialty ??
            'Consult a qualified healthcare professional.'}
        </Text>
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimerCard}>
        <Text style={styles.disclaimerTitle}>
          Medical Disclaimer
        </Text>

        <Text style={styles.disclaimerText}>
          This application provides an estimated prediction for
          informational purposes only. It cannot replace a medical
          examination or professional diagnosis. Please consult a
          qualified healthcare professional for medical advice.
          If you experience severe or rapidly worsening symptoms,
          seek urgent medical care.
        </Text>
      </View>

      {/* Home button */}
      <TouchableOpacity
        style={styles.homeButton}
        onPress={goHome}
      >
        <Text style={styles.buttonText}>Go to Home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  content: {
    padding: 16,
    paddingBottom: 35,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    padding: 20,
  },
  title: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 18,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
  },
  diseaseName: {
    fontSize: 23,
    fontWeight: 'bold',
    color: '#0f766e',
    marginBottom: 8,
  },
  smallText: {
    color: '#64748b',
    fontSize: 12,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#334155',
  },
  ringContainer: {
    width: 150,
    height: 150,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  ringTextContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringPercentage: {
    fontSize: 29,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  ringLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  centerText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 8,
  },
  sourceContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  sourceLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  sourceText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 10,
  },
  sourceButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0f2f1',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 7,
  },
  sourceButtonText: {
    color: '#0f766e',
    fontSize: 13,
    fontWeight: 'bold',
  },
  symptomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },
  symptomBullet: {
    fontSize: 20,
    color: '#0f766e',
    marginRight: 9,
  },
  chartSubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 14,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 14,
    gap: 6,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginLeft: 7,
  },
  legendText: {
    fontSize: 11,
    color: '#64748b',
  },
  chartContent: {
    width: 500,
    paddingVertical: 5,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 43,
    marginBottom: 8,
  },
  chartSymptom: {
    width: 115,
    fontSize: 12,
    color: '#334155',
    paddingRight: 8,
  },
  barTrack: {
    width: 300,
    height: 24,
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    position: 'relative',
    borderRadius: 4,
  },
  zeroLine: {
    position: 'absolute',
    left: 150,
    height: 24,
    width: 2,
    backgroundColor: '#64748b',
    zIndex: 2,
  },
  bar: {
    position: 'absolute',
    height: 15,
    borderRadius: 3,
  },
  chartValue: {
    width: 75,
    textAlign: 'right',
    fontSize: 11,
    color: '#475569',
    paddingLeft: 5,
  },
  axisRow: {
    width: 300,
    marginLeft: 115,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  axisText: {
    fontSize: 10,
    color: '#64748b',
  },
  chartNote: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 17,
    marginTop: 12,
  },
  riskLevel: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  highRisk: {
    color: '#dc2626',
  },
  mediumRisk: {
    color: '#d97706',
  },
  lowRisk: {
    color: '#0f766e',
  },
  disclaimerCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  disclaimerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#9a3412',
    marginBottom: 7,
  },
  disclaimerText: {
    color: '#7c2d12',
    fontSize: 12,
    lineHeight: 19,
  },
  homeButton: {
    backgroundColor: '#0f766e',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ReportScreen;
 
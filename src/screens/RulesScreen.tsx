import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../App';
import { PlatformSlider } from '../components/PlatformSlider';

type RulesNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Rules'>;

const COLORS = {
  background: '#f5f0eb',
  text: '#1c1c2e',
  textMuted: '#6a6880',
  accent: '#4060c8',
  accentDim: '#e2e8f8',
  panel: '#faf7f4',
  border: '#ccc4b8',
};

export default function RulesScreen() {
  const navigation = useNavigation<RulesNavigationProp>();
  const [sliderValue, setSliderValue] = useState(0.5);

  const shipsPerTurn = Math.round(20 * 1.0 * sliderValue * 10) / 10;
  const goldPerTurn = Math.round(20 * 50.0 * (1 - sliderValue) * 10) / 10;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>GAME RULES</Text>
          <Text style={styles.title}>How to{'\n'}Play</Text>
          <View style={styles.titleRule} />
          <Text style={styles.subtitle}>Master the rules of Gaza Galaxy and dominate the known universe.</Text>
        </View>

        {/* Objective */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Objective</Text>
          <Text style={styles.bodyText}>
            Capture all enemy home planets to eliminate them from the game. The last surviving player wins the galaxy.
          </Text>
        </View>

        {/* Elimination */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚔️ Elimination</Text>
          <Text style={styles.bodyText}>
            When a player's home planet is captured, that player is eliminated. All of their other planets become neutral (unowned) and available for capture by any remaining player.
          </Text>
        </View>

        {/* Turn Structure */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏱️ Turn Structure</Text>
          <Text style={styles.bodyText}>
            Gaza Galaxy is asynchronous. Each player takes their turn independently at their own pace. Only the active player may interact with the game state. Other players see only the last committed state, not in-progress changes.
          </Text>
        </View>

        {/* Planets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🪐 Planets</Text>
          <Text style={styles.bodyText}>
            Each planet has a random number of building slots where you can construct factories or research labs. Your planets generate ships and gold based on their class and your production preferences.
          </Text>
        </View>

        {/* Fog of War */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌫️ Fog of War</Text>
          <Text style={styles.bodyText}>
            You only see full details for planets you own. Neutral and enemy planets appear as dim blobs on the map—you can see their position, name, and class, but not troop counts, buildings, or production settings.
          </Text>
          <Text style={styles.bodyText}>
            Enemy fleets in transit are hidden. You only see your own ships moving across the galaxy. Scout by sending fleets to unexplored worlds and learn what you can from battle reports.
          </Text>
        </View>

        {/* Building Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏭 Building Types</Text>
          
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Research Lab</Text>
            <Text style={styles.bodyText}>
              Increases your tech level progression. Higher tech levels improve combat effectiveness. Research speed is NOT affected by planet class—all planets contribute equally to your research progress.
            </Text>
          </View>

          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Manufacturing Facility</Text>
            <Text style={styles.bodyText}>
              Produces ships and/or gold. You control the production split with an allocation slider—adjust it to balance military power (ships) with economic growth (gold). The amount produced depends on your planet's class.
            </Text>
          </View>

          <Text style={styles.sliderExampleTitle}>Production Slider Example</Text>
          <Text style={styles.sliderExampleSubtitle}>Class A Planet · 20 Factories</Text>

          <View style={styles.sliderExample}>
            <PlatformSlider
              minimumValue={0}
              maximumValue={1}
              value={sliderValue}
              onValueChange={setSliderValue}
              style={styles.platformSlider}
              minimumTrackTintColor={COLORS.accent}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.accent}
            />
            <Text style={styles.productionSplitLabel}>
              {Math.round(sliderValue * 100)}% troops / {100 - Math.round(sliderValue * 100)}% gold
            </Text>
            <Text style={styles.productionOutputLabel}>
              ⚔ {shipsPerTurn.toFixed(1)} troops/turn · 💰 {goldPerTurn.toFixed(1)} gold/turn
            </Text>
          </View>

          <Text style={styles.sliderCaption}>
            Adjust the slider to control the production split. At 50% allocation: 20 factories × 1.0 troops × 0.5 = 10 troops/turn and 20 factories × 50.0 gold × 0.5 = 500 gold/turn
          </Text>

          <Text style={styles.bodyText}>
            Each factory on a planet produces ships and gold based on your planet's class. The table below shows production per factory at 100% allocation toward that resource:
          </Text>

          <View style={styles.classTable}>
            <View style={styles.classHeaderRow}>
              <Text style={styles.classHeaderLabel}>Class</Text>
              <Text style={styles.classHeaderValue}>Troops/Turn</Text>
              <Text style={styles.classHeaderValue}>Gold/Turn</Text>
            </View>
            <View style={styles.classRow}>
              <Text style={styles.classLabel}>A</Text>
              <Text style={styles.classValue}>1.00</Text>
              <Text style={styles.classValue}>50.0</Text>
            </View>
            <View style={styles.classRow}>
              <Text style={styles.classLabel}>B</Text>
              <Text style={styles.classValue}>0.94</Text>
              <Text style={styles.classValue}>46.9</Text>
            </View>
            <View style={styles.classRow}>
              <Text style={styles.classLabel}>C</Text>
              <Text style={styles.classValue}>0.88</Text>
              <Text style={styles.classValue}>43.8</Text>
            </View>
            <View style={styles.classRow}>
              <Text style={styles.classLabel}>D</Text>
              <Text style={styles.classValue}>0.81</Text>
              <Text style={styles.classValue}>40.6</Text>
            </View>
            <View style={styles.classRow}>
              <Text style={styles.classLabel}>E</Text>
              <Text style={styles.classValue}>0.75</Text>
              <Text style={styles.classValue}>37.5</Text>
            </View>
            <View style={styles.classRow}>
              <Text style={styles.classLabel}>F</Text>
              <Text style={styles.classValue}>0.69</Text>
              <Text style={styles.classValue}>34.4</Text>
            </View>
            <View style={styles.classRow}>
              <Text style={styles.classLabel}>G</Text>
              <Text style={styles.classValue}>0.63</Text>
              <Text style={styles.classValue}>31.3</Text>
            </View>
            <View style={styles.classRow}>
              <Text style={styles.classLabel}>H</Text>
              <Text style={styles.classValue}>0.56</Text>
              <Text style={styles.classValue}>28.1</Text>
            </View>
            <View style={styles.classRow}>
              <Text style={styles.classLabel}>I</Text>
              <Text style={styles.classValue}>0.50</Text>
              <Text style={styles.classValue}>25.0</Text>
            </View>
            <View style={styles.classRow}>
              <Text style={styles.classLabel}>J</Text>
              <Text style={styles.classValue}>0.44</Text>
              <Text style={styles.classValue}>21.9</Text>
            </View>
            <View style={styles.classRow}>
              <Text style={styles.classLabel}>K</Text>
              <Text style={styles.classValue}>0.38</Text>
              <Text style={styles.classValue}>18.8</Text>
            </View>
            <View style={styles.classRow}>
              <Text style={styles.classLabel}>L</Text>
              <Text style={styles.classValue}>0.31</Text>
              <Text style={styles.classValue}>15.6</Text>
            </View>
            <View style={styles.classRow}>
              <Text style={styles.classLabel}>M</Text>
              <Text style={styles.classValue}>0.25</Text>
              <Text style={styles.classValue}>12.5</Text>
            </View>
            <View style={styles.classRow}>
              <Text style={styles.classLabel}>N</Text>
              <Text style={styles.classValue}>0.19</Text>
              <Text style={styles.classValue}>9.4</Text>
            </View>
            <View style={styles.classRow}>
              <Text style={styles.classLabel}>O</Text>
              <Text style={styles.classValue}>0.13</Text>
              <Text style={styles.classValue}>6.3</Text>
            </View>
            <View style={styles.classRow}>
              <Text style={styles.classLabel}>P</Text>
              <Text style={styles.classValue}>0.06</Text>
              <Text style={styles.classValue}>3.1</Text>
            </View>
          </View>

          <Text style={[styles.bodyText, styles.noteText]}>
            Example: A Class A planet with 1 factory set to 100% ship production generates 1.00 ship per turn. If split 50/50, it generates 0.5 ships and 25 gold per turn. A Class E planet at 100% ships generates 0.75 ships per turn.
          </Text>
        </View>

        {/* Fleet Movement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚀 Fleet Movement</Text>
          <Text style={styles.bodyText}>
            Dispatch fleets from one planet to another across the galaxy. Transit time is measured in turns and depends on the distance between planets.
          </Text>
          <Text style={styles.bodyText}>
            On arrival, your fleet will:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>• Capture a neutral planet immediately</Text>
            <Text style={styles.bulletPoint}>• Engage an enemy planet in battle</Text>
          </View>
        </View>

        {/* Combat */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Combat</Text>
          <Text style={styles.bodyText}>
            Combat is automatic—you don't make decisions during battle. The outcome is determined by:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>• Ship counts (attacking vs. defending)</Text>
            <Text style={styles.bulletPoint}>• Tech levels of both players</Text>
            <Text style={styles.bulletPoint}>• Random variance (adds unpredictability)</Text>
          </View>
          <Text style={styles.bodyText}>
            At equal tech levels, the side with more ships has a higher chance of winning. Tech advantage increases your odds—each tech level difference improves your win probability in each individual engagement.
          </Text>
        </View>

        {/* Strategy Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Strategy Tips</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>• Secure nearby neutral planets early to build your economy</Text>
            <Text style={styles.bulletPoint}>• Balance ship production with research to gain tech advantages</Text>
            <Text style={styles.bulletPoint}>• Defend your home planet—losing it means elimination</Text>
            <Text style={styles.bulletPoint}>• Scout the map to find high-class planets worth targeting</Text>
            <Text style={styles.bulletPoint}>• Consider the time cost of long-range attacks vs. nearby expansion</Text>
          </View>
        </View>

        {/* Victory Conditions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏆 Victory</Text>
          <Text style={styles.bodyText}>
            The last player with an uncaptured home planet wins the game and claims victory over the galaxy. All other players are eliminated through the capture of their home worlds.
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  backButton: {
    marginTop: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingRight: 12,
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  backButtonText: {
    color: COLORS.accent,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  header: {
    marginTop: 16,
    marginBottom: 32,
  },
  eyebrow: {
    color: COLORS.accent,
    fontSize: 11,
    letterSpacing: 4,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  title: {
    color: COLORS.text,
    fontSize: 40,
    fontWeight: '200',
    letterSpacing: 6,
    lineHeight: 48,
  },
  titleRule: {
    width: 48,
    height: 2,
    backgroundColor: COLORS.accent,
    marginTop: 16,
    marginBottom: 12,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  bodyText: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  noteText: {
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginTop: 8,
  },
  subsection: {
    marginTop: 16,
  },
  subsectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  bulletList: {
    marginVertical: 8,
    paddingLeft: 8,
  },
  bulletPoint: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  classTable: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 12,
  },
  classHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
    backgroundColor: COLORS.accentDim,
  },
  classHeaderLabel: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  classHeaderValue: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  classRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  classLabel: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  classValue: {
    color: COLORS.textMuted,
    fontSize: 13,
    letterSpacing: 0.3,
    flex: 1,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 20,
  },
  sliderExampleTitle: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
    marginTop: 12,
  },
  sliderExampleSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  sliderExample: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 14,
    marginVertical: 12,
  },
  platformSlider: {
    height: 40,
    marginTop: 4,
  },
  productionSplitLabel: {
    color: COLORS.text,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  productionOutputLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  sliderCaption: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.3,
    fontStyle: 'italic',
    marginTop: 8,
  },
});

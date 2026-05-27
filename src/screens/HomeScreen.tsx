import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../App';
import { useGameStore } from '../store/gameStore';

type MapSize = 'small' | 'medium' | 'large';

const MAP_PRESETS: Record<
  MapSize,
  { label: string; detail: string; width: number; height: number; planetCount: number }
> = {
  small: { label: 'Small', detail: '20 × 20 · 24 worlds', width: 20, height: 20, planetCount: 24 },
  medium: { label: 'Medium', detail: '30 × 30 · 40 worlds', width: 30, height: 30, planetCount: 40 },
  large: { label: 'Large', detail: '40 × 40 · 60 worlds', width: 40, height: 40, planetCount: 60 },
};

const COLORS = {
  background: '#0a0a1a',
  text: '#e0e0f0',
  textMuted: '#8888aa',
  accent: '#4a9eff',
  accentDim: '#1a3a6a',
  panel: '#12122a',
  border: '#2a2a4a',
};

type HomeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavigationProp>();
  const startNewGame = useGameStore((s) => s.startNewGame);

  const [playerName, setPlayerName] = useState('Commander');
  const [aiCount, setAiCount] = useState(1);
  const [seedText, setSeedText] = useState(() => String(Date.now() % 99999));
  const [mapSize, setMapSize] = useState<MapSize>('medium');

  const adjustAiCount = (delta: number) => {
    setAiCount((prev) => Math.min(3, Math.max(1, prev + delta)));
  };

  const handleLaunch = () => {
    const preset = MAP_PRESETS[mapSize];
    const parsedSeed = parseInt(seedText, 10);
    const seed = Number.isFinite(parsedSeed) ? parsedSeed : Date.now() % 99999;

    startNewGame({
      playerName: playerName.trim() || 'Commander',
      aiCount,
      seed,
      mapWidth: preset.width,
      mapHeight: preset.height,
      planetCount: preset.planetCount,
    });
    navigation.navigate('Game');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>PRIVATE REMAKE · TURN-BASED</Text>
          <Text style={styles.title}>Strategic{'\n'}Commander</Text>
          <View style={styles.titleRule} />
          <Text style={styles.subtitle}>Configure your campaign before entering the galaxy.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Your name</Text>
          <TextInput
            style={styles.input}
            value={playerName}
            onChangeText={setPlayerName}
            placeholder="Commander"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>AI opponents</Text>
          <View style={styles.stepperRow}>
            <Pressable
              style={({ pressed }) => [styles.stepperButton, pressed && styles.stepperPressed]}
              onPress={() => adjustAiCount(-1)}
              disabled={aiCount <= 1}
            >
              <Text style={[styles.stepperSymbol, aiCount <= 1 && styles.stepperDisabled]}>−</Text>
            </Pressable>
            <View style={styles.stepperValueBox}>
              <Text style={styles.stepperValue}>{aiCount}</Text>
              <Text style={styles.stepperHint}>admirals</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.stepperButton, pressed && styles.stepperPressed]}
              onPress={() => adjustAiCount(1)}
              disabled={aiCount >= 3}
            >
              <Text style={[styles.stepperSymbol, aiCount >= 3 && styles.stepperDisabled]}>+</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Map seed</Text>
          <TextInput
            style={styles.input}
            value={seedText}
            onChangeText={setSeedText}
            keyboardType="number-pad"
            placeholder="Galaxy seed"
            placeholderTextColor={COLORS.textMuted}
          />
          <Text style={styles.hint}>Same seed yields the same star chart.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Map size</Text>
          <View style={styles.mapSizeRow}>
            {(Object.keys(MAP_PRESETS) as MapSize[]).map((size) => {
              const preset = MAP_PRESETS[size];
              const selected = mapSize === size;
              return (
                <Pressable
                  key={size}
                  style={({ pressed }) => [
                    styles.mapSizeButton,
                    selected && styles.mapSizeButtonSelected,
                    pressed && !selected && styles.mapSizeButtonPressed,
                  ]}
                  onPress={() => setMapSize(size)}
                >
                  <Text style={[styles.mapSizeLabel, selected && styles.mapSizeLabelSelected]}>
                    {preset.label}
                  </Text>
                  <Text style={[styles.mapSizeDetail, selected && styles.mapSizeDetailSelected]}>
                    {preset.detail}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.launchButton, pressed && styles.launchButtonPressed]}
          onPress={handleLaunch}
        >
          <Text style={styles.launchButtonText}>Launch Game</Text>
        </Pressable>
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
  header: {
    marginTop: 16,
    marginBottom: 32,
  },
  eyebrow: {
    color: COLORS.accent,
    fontSize: 11,
    letterSpacing: 4,
    marginBottom: 12,
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
    marginBottom: 24,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  input: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    color: COLORS.text,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    letterSpacing: 0.5,
  },
  hint: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperPressed: {
    backgroundColor: COLORS.accentDim,
  },
  stepperSymbol: {
    color: COLORS.accent,
    fontSize: 24,
    lineHeight: 28,
  },
  stepperDisabled: {
    color: COLORS.border,
  },
  stepperValueBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: COLORS.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepperValue: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: 2,
  },
  stepperHint: {
    color: COLORS.textMuted,
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 2,
  },
  mapSizeRow: {
    gap: 10,
  },
  mapSizeButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mapSizeButtonSelected: {
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accent,
  },
  mapSizeButtonPressed: {
    borderColor: COLORS.textMuted,
  },
  mapSizeLabel: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 1,
  },
  mapSizeLabelSelected: {
    color: COLORS.accent,
  },
  mapSizeDetail: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  mapSizeDetailSelected: {
    color: COLORS.text,
  },
  launchButton: {
    marginTop: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  launchButtonPressed: {
    opacity: 0.85,
  },
  launchButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});

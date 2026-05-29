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
import type { AiDifficulty } from '../game/aiEngine';
import type { MapSize } from '../game/types';
import { useGameStore, type GameRecord, type PlayerSlot } from '../store/gameStore';

const MAP_SIZE_CONFIG = {
  small: { base: 20, perExtra: 10 },
  medium: { base: 30, perExtra: 15 },
  large: { base: 35, perExtra: 25 },
} as const;

function computeMapDimensions(mapSize: MapSize, playerCount: number) {
  const { base, perExtra } = MAP_SIZE_CONFIG[mapSize];
  const planetCount = base + (playerCount - 2) * perExtra;
  const gridSide = Math.ceil(Math.sqrt(planetCount * 90));
  return { planetCount, width: gridSide, height: gridSide };
}

const MAP_SIZE_LABELS: Record<MapSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

const DEFAULT_PLAYER_SLOTS: PlayerSlot[] = [
  { type: 'human', name: 'Commander' },
  { type: 'ai', difficulty: 'normal' },
];

const BG_COLOR = '#f5f0eb';

const COLORS = {
  background: '#f5f0eb',
  text: '#1c1c2e',
  textMuted: '#6a6880',
  accent: '#4060c8',
  accentDim: '#e2e8f8',
  panel: '#faf7f4',
  border: '#ccc4b8',
};

type HomeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

function GameCard({
  record,
  onPress,
}: {
  record: GameRecord;
  onPress: () => void;
}) {
  const { state } = record;
  const humanPlayer = state.players.find((p) => !p.isAI);
  const humanId = humanPlayer?.id;
  const isHumanTurn =
    humanId !== undefined && state.currentPlayerId === humanId && state.status === 'active';
  const currentPlayer = state.players.find((p) => p.id === state.currentPlayerId);
  const playerNames = state.players.map((p) => p.name).join(' · ');

  let outcomeLabel: string | null = null;
  if (state.status === 'finished' && humanId !== undefined) {
    outcomeLabel = state.winnerId === humanId ? 'VICTORY' : 'DEFEAT';
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.gameCard, pressed && styles.gameCardPressed]}
      onPress={onPress}
    >
      <Text style={styles.gameCardName}>{record.name}</Text>
      <Text style={styles.gameCardPlayers}>{playerNames}</Text>
      <View style={styles.gameCardFooter}>
        {state.status === 'active' && currentPlayer !== undefined && (
          <Text style={styles.gameCardTurn}>
            {currentPlayer.name}
            {isHumanTurn && <Text style={styles.yourTurnBadge}> · YOUR TURN</Text>}
          </Text>
        )}
        {outcomeLabel !== null && (
          <Text style={styles.gameCardOutcome}>{outcomeLabel}</Text>
        )}
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavigationProp>();
  const games = useGameStore((s) => s.games);
  const startNewGame = useGameStore((s) => s.startNewGame);
  const loadGame = useGameStore((s) => s.loadGame);

  const [isCreating, setIsCreating] = useState(false);
  const [playerSlots, setPlayerSlots] = useState<PlayerSlot[]>(DEFAULT_PLAYER_SLOTS);
  const [playMode, setPlayMode] = useState<'passAndPlay' | 'asyncMultiplayer'>('passAndPlay');
  const [mapSize, setMapSize] = useState<MapSize>('medium');

  const addPlayerSlot = () => {
    setPlayerSlots((prev) =>
      prev.length >= 8 ? prev : [...prev, { type: 'ai', difficulty: 'normal' }],
    );
  };

  const removeLastSlot = () => {
    setPlayerSlots((prev) => (prev.length <= 2 ? prev : prev.slice(0, -1)));
  };

  const setSlotType = (index: number, type: 'human' | 'ai') => {
    setPlayerSlots((prev) =>
      prev.map((slot, i) => {
        if (i !== index) return slot;
        if (type === 'human') {
          return { type: 'human', name: slot.name };
        }
        return { type: 'ai', difficulty: slot.difficulty ?? 'normal' };
      }),
    );
  };

  const setSlotName = (index: number, name: string) => {
    setPlayerSlots((prev) =>
      prev.map((slot, i) =>
        i === index && slot.type === 'human' ? { ...slot, name } : slot,
      ),
    );
  };

  const setSlotDifficulty = (index: number, difficulty: AiDifficulty) => {
    setPlayerSlots((prev) =>
      prev.map((slot, i) => (i === index ? { type: 'ai', difficulty } : slot)),
    );
  };

  const handleLaunch = () => {
    const { width, height, planetCount } = computeMapDimensions(mapSize, playerSlots.length);

    startNewGame({
      playerName: (playerSlots[0]?.name ?? '').trim() || 'Commander',
      playerSlots,
      mapSize,
      mapWidth: width,
      mapHeight: height,
      planetCount,
      playMode,
    });
    navigation.navigate('Game');
  };

  const handleResume = (id: string) => {
    loadGame(id);
    navigation.navigate('Game');
  };

  if (isCreating) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
            onPress={() => setIsCreating(false)}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.eyebrow}>NEW CAMPAIGN</Text>
            <Text style={styles.title}>Launch{'\n'}Campaign</Text>
            <View style={styles.titleRule} />
            <Text style={styles.subtitle}>Configure your campaign before entering the galaxy.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Players ({playerSlots.length})</Text>
            <View style={styles.slotList}>
              {playerSlots.map((slot, index) => (
                <View key={index} style={styles.slotRow}>
                  <View style={styles.slotHeader}>
                    <Text style={styles.slotNumber}>Slot {index + 1}</Text>
                    {index === 0 ? (
                      <Text style={styles.slotLabel}>You · Human</Text>
                    ) : (
                      <View style={styles.slotTypeToggle}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.slotTypeChip,
                            slot.type === 'human' && styles.slotTypeChipSelected,
                            pressed && slot.type !== 'human' && styles.slotTypeChipPressed,
                          ]}
                          onPress={() => setSlotType(index, 'human')}
                        >
                          <Text
                            style={[
                              styles.slotTypeChipText,
                              slot.type === 'human' && styles.slotTypeChipTextSelected,
                            ]}
                          >
                            Human
                          </Text>
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [
                            styles.slotTypeChip,
                            slot.type === 'ai' && styles.slotTypeChipSelected,
                            pressed && slot.type !== 'ai' && styles.slotTypeChipPressed,
                          ]}
                          onPress={() => setSlotType(index, 'ai')}
                        >
                          <Text
                            style={[
                              styles.slotTypeChipText,
                              slot.type === 'ai' && styles.slotTypeChipTextSelected,
                            ]}
                          >
                            AI
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                  {slot.type === 'human' && (
                    <TextInput
                      style={styles.slotNameInput}
                      placeholder="Player name"
                      placeholderTextColor={COLORS.textMuted}
                      value={slot.name ?? ''}
                      onChangeText={(text) => setSlotName(index, text)}
                      autoCapitalize="words"
                      autoCorrect={false}
                      multiline={false}
                    />
                  )}
                  {slot.type === 'ai' && (
                    <View style={styles.difficultyRow}>
                      <Text style={styles.difficultyLabel}>Difficulty</Text>
                      <View style={styles.difficultyToggle}>
                        {(['easy', 'normal', 'hard'] as const).map((level) => (
                          <Pressable
                            key={level}
                            style={({ pressed }) => [
                              styles.difficultyChip,
                              (slot.difficulty ?? 'normal') === level &&
                                styles.difficultyChipSelected,
                              pressed &&
                                (slot.difficulty ?? 'normal') !== level &&
                                styles.difficultyChipPressed,
                            ]}
                            onPress={() => setSlotDifficulty(index, level)}
                          >
                            <Text
                              style={[
                                styles.difficultyChipText,
                                (slot.difficulty ?? 'normal') === level &&
                                  styles.difficultyChipTextSelected,
                              ]}
                            >
                              {level === 'easy' ? 'Easy' : level === 'normal' ? 'Normal' : 'Hard'}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
            <View style={styles.slotActionsRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.addPlayerButton,
                  pressed && styles.addPlayerButtonPressed,
                  playerSlots.length >= 8 && styles.addPlayerButtonDisabled,
                ]}
                onPress={addPlayerSlot}
                disabled={playerSlots.length >= 8}
              >
                <Text
                  style={[
                    styles.addPlayerButtonText,
                    playerSlots.length >= 8 && styles.addPlayerButtonTextDisabled,
                  ]}
                >
                  Add Player
                </Text>
              </Pressable>
              {playerSlots.length > 2 && (
                <Pressable
                  style={({ pressed }) => [
                    styles.removePlayerButton,
                    pressed && styles.removePlayerButtonPressed,
                  ]}
                  onPress={removeLastSlot}
                >
                  <Text style={styles.removePlayerButtonText}>Remove</Text>
                </Pressable>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Play mode</Text>
            <View style={styles.playModeRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.playModeCard,
                  playMode === 'passAndPlay' && styles.playModeCardSelected,
                  pressed && playMode !== 'passAndPlay' && styles.playModeCardPressed,
                ]}
                onPress={() => setPlayMode('passAndPlay')}
              >
                <Text
                  style={[
                    styles.playModeTitle,
                    playMode === 'passAndPlay' && styles.playModeTitleSelected,
                  ]}
                >
                  Pass & Play
                </Text>
                <Text
                  style={[
                    styles.playModeSubtitle,
                    playMode === 'passAndPlay' && styles.playModeSubtitleSelected,
                  ]}
                >
                  Share one device
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.playModeCard,
                  styles.playModeCardComingSoon,
                  playMode === 'asyncMultiplayer' && styles.playModeCardSelected,
                  pressed && playMode !== 'asyncMultiplayer' && styles.playModeCardPressed,
                ]}
                onPress={() => setPlayMode('asyncMultiplayer')}
              >
                <Text
                  style={[
                    styles.playModeTitle,
                    styles.playModeTitleComingSoon,
                    playMode === 'asyncMultiplayer' && styles.playModeTitleSelected,
                  ]}
                >
                  Async Multiplayer
                </Text>
                <Text style={[styles.playModeSubtitle, styles.playModeSubtitleComingSoon]}>
                  Separate devices (coming soon)
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Map size</Text>
            <View style={styles.mapSizeRow}>
              {(Object.keys(MAP_SIZE_CONFIG) as MapSize[]).map((size) => {
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
                      {MAP_SIZE_LABELS[size]}
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
            <Text style={styles.launchButtonText}>Launch Campaign</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.lobbyContainer}>
        <ScrollView
          contentContainerStyle={styles.lobbyScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.eyebrow}>STRATEGIC COMMANDER</Text>
            <Text style={styles.title}>Command{'\n'}Center</Text>
            <View style={styles.titleRule} />
            <Text style={styles.subtitle}>Select a campaign or launch a new one.</Text>
          </View>

          {games.length === 0 ? (
            <Text style={styles.emptyMessage}>No active campaigns.{'\n'}Start a new one below.</Text>
          ) : (
            <View style={styles.gameList}>
              {games.map((record) => (
                <GameCard
                  key={record.id}
                  record={record}
                  onPress={() => handleResume(record.id)}
                />
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.lobbyFooter}>
          <Pressable
            style={({ pressed }) => [styles.newCampaignButton, pressed && styles.launchButtonPressed]}
            onPress={() => setIsCreating(true)}
          >
            <Text style={styles.launchButtonText}>New Campaign</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  lobbyContainer: {
    flex: 1,
  },
  lobbyScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  lobbyFooter: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 8,
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
  emptyMessage: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 48,
    letterSpacing: 0.5,
  },
  gameList: {
    gap: 12,
  },
  gameCard: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 16,
  },
  gameCardPressed: {
    borderColor: COLORS.accent,
  },
  gameCardName: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  gameCardPlayers: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  gameCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  gameCardTurn: {
    color: COLORS.text,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  yourTurnBadge: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  gameCardOutcome: {
    color: COLORS.textMuted,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
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
  slotList: {
    gap: 10,
  },
  slotRow: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  slotNumber: {
    color: COLORS.textMuted,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  slotLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  slotTypeToggle: {
    flexDirection: 'row',
    gap: 6,
  },
  slotTypeChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  slotTypeChipSelected: {
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accent,
  },
  slotTypeChipPressed: {
    borderColor: COLORS.textMuted,
  },
  slotTypeChipText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  slotTypeChipTextSelected: {
    color: COLORS.accent,
  },
  slotNameInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    color: COLORS.text,
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    letterSpacing: 0.3,
  },
  difficultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  difficultyLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  difficultyToggle: {
    flexDirection: 'row',
    gap: 6,
  },
  difficultyChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  difficultyChipSelected: {
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accent,
  },
  difficultyChipPressed: {
    borderColor: COLORS.textMuted,
  },
  difficultyChipText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  difficultyChipTextSelected: {
    color: COLORS.accent,
  },
  slotActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  addPlayerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.accent,
    alignItems: 'center',
  },
  addPlayerButtonPressed: {
    backgroundColor: COLORS.accentDim,
  },
  addPlayerButtonDisabled: {
    borderColor: COLORS.border,
    opacity: 0.5,
  },
  addPlayerButtonText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
  },
  addPlayerButtonTextDisabled: {
    color: COLORS.border,
  },
  removePlayerButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  removePlayerButtonPressed: {
    borderColor: COLORS.textMuted,
  },
  removePlayerButtonText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  playModeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  playModeCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  playModeCardComingSoon: {
    opacity: 0.65,
  },
  playModeCardSelected: {
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accent,
    opacity: 1,
  },
  playModeCardPressed: {
    borderColor: COLORS.textMuted,
  },
  playModeTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  playModeTitleComingSoon: {
    color: COLORS.textMuted,
  },
  playModeTitleSelected: {
    color: COLORS.accent,
  },
  playModeSubtitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 6,
    lineHeight: 15,
    letterSpacing: 0.3,
  },
  playModeSubtitleComingSoon: {
    color: COLORS.border,
  },
  playModeSubtitleSelected: {
    color: COLORS.text,
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
  newCampaignButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
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

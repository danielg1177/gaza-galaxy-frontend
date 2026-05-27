import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../App';
import { computeTurnsInTransit } from '../game/movementEngine';
import type { Fleet, OwnerId, Planet, Player } from '../game/types';
import { useGameStore } from '../store/gameStore';

type GameNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Game'>;

const CELL_SIZE = 18;
const PLANET_SIZE = 14;
const PLANET_SIZE_SELECTED = 16;
const HUMAN_COLOR = '#4a9eff';
const NEUTRAL_COLOR = '#444466';
const AI_COLORS = ['#ff4a4a', '#4aff7a', '#ff9e4a', '#c04aff'] as const;

const COLORS = {
  background: '#0a0a1a',
  text: '#e0e0f0',
  textMuted: '#8888aa',
  accent: '#4a9eff',
  panel: '#12122a',
  border: '#2a2a4a',
  victory: '#4aff7a',
  defeat: '#ff4a4a',
};

function formatPlanetId(id: string): string {
  return `Planet ${id.replace('planet-', '')}`;
}

function getPlayerColor(ownerId: OwnerId, humanPlayerId: string, players: Player[]): string {
  if (ownerId === 'neutral') {
    return NEUTRAL_COLOR;
  }
  if (ownerId === humanPlayerId) {
    return HUMAN_COLOR;
  }
  const aiPlayers = players.filter((p) => p.isAI);
  const aiIndex = aiPlayers.findIndex((p) => p.id === ownerId);
  return AI_COLORS[Math.max(0, aiIndex) % AI_COLORS.length];
}

function getOwnerName(ownerId: OwnerId, players: Player[]): string {
  if (ownerId === 'neutral') {
    return 'Neutral';
  }
  return players.find((p) => p.id === ownerId)?.name ?? ownerId;
}

function sumOwnedShips(map: { planets: Planet[] }, ownerId: string): number {
  return map.planets
    .filter((p) => p.owner === ownerId)
    .reduce((sum, p) => sum + p.shipCount, 0);
}

function PlanetNode({
  planet,
  color,
  isSelected,
  isHome,
  onPress,
}: {
  planet: Planet;
  color: string;
  isSelected: boolean;
  isHome: boolean;
  onPress: () => void;
}) {
  const pulse = useRef(new Animated.Value(0)).current;
  const size = isSelected ? PLANET_SIZE_SELECTED : PLANET_SIZE;
  const offset = (CELL_SIZE - size) / 2;

  useEffect(() => {
    if (!isSelected) {
      pulse.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: false }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [isSelected, pulse]);

  const borderColor = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: ['#ffffff', '#4a9eff'],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.planetTouchTarget,
        {
          left: planet.position.x * CELL_SIZE + offset - (isHome ? 2 : 0),
          top: planet.position.y * CELL_SIZE + offset - (isHome ? 2 : 0),
        },
      ]}
    >
      {isHome && (
        <View
          style={[
            styles.homeRing,
            {
              width: size + 8,
              height: size + 8,
              borderRadius: (size + 8) / 2,
            },
          ]}
        />
      )}
      {isSelected ? (
        <Animated.View
          style={[
            styles.planetCircle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
              borderWidth: 2,
              borderColor,
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.planetCircle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
              borderWidth: isHome ? 2 : 0,
              borderColor: '#ffffff',
            },
          ]}
        />
      )}
      <Text style={styles.shipCountLabel}>{planet.shipCount}</Text>
    </TouchableOpacity>
  );
}

function FleetMarker({
  fleet,
  destPlanet,
  color,
  index,
}: {
  fleet: Fleet;
  destPlanet: Planet;
  color: string;
  index: number;
}) {
  return (
    <View
      style={[
        styles.fleetMarker,
        {
          left: destPlanet.position.x * CELL_SIZE + 2,
          top: destPlanet.position.y * CELL_SIZE + PLANET_SIZE + 4 + index * 10,
        },
      ]}
    >
      <Text style={styles.fleetArrow}>→</Text>
      <View style={[styles.fleetDot, { backgroundColor: color }]} />
      <Text style={styles.fleetShips}>{fleet.shipCount}</Text>
    </View>
  );
}

export default function GameScreen() {
  const navigation = useNavigation<GameNavigationProp>();
  const insets = useSafeAreaInsets();
  const gameState = useGameStore((s) => s.gameState);
  const selectedPlanetId = useGameStore((s) => s.selectedPlanetId);
  const selectPlanet = useGameStore((s) => s.selectPlanet);
  const sendFleet = useGameStore((s) => s.sendFleet);
  const resetGame = useGameStore((s) => s.resetGame);

  const [destPlanetId, setDestPlanetId] = useState<string | null>(null);
  const [shipCount, setShipCount] = useState(1);

  useEffect(() => {
    if (gameState === null) {
      navigation.replace('Home');
    }
  }, [gameState, navigation]);

  const humanPlayer = useMemo(
    () => gameState?.players.find((p) => !p.isAI),
    [gameState?.players],
  );

  const selectedPlanet = useMemo(
    () => gameState?.map.planets.find((p) => p.id === selectedPlanetId),
    [gameState?.map.planets, selectedPlanetId],
  );

  useEffect(() => {
    setDestPlanetId(null);
    setShipCount(1);
  }, [selectedPlanetId]);

  const destinationOptions = useMemo(() => {
    if (gameState === null || selectedPlanet === undefined) {
      return [];
    }
    return gameState.map.planets
      .filter((p) => p.id !== selectedPlanet.id)
      .map((dest) => ({
        planet: dest,
        turns: computeTurnsInTransit(selectedPlanet.position, dest.position),
        ownerName: getOwnerName(dest.owner, gameState.players),
      }))
      .sort((a, b) => a.turns - b.turns);
  }, [gameState, selectedPlanet]);

  const fleetsByDestination = useMemo(() => {
    const grouped = new Map<string, Fleet[]>();
    if (gameState === null) {
      return grouped;
    }
    for (const fleet of gameState.fleets) {
      const list = grouped.get(fleet.destinationPlanetId) ?? [];
      list.push(fleet);
      grouped.set(fleet.destinationPlanetId, list);
    }
    return grouped;
  }, [gameState]);

  if (gameState === null || humanPlayer === undefined) {
    return <View style={styles.root} />;
  }

  const { map, players, fleets, turnNumber, currentPlayerId, status, winnerId } = gameState;
  const mapPixelWidth = map.width * CELL_SIZE;
  const mapPixelHeight = map.height * CELL_SIZE;
  const isHumanTurn = status === 'active' && currentPlayerId === humanPlayer.id;
  const humanShips = sumOwnedShips(map, humanPlayer.id);
  const humanWon = status === 'finished' && winnerId === humanPlayer.id;
  const humanLost = status === 'finished' && winnerId !== null && winnerId !== humanPlayer.id;

  const maxSend =
    selectedPlanet !== undefined && selectedPlanet.owner === humanPlayer.id
      ? Math.max(1, selectedPlanet.shipCount - 1)
      : 1;

  const handleSendFleet = () => {
    if (selectedPlanetId === null || destPlanetId === null) {
      return;
    }
    // MVP: one fleet dispatch per human turn — sendFleet resolves the full turn (and AI turns) immediately.
    sendFleet(selectedPlanetId, destPlanetId, shipCount);
    selectPlanet(null);
    setDestPlanetId(null);
    setShipCount(1);
  };

  const handleNewGame = () => {
    resetGame();
    navigation.replace('Home');
  };

  const canSend =
    status === 'active' &&
    isHumanTurn &&
    selectedPlanet !== undefined &&
    selectedPlanet.owner === humanPlayer.id &&
    destPlanetId !== null &&
    shipCount >= 1 &&
    shipCount <= maxSend;

  return (
    <View style={styles.root}>
      <View style={[styles.statusBar, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.statusMain}>
          Turn {turnNumber} · {isHumanTurn ? 'Your turn' : "AI's turn"}
        </Text>
        <Text style={styles.statusSub}>
          Ships {humanShips} · Resources {humanPlayer.resources}
        </Text>
      </View>

      <View style={styles.mapArea}>
        <ScrollView horizontal scrollEnabled showsHorizontalScrollIndicator={false}>
          <ScrollView scrollEnabled showsVerticalScrollIndicator={false}>
            <View style={{ width: mapPixelWidth, height: mapPixelHeight }}>
              {map.planets.map((planet) => (
                <PlanetNode
                  key={planet.id}
                  planet={planet}
                  color={getPlayerColor(planet.owner, humanPlayer.id, players)}
                  isSelected={planet.id === selectedPlanetId}
                  isHome={planet.isHomePlanet}
                  onPress={() =>
                    selectPlanet(planet.id === selectedPlanetId ? null : planet.id)
                  }
                />
              ))}
              {fleets.map((fleet) => {
                const destPlanet = map.planets.find((p) => p.id === fleet.destinationPlanetId);
                if (destPlanet === undefined) {
                  return null;
                }
                const siblings = fleetsByDestination.get(fleet.destinationPlanetId) ?? [];
                const index = siblings.findIndex((f) => f.id === fleet.id);
                return (
                  <FleetMarker
                    key={fleet.id}
                    fleet={fleet}
                    destPlanet={destPlanet}
                    color={getPlayerColor(fleet.ownerId, humanPlayer.id, players)}
                    index={index}
                  />
                );
              })}
            </View>
          </ScrollView>
        </ScrollView>
      </View>

      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 12 }]}>
        {status === 'finished' ? (
          <>
            <Text
              style={[
                styles.banner,
                humanWon ? styles.bannerVictory : styles.bannerDefeat,
              ]}
            >
              {humanWon ? 'Victory' : humanLost ? 'Defeat' : 'Game Over'}
            </Text>
            <Pressable style={styles.primaryButton} onPress={handleNewGame}>
              <Text style={styles.primaryButtonText}>New Game</Text>
            </Pressable>
          </>
        ) : selectedPlanet === undefined ? (
          <Text style={styles.mutedHint}>Tap a planet to select it</Text>
        ) : (
          <>
            <Text style={styles.planetTitle}>{formatPlanetId(selectedPlanet.id)}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.classBadge}>Class {selectedPlanet.class}</Text>
              <Text style={styles.metaText}>
                {getOwnerName(selectedPlanet.owner, players)} · {selectedPlanet.shipCount} ships
              </Text>
            </View>

            {selectedPlanet.owner === humanPlayer.id && isHumanTurn && (
              <View style={styles.sendSection}>
                <Text style={styles.sectionLabel}>Send Fleet</Text>
                <Text style={styles.sectionHint}>Destination</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.destScroll}
                  contentContainerStyle={styles.destScrollContent}
                >
                  {destinationOptions.map(({ planet, turns, ownerName }) => {
                    const selected = destPlanetId === planet.id;
                    return (
                      <Pressable
                        key={planet.id}
                        style={[styles.destChip, selected && styles.destChipSelected]}
                        onPress={() => setDestPlanetId(planet.id)}
                      >
                        <Text
                          style={[styles.destChipTitle, selected && styles.destChipTitleSelected]}
                        >
                          {formatPlanetId(planet.id)}
                        </Text>
                        <Text style={styles.destChipMeta}>
                          {ownerName} · {turns} turn{turns === 1 ? '' : 's'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <View style={styles.stepperRow}>
                  <Text style={styles.sectionHint}>Ships</Text>
                  <View style={styles.stepperControls}>
                    <Pressable
                      style={styles.stepperBtn}
                      onPress={() => setShipCount((c) => Math.max(1, c - 1))}
                      disabled={shipCount <= 1}
                    >
                      <Text style={styles.stepperBtnText}>−</Text>
                    </Pressable>
                    <Text style={styles.stepperValue}>{shipCount}</Text>
                    <Pressable
                      style={styles.stepperBtn}
                      onPress={() => setShipCount((c) => Math.min(maxSend, c + 1))}
                      disabled={shipCount >= maxSend}
                    >
                      <Text style={styles.stepperBtnText}>+</Text>
                    </Pressable>
                    <Text style={styles.stepperMax}>max {maxSend}</Text>
                  </View>
                </View>

                <Pressable
                  style={[styles.primaryButton, !canSend && styles.primaryButtonDisabled]}
                  onPress={handleSendFleet}
                  disabled={!canSend}
                >
                  <Text style={styles.primaryButtonText}>Send</Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  statusBar: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: COLORS.panel,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    zIndex: 2,
  },
  statusMain: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statusSub: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  mapArea: {
    flex: 1,
    backgroundColor: '#060612',
  },
  planetTouchTarget: {
    position: 'absolute',
    alignItems: 'center',
    width: CELL_SIZE,
  },
  homeRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  planetCircle: {
    zIndex: 1,
  },
  shipCountLabel: {
    color: COLORS.text,
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
    width: CELL_SIZE * 2,
    marginLeft: -CELL_SIZE / 2,
  },
  fleetMarker: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    zIndex: 0,
  },
  fleetArrow: {
    color: COLORS.textMuted,
    fontSize: 8,
  },
  fleetDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  fleetShips: {
    color: COLORS.textMuted,
    fontSize: 8,
  },
  bottomPanel: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: COLORS.panel,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    maxHeight: '42%',
  },
  mutedHint: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  planetTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    marginBottom: 8,
  },
  classBadge: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  metaText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  sendSection: {
    marginTop: 4,
  },
  sectionLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sectionHint: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  destScroll: {
    maxHeight: 72,
    marginBottom: 10,
  },
  destScrollContent: {
    gap: 8,
    paddingRight: 8,
  },
  destChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 120,
  },
  destChipSelected: {
    borderColor: COLORS.accent,
    backgroundColor: '#1a2a4a',
  },
  destChipTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '500',
  },
  destChipTitleSelected: {
    color: COLORS.accent,
  },
  destChipMeta: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  stepperRow: {
    marginBottom: 10,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    color: COLORS.accent,
    fontSize: 20,
  },
  stepperValue: {
    color: COLORS.text,
    fontSize: 18,
    minWidth: 28,
    textAlign: 'center',
  },
  stepperMax: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    color: COLORS.background,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  banner: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  bannerVictory: {
    color: COLORS.victory,
  },
  bannerDefeat: {
    color: COLORS.defeat,
  },
});

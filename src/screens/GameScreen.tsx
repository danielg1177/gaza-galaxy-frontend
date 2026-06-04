import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated as RNAnimated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { PlatformSlider } from '../components/PlatformSlider';
import Svg, { Circle, G, Line, Polygon, Text as SvgText } from 'react-native-svg';
import Animated, {
  runOnJS,
  runOnUI,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../App';
import StrategicMapModal from '../components/StrategicMapModal';
import {
  FACTORY_GOLD_OUTPUT,
  FACTORY_TROOP_OUTPUT,
  MAX_TECH_LEVEL,
  researchThreshold,
} from '../game/productionEngine';
import {
  computeClickDistance,
  computeTurnsInTransit,
  effectiveRange,
  effectiveSpeed,
  isInRange,
} from '../game/movementEngine';
import type { BuildingType, Fleet, OwnerId, Planet, Player, TurnEvent } from '../game/types';
import { saveTurnProgress } from '../services/gamesService';
import {
  getLocalHumanPlayerId,
  type PendingFleet,
  useGameStore,
  useVisibleGameState,
} from '../store/gameStore';
import { showAlert, showConfirm } from '../utils/webAlert';

type GameNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Game'>;
type GameRouteProp = RouteProp<RootStackParamList, 'Game'>;

interface QueuedBuildOrder {
  type: 'BUILD';
  planetId: string;
  buildingType: BuildingType;
}

interface BuildDisplayEntry {
  planetId: string;
  buildingType: BuildingType;
  buildingIndex: number;
}

interface BuildDisplayGroup {
  planetId: string;
  buildingType: BuildingType;
  buildingIndices: number[];
}

function isBuildOrder(order: PendingFleet | QueuedBuildOrder): order is QueuedBuildOrder {
  return 'type' in order && order.type === 'BUILD';
}

function buildTypeLabel(buildingType: BuildingType): string {
  return buildingType === 'factory' ? 'Factory' : 'Research Lab';
}

function buildTypePrefix(buildingType: BuildingType): string {
  return buildingType === 'factory' ? '🏭' : '🔬';
}

/** UI label for planet tier letter (stored uppercase A–P in game state). */
function displayPlanetClass(planetClass: string): string {
  return planetClass.toLowerCase();
}

function parseFleetShipCountFromDraft(
  draft: string,
  modalMaxShips: number,
  fallback: number,
): number {
  const trimmed = draft.trim();
  const parsed = trimmed === '' ? 0 : parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(modalMaxShips, Math.max(0, parsed));
}

type CombatTurnEvent = Extract<TurnEvent, { kind: 'combat' }>;
type MultiwayCombatTurnEvent = Extract<TurnEvent, { kind: 'multiway_combat' }>;
type HumanCombatTurnEvent = CombatTurnEvent | MultiwayCombatTurnEvent;
type FleetArrivedTurnEvent = Extract<TurnEvent, { kind: 'fleet_arrived' }>;
type BuildCompleteTurnEvent = Extract<TurnEvent, { kind: 'build_complete' }>;

function BattleReportRoundLabel({ roundNumber }: { roundNumber?: number }) {
  if (roundNumber === undefined) {
    return null;
  }
  return <Text style={styles.battleReportRoundLabel}>Round {roundNumber}</Text>;
}

interface GroupedBuildComplete {
  planetName: string;
  buildingType: BuildingType;
  count: number;
}

function groupBuildCompleteEvents(events: BuildCompleteTurnEvent[]): GroupedBuildComplete[] {
  const counts = new Map<string, GroupedBuildComplete>();
  for (const event of events) {
    const key = `${event.planetName}\0${event.buildingType}`;
    const existing = counts.get(key);
    if (existing !== undefined) {
      existing.count += 1;
    } else {
      counts.set(key, {
        planetName: event.planetName,
        buildingType: event.buildingType,
        count: 1,
      });
    }
  }
  return [...counts.values()];
}

function formatGroupedBuildComplete(item: GroupedBuildComplete): string {
  const icon = item.buildingType === 'factory' ? '🏭' : '🔬';
  return `${item.planetName}: ${icon} x${item.count}`;
}

function formatTurnEvent(
  event: TurnEvent,
  localHumanPlayerId?: string,
  players?: Player[],
  turnEvents?: TurnEvent[],
): string {
  switch (event.kind) {
    case 'fleet_arrived':
      return `${event.planetName}: ${event.shipCount} 🚀`;
    case 'combat': {
      const sides = getBattleReportSides(
        event,
        localHumanPlayerId,
        players ?? [],
        turnEvents ?? [],
      );
      const humanPlayer =
        localHumanPlayerId !== undefined
          ? players?.find((player) => player.id === localHumanPlayerId)
          : undefined;
      const humanWon =
        humanPlayer !== undefined &&
        ((event.attackerName === humanPlayer.name && event.attackerWon) ||
          (event.defenderName === humanPlayer.name && !event.attackerWon));
      const attackPhrase =
        sides.leftLabel === 'You'
          ? `You (${sides.leftTroops}) attacked ${sides.rightLabel} (${sides.rightTroops})`
          : `${sides.leftLabel} (${sides.leftTroops}) attacked You (${sides.rightTroops})`;
      const opponentName =
        sides.leftLabel === 'You' ? sides.rightLabel : sides.leftLabel;
      const remaining = getVictorRemainingShips(event);
      const outcomePhrase = humanWon
        ? `You Won (${remaining} remaining)`
        : `${opponentName} Won (${remaining} remaining)`;
      return `${event.planetName}: ${attackPhrase} — ${outcomePhrase}`;
    }
    case 'research_levelup': {
      const isLocalHuman =
        localHumanPlayerId !== undefined &&
        players?.find((p) => p.id === localHumanPlayerId)?.name === event.playerName;
      const nameLabel = isLocalHuman ? 'You' : event.playerName;
      return `${nameLabel} reached Tech Level ${event.newLevel}`;
    }
    case 'build_complete': {
      const icon = event.buildingType === 'factory' ? '🏭' : '🔬';
      return `${event.planetName}: ${icon} x1`;
    }
    case 'troop_produced':
      return '';
    case 'multiway_combat': {
      const humanPlayer =
        localHumanPlayerId !== undefined
          ? players?.find((p) => p.id === localHumanPlayerId)
          : undefined;
      const humanParticipant =
        humanPlayer !== undefined
          ? event.participants.find((p) => p.name === humanPlayer.name)
          : undefined;
      const humanWon = humanParticipant?.survived === true;
      const outcome = humanWon
        ? `You Won (${event.remainingShips} remaining)`
        : `${event.winnerName} Won (${event.remainingShips} remaining)`;
      return `${event.planetName}: Free-for-all — ${outcome}`;
    }
  }
}

function FleetArrivedReportCard({ event }: { event: FleetArrivedTurnEvent }) {
  return (
    <View style={[styles.battleReportCard, styles.fleetArrivedReportCard]}>
      <BattleReportRoundLabel roundNumber={event.roundNumber} />
      <Text style={styles.battleReportLine}>
        <Text style={styles.fleetArrivedPlanetName}>{event.planetName}</Text>
        {`: ${event.shipCount} 🚀`}
      </Text>
      <Text style={styles.fleetArrivedAttackerName}>{event.attackerName}</Text>
    </View>
  );
}

function getBattleReportDetails(
  event: CombatTurnEvent,
  localHumanPlayerId: string,
  players: Player[],
): {
  opponent: string;
  yourTroops: number;
  theirTroops: number;
  outcomeText: string;
  outcomeIsVictory: boolean | null;
} {
  const humanPlayer = players.find((player) => player.id === localHumanPlayerId);
  const isAttacker =
    humanPlayer !== undefined && event.attackerName === humanPlayer.name;
  const isDefender =
    humanPlayer !== undefined && event.defenderName === humanPlayer.name;
  const isHumanInvolved = isAttacker || isDefender;

  const opponent = !isHumanInvolved
    ? `${event.attackerName} vs ${event.defenderName}`
    : isAttacker
      ? event.defenderName
      : event.attackerName;

  const yourTroops = isAttacker
    ? event.attackerShipsBefore
    : isDefender
      ? event.defenderShipsBefore
      : event.attackerShipsBefore;
  const theirTroops = isAttacker
    ? event.defenderShipsBefore
    : isDefender
      ? event.attackerShipsBefore
      : event.defenderShipsBefore;

  if (!isHumanInvolved) {
    return {
      opponent,
      yourTroops,
      theirTroops,
      outcomeText: event.attackerWon ? 'Attacker Won' : 'Defender Won',
      outcomeIsVictory: null,
    };
  }

  const humanWon =
    (isAttacker && event.attackerWon) || (isDefender && !event.attackerWon);

  return {
    opponent,
    yourTroops,
    theirTroops,
    outcomeText: humanWon ? 'Victory' : 'Defeat',
    outcomeIsVictory: humanWon,
  };
}

function isHumanInvolvedInCombat(
  event: CombatTurnEvent,
  humanPlayerName: string,
): boolean {
  return event.attackerName === humanPlayerName || event.defenderName === humanPlayerName;
}

/** Victor's post-battle garrison on the planet (never the loser's wiped tally). */
function getVictorRemainingShips(event: CombatTurnEvent): number {
  if (event.attackerWon) {
    return event.attackerShipsBefore - event.attackerLost;
  }
  return event.defenderShipsBefore - event.defenderLost;
}

/**
 * Defender landed on a neutral planet this turn (fleet_arrived garrison equals combat
 * defender tally) — both players should see themselves as the attacker on the left.
 */
function isSimultaneousNeutralLanding(
  event: CombatTurnEvent,
  turnEvents: TurnEvent[],
): boolean {
  const landing = turnEvents.find(
    (turnEvent): turnEvent is Extract<TurnEvent, { kind: 'fleet_arrived' }> =>
      turnEvent.kind === 'fleet_arrived' &&
      turnEvent.planetName === event.planetName &&
      turnEvent.attackerName === event.defenderName,
  );
  return landing !== undefined && landing.shipCount === event.defenderShipsBefore;
}

function getBattleReportSides(
  event: CombatTurnEvent,
  localHumanPlayerId: string | undefined,
  players: Player[],
  turnEvents: TurnEvent[],
): {
  leftTroops: number;
  leftLabel: string;
  rightTroops: number;
  rightLabel: string;
} {
  let leftName = event.attackerName;
  let leftTroops = event.attackerShipsBefore;
  let rightName = event.defenderName;
  let rightTroops = event.defenderShipsBefore;

  const humanPlayer =
    localHumanPlayerId !== undefined
      ? players.find((player) => player.id === localHumanPlayerId)
      : undefined;

  if (
    humanPlayer !== undefined &&
    event.defenderName === humanPlayer.name &&
    isSimultaneousNeutralLanding(event, turnEvents)
  ) {
    leftName = event.defenderName;
    leftTroops = event.defenderShipsBefore;
    rightName = event.attackerName;
    rightTroops = event.attackerShipsBefore;
  }

  const leftLabel =
    humanPlayer !== undefined && leftName === humanPlayer.name ? 'You' : leftName;
  const rightLabel =
    humanPlayer !== undefined && rightName === humanPlayer.name ? 'You' : rightName;

  return { leftTroops, leftLabel, rightTroops, rightLabel };
}

function isHumanHomePlanetConquestVictory(
  event: CombatTurnEvent,
  localHumanPlayerId: string | undefined,
  players: Player[],
): boolean {
  if (event.isHomePlanetConquest !== true || !event.attackerWon) {
    return false;
  }
  const humanPlayer =
    localHumanPlayerId !== undefined
      ? players.find((player) => player.id === localHumanPlayerId)
      : undefined;
  return humanPlayer !== undefined && event.attackerName === humanPlayer.name;
}

function getHumanBattleOutcomeIsVictory(
  event: HumanCombatTurnEvent,
  localHumanPlayerId: string,
  players: Player[],
): boolean | null {
  if (event.kind === 'combat') {
    return getBattleReportDetails(event, localHumanPlayerId, players).outcomeIsVictory;
  }
  const humanPlayer = players.find((player) => player.id === localHumanPlayerId);
  const humanParticipant =
    humanPlayer !== undefined
      ? event.participants.find((participant) => participant.name === humanPlayer.name)
      : undefined;
  if (humanParticipant === undefined) {
    return null;
  }
  return humanParticipant.survived === true;
}

function BattleReportCard({
  event,
  localHumanPlayerId,
  players,
  planetClass,
  turnEvents,
  homePlanetConquestHighlight = false,
}: {
  event: CombatTurnEvent;
  localHumanPlayerId: string | undefined;
  players: Player[];
  planetClass: string;
  turnEvents: TurnEvent[];
  homePlanetConquestHighlight?: boolean;
}) {
  const details =
    localHumanPlayerId !== undefined
      ? getBattleReportDetails(event, localHumanPlayerId, players)
      : getBattleReportDetails(event, '', []);
  const sides = getBattleReportSides(event, localHumanPlayerId, players, turnEvents);
  const remainingToShow = getVictorRemainingShips(event);

  return (
    <View style={homePlanetConquestHighlight ? styles.battleReportCardWrapper : undefined}>
      {homePlanetConquestHighlight && (
        <Text style={styles.homePlanetConquestBanner}>You took their home planet!</Text>
      )}
      <View
        style={[
          styles.battleReportCard,
          homePlanetConquestHighlight
            ? styles.battleReportCardHomeConquest
            : details.outcomeIsVictory === true
              ? styles.battleReportCardVictory
              : details.outcomeIsVictory === false
                ? styles.battleReportCardDefeat
                : undefined,
        ]}
      >
      <BattleReportRoundLabel roundNumber={event.roundNumber} />
      <View style={styles.battleReportHeader}>
        <View style={styles.battleReportPlanetCircle}>
          <Text style={styles.battleReportPlanetCircleText}>
            {displayPlanetClass(planetClass)}
          </Text>
        </View>
        <View style={styles.battleReportHeaderCenter}>
          <Text style={styles.battleReportPlanetName}>{event.planetName}</Text>
        </View>
        <View style={styles.battleReportHeaderEnd}>
          {details.outcomeIsVictory !== null && (
            <Text
              style={[
                styles.battleReportOutcomeBadge,
                details.outcomeIsVictory === true
                  ? styles.battleReportOutcomeWin
                  : styles.battleReportOutcomeLoss,
              ]}
            >
              {details.outcomeIsVictory ? 'W' : 'L'}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.battleReportTroopsRow}>
        <View style={styles.battleReportTroopColumn}>
          <View style={styles.battleReportTroopCountRow}>
            <Text style={styles.battleReportTroopCount}>{sides.leftTroops}</Text>
            <Text style={styles.battleReportTroopIcon}>🚀</Text>
          </View>
          <Text
            style={
              sides.leftLabel === 'You'
                ? styles.battleReportTroopLabelYou
                : styles.battleReportTroopLabelOpponent
            }
          >
            {sides.leftLabel}
          </Text>
        </View>
        <View style={styles.battleReportVsColumn}>
          <Text style={styles.battleReportVsText}>attacked</Text>
        </View>
        <View style={styles.battleReportTroopColumn}>
          <View style={styles.battleReportTroopCountRow}>
            <Text style={styles.battleReportTroopCount}>{sides.rightTroops}</Text>
            <Text style={styles.battleReportTroopIcon}>🚀</Text>
          </View>
          <Text
            style={
              sides.rightLabel === 'You'
                ? styles.battleReportTroopLabelYou
                : styles.battleReportTroopLabelOpponent
            }
          >
            {sides.rightLabel}
          </Text>
        </View>
      </View>
      <View style={styles.battleReportRemainingRow}>
        <Text
          style={[
            styles.battleReportRemainingText,
            details.outcomeIsVictory === true
              ? styles.battleReportRemainingVictory
              : details.outcomeIsVictory === false
                ? styles.battleReportRemainingDefeat
                : styles.battleReportRemainingNeutral,
          ]}
        >
          {remainingToShow} remaining
        </Text>
      </View>
      </View>
    </View>
  );
}

function MultiwayBattleReportCard({
  event,
  localHumanPlayerId,
  players,
  planetClass,
}: {
  event: MultiwayCombatTurnEvent;
  localHumanPlayerId: string | undefined;
  players: Player[];
  planetClass: string;
}) {
  const humanPlayer =
    localHumanPlayerId !== undefined
      ? players.find((player) => player.id === localHumanPlayerId)
      : undefined;
  const humanParticipant =
    humanPlayer !== undefined
      ? event.participants.find((participant) => participant.name === humanPlayer.name)
      : undefined;
  const humanWon = humanParticipant?.survived === true;
  const humanInvolved = humanParticipant !== undefined;
  const homePlanetConquestHighlight =
    event.isHomePlanetConquest === true && humanWon;

  return (
    <View style={homePlanetConquestHighlight ? styles.battleReportCardWrapper : undefined}>
      {homePlanetConquestHighlight && (
        <Text style={styles.homePlanetConquestBanner}>You took their home planet!</Text>
      )}
      <View
        style={[
          styles.battleReportCard,
          homePlanetConquestHighlight
            ? styles.battleReportCardHomeConquest
            : humanWon
              ? styles.battleReportCardVictory
              : humanInvolved && !humanWon
                ? styles.battleReportCardDefeat
                : undefined,
        ]}
      >
        <BattleReportRoundLabel roundNumber={event.roundNumber} />
        <View style={styles.battleReportHeader}>
          <View style={styles.battleReportPlanetCircle}>
            <Text style={styles.battleReportPlanetCircleText}>
              {displayPlanetClass(planetClass)}
            </Text>
          </View>
          <View style={styles.battleReportHeaderCenter}>
            <Text style={styles.battleReportPlanetName}>{event.planetName}</Text>
          </View>
          <View style={styles.battleReportHeaderEnd}>
            {humanInvolved && (
              <Text
                style={[
                  styles.battleReportOutcomeBadge,
                  humanWon
                    ? styles.battleReportOutcomeWin
                    : styles.battleReportOutcomeLoss,
                ]}
              >
                {humanWon ? 'W' : 'L'}
              </Text>
            )}
          </View>
        </View>
        <Text
          style={{
            fontSize: 11,
            color: '#888',
            textAlign: 'center',
            marginBottom: 6,
            marginTop: 2,
          }}
        >
          ⚔ Free-for-all
        </Text>
        {event.participants.map((participant, index) => {
          const displayName =
            humanPlayer !== undefined && participant.name === humanPlayer.name
              ? 'You'
              : participant.name;
          const isWinner = participant.survived === true;
          return (
            <View
              key={`${participant.name}-${index}`}
              style={[
                styles.battleReportMultiwayParticipantRow,
                !isWinner && { opacity: 0.45 },
              ]}
            >
              <Text
                style={[
                  styles.battleReportMultiwayParticipantName,
                  isWinner && styles.battleReportMultiwayParticipantNameWinner,
                ]}
              >
                {displayName}
              </Text>
              <Text style={styles.battleReportMultiwayParticipantShips}>
                {participant.shipsBefore} ships
              </Text>
              {isWinner ? (
                <Text style={styles.battleReportRemainingVictory}>
                  → {event.remainingShips} remaining
                </Text>
              ) : (
                <Text style={styles.battleReportMultiwayEliminated}>✗</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const CELL_SIZE = 18;
const PLANET_HIT_RADIUS = CELL_SIZE * 2.25;
// Visual sizes scaled from prior CELL_SIZE=18 baseline
const PLANET_SIZE = Math.round((18 / 18) * CELL_SIZE);
const PLANET_SIZE_SELECTED = Math.round((20 / 18) * CELL_SIZE);
const PLANET_NAME_LABEL_WIDTH = Math.round((48 / 18) * CELL_SIZE);
const PLANET_NAME_ABOVE_GAP = Math.max(1, Math.round((2 / 18) * CELL_SIZE));
const PLANET_LABEL_FONT_SIZE = Math.max(2, Math.round((7 / 18) * CELL_SIZE));
const PLANET_CLASS_FONT_SIZE = Math.max(2, Math.round((10.5 / 18) * CELL_SIZE));
const PLANET_BATTLE_ICON_MARGIN = Math.max(1, Math.round((1 / 18) * CELL_SIZE));
const SHIP_COUNT_FONT_SIZE = Math.max(2, Math.round((9 / 18) * CELL_SIZE));
const SHIP_COUNT_LABEL_MARGIN_TOP = Math.max(0, Math.round((2 / 18) * CELL_SIZE));
const PLANET_BATTLE_ICON_FONT_SIZE = Math.max(2, Math.round((7 / 18) * CELL_SIZE));
const PLANET_HIGHLIGHT_BORDER_WIDTH = Math.max(1, Math.round((2 / 18) * CELL_SIZE));
const FLEET_ARROW_HALF_LENGTH = Math.max(2, Math.round((5 / 18) * CELL_SIZE));
const FLEET_ARROW_HALF_WIDTH = Math.max(2, Math.round((4 / 18) * CELL_SIZE));
const FLEET_MARKER_FONT_SIZE = Math.max(2, Math.round((8 / 18) * CELL_SIZE));
const FLEET_MARKER_TEXT_OFFSET_X = Math.max(1, Math.round((6 / 18) * CELL_SIZE));
const FLEET_MARKER_TEXT_OFFSET_Y = Math.max(1, Math.round((4 / 18) * CELL_SIZE));
// Small preset (20×20 cells) at ~55% of a ~390px-wide viewport after status bar
const REFERENCE_VIEWPORT_WIDTH = 390;
const SMALL_MAP_CELLS = 20;
const DEFAULT_MAP_SCALE =
  Math.round(
    ((REFERENCE_VIEWPORT_WIDTH * 0.55) / (SMALL_MAP_CELLS * CELL_SIZE)) * 10,
  ) / 10;
const HOME_PLANET_SNAP_SCALE = 1.0;
const MAP_VIEWPORT_PADDING = 150;
const BG_COLOR = '#f5f0eb';
const HUMAN_COLOR = '#2e5bcc';
const HOME_PLANET_COLOR = '#c8a26b';
const NEUTRAL_COLOR = '#7a7a96';
const AI_COLORS = ['#cc3333', '#2a9048', '#d06820', '#8030c0'] as const;

const COLORS = {
  background: '#f5f0eb',
  text: '#1c1c2e',
  textMuted: '#6a6880',
  accent: '#4060c8',
  accentDim: '#e2e8f8',
  panel: '#faf7f4',
  border: '#ccc4b8',
  victory: '#276b40',
  defeat: '#b83030',
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

function getPlanetColor(
  planet: Planet,
  humanPlayerId: string,
  homePlanetId: string | undefined,
): string {
  if (planet.owner === humanPlayerId) {
    if (homePlanetId !== undefined && planet.id === homePlanetId) {
      return HOME_PLANET_COLOR;
    }
    return '#2e8a50';
  }
  // All non-owned planets (neutral AND enemy) look the same — fog of war
  return NEUTRAL_COLOR;
}

function getOwnerName(ownerId: OwnerId, players: Player[]): string {
  if (ownerId === 'neutral') {
    return 'Neutral';
  }
  return players.find((p) => p.id === ownerId)?.name ?? ownerId;
}

const FLEET_TOOLTIP_VISIBLE_MS = 4000;
const FLEET_TOOLTIP_FADE_MS = 300;

type FleetTooltipData = {
  fleet: Fleet;
  absX: number;
  absY: number;
};

function FleetTooltipOverlay({
  tooltip,
  players,
  localHumanPlayerId,
  onDismiss,
}: {
  tooltip: FleetTooltipData;
  players: Player[];
  localHumanPlayerId: string;
  onDismiss: () => void;
}) {
  const opacity = useRef(new RNAnimated.Value(1)).current;
  const autoDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoDismissTimer = useCallback(() => {
    if (autoDismissTimerRef.current !== null) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
  }, []);

  const fadeOutAndDismiss = useCallback(() => {
    clearAutoDismissTimer();
    opacity.stopAnimation();
    RNAnimated.timing(opacity, {
      toValue: 0,
      duration: FLEET_TOOLTIP_FADE_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onDismiss();
      }
    });
  }, [clearAutoDismissTimer, onDismiss, opacity]);

  useEffect(() => {
    opacity.setValue(1);
    clearAutoDismissTimer();
    autoDismissTimerRef.current = setTimeout(() => {
      fadeOutAndDismiss();
    }, FLEET_TOOLTIP_VISIBLE_MS);
    return clearAutoDismissTimer;
  }, [tooltip.fleet.id, tooltip.absX, tooltip.absY, clearAutoDismissTimer, fadeOutAndDismiss, opacity]);

  return (
    <RNAnimated.View
      style={[
        styles.fleetTooltip,
        {
          opacity,
          top: Math.max(8, tooltip.absY - 90),
          left: Math.max(8, Math.min(tooltip.absX - 100, 280)),
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.fleetTooltipAccent,
          {
            backgroundColor: getPlayerColor(
              tooltip.fleet.ownerId,
              localHumanPlayerId,
              players,
            ),
          },
        ]}
      />
      <View style={styles.fleetTooltipBody}>
        <View style={styles.fleetTooltipHeader}>
          <Text style={styles.fleetTooltipShips} numberOfLines={1}>
            {tooltip.fleet.shipCount} ships
          </Text>
          <Pressable
            style={styles.fleetTooltipClose}
            onPress={fadeOutAndDismiss}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Dismiss fleet info"
          >
            <Text style={styles.fleetTooltipCloseText}>✕</Text>
          </Pressable>
        </View>
        <Text style={styles.fleetTooltipTurns}>
          {tooltip.fleet.turnsRemaining === 1
            ? 'Arrives next round'
            : `${tooltip.fleet.turnsRemaining} rounds remaining`}
        </Text>
      </View>
    </RNAnimated.View>
  );
}

function planetCenterPx(planet: Planet): { x: number; y: number } {
  return {
    x: planet.position.x * CELL_SIZE + CELL_SIZE / 2,
    y: planet.position.y * CELL_SIZE + CELL_SIZE / 2,
  };
}

function screenToMapCoords(
  localX: number,
  localY: number,
  scale: number,
  rawTx: number,
  rawTy: number,
): { x: number; y: number } {
  return {
    x: (localX - rawTx) / scale,
    y: (localY - rawTy) / scale,
  };
}

function mapPixelPointToPosition(mapX: number, mapY: number): { x: number; y: number } {
  return { x: mapX / CELL_SIZE, y: mapY / CELL_SIZE };
}

function formatDragDistanceLabel(origin: Planet, mapPixelX: number, mapPixelY: number): string {
  const fingerPosition = mapPixelPointToPosition(mapPixelX, mapPixelY);
  const clicks = computeClickDistance(origin.position, fingerPosition);
  return `${clicks.toFixed(1)} clicks`;
}

function findPlanetAtMapCoords(
  mapX: number,
  mapY: number,
  planets: Planet[],
  scale: number,
): Planet | undefined {
  const hitRadius = Math.max(PLANET_SIZE / 2, PLANET_HIT_RADIUS / scale);
  let best: Planet | undefined;
  let bestDist = Infinity;
  for (const planet of planets) {
    const center = planetCenterPx(planet);
    const dx = mapX - center.x;
    const dy = mapY - center.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= hitRadius && dist < bestDist) {
      bestDist = dist;
      best = planet;
    }
  }
  return best;
}

function findFleetAtMapCoords(
  mapX: number,
  mapY: number,
  fleets: Fleet[],
  planets: Planet[],
  scale: number,
): Fleet | undefined {
  const hitRadius = Math.max(CELL_SIZE * 0.6, (CELL_SIZE * 1.8) / scale);
  let best: Fleet | undefined;
  let bestDist = Infinity;
  for (const fleet of fleets) {
    const originPlanet = planets.find((p) => p.id === fleet.originPlanetId);
    const destPlanet = planets.find((p) => p.id === fleet.destinationPlanetId);
    if (originPlanet === undefined || destPlanet === undefined) {
      continue;
    }
    const progress = fleet.totalTurns > 0 ? 1 - fleet.turnsRemaining / fleet.totalTurns : 1;
    const originCenter = planetCenterPx(originPlanet);
    const destCenter = planetCenterPx(destPlanet);
    const fleetX = originCenter.x + (destCenter.x - originCenter.x) * progress;
    const fleetY = originCenter.y + (destCenter.y - originCenter.y) * progress;
    const dx = mapX - fleetX;
    const dy = mapY - fleetY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= hitRadius && dist < bestDist) {
      bestDist = dist;
      best = fleet;
    }
  }
  return best;
}

function BoxSelectToggleIcon({
  variant,
  color,
}: {
  variant: 'select' | 'target';
  color: string;
}) {
  const stroke = { stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const };
  if (variant === 'target') {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Line x1="12" y1="3" x2="12" y2="7" {...stroke} />
        <Line x1="12" y1="17" x2="12" y2="21" {...stroke} />
        <Line x1="3" y1="12" x2="7" y2="12" {...stroke} />
        <Line x1="17" y1="12" x2="21" y2="12" {...stroke} />
        <Circle cx="12" cy="12" r="4.5" fill="none" {...stroke} />
      </Svg>
    );
  }
  const corner = 6;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Line x1="5" y1="5" x2="5" y2={5 + corner} {...stroke} />
      <Line x1="5" y1="5" x2={5 + corner} y2="5" {...stroke} />
      <Line x1="19" y1="5" x2="19" y2={5 + corner} {...stroke} />
      <Line x1="19" y1="5" x2={19 - corner} y2="5" {...stroke} />
      <Line x1="5" y1="19" x2="5" y2={19 - corner} {...stroke} />
      <Line x1="5" y1="19" x2={5 + corner} y2="19" {...stroke} />
      <Line x1="19" y1="19" x2="19" y2={19 - corner} {...stroke} />
      <Line x1="19" y1="19" x2={19 - corner} y2="19" {...stroke} />
    </Svg>
  );
}

function DragLine({
  startX,
  startY,
  endX,
  endY,
}: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}) {
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length < 1) {
    return null;
  }
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.dragLine,
        {
          left: startX,
          top: startY - 1,
          width: length,
          transform: [{ rotate: `${angle}deg` }],
        },
      ]}
    />
  );
}

function clampTranslation(
  tx: number,
  ty: number,
  currentScale: number,
  mapW: number,
  mapH: number,
  viewW: number,
  viewH: number,
): { x: number; y: number } {
  'worklet';
  const minX = Math.min(
    -(mapW * currentScale - viewW) - MAP_VIEWPORT_PADDING,
    MAP_VIEWPORT_PADDING,
  );
  const maxX = MAP_VIEWPORT_PADDING;
  const minY = Math.min(
    -(mapH * currentScale - viewH) - MAP_VIEWPORT_PADDING,
    MAP_VIEWPORT_PADDING,
  );
  const maxY = MAP_VIEWPORT_PADDING;
  return {
    x: Math.min(maxX, Math.max(minX, tx)),
    y: Math.min(maxY, Math.max(minY, ty)),
  };
}

function snapToHomePlanet(
  homePlanet: Planet,
  viewportWidth: number,
  viewportHeight: number,
  mapPixelWidth: number,
  mapPixelHeight: number,
): { scale: number; translateX: number; translateY: number } {
  const scale = HOME_PLANET_SNAP_SCALE;
  const targetTx = viewportWidth / 2 - homePlanet.position.x * CELL_SIZE * scale;
  const targetTy = viewportHeight / 2 - homePlanet.position.y * CELL_SIZE * scale;
  const clamped = clampTranslation(
    targetTx,
    targetTy,
    scale,
    mapPixelWidth,
    mapPixelHeight,
    viewportWidth,
    viewportHeight,
  );
  return { scale, translateX: clamped.x, translateY: clamped.y };
}

function PlanetNode({
  planet,
  color,
  isOwned,
  isSelected,
  isDragOrigin,
  isBoxSelected,
  adjustedShipCount,
  hadBattleThisTurn,
}: {
  planet: Planet;
  color: string;
  isOwned: boolean;
  isSelected: boolean;
  isDragOrigin: boolean;
  isBoxSelected: boolean;
  adjustedShipCount: number;
  hadBattleThisTurn: boolean;
}) {
  const highlighted = isSelected || isDragOrigin;
  const pulse = useRef(new RNAnimated.Value(0)).current;
  const size = highlighted ? PLANET_SIZE_SELECTED : PLANET_SIZE;
  const planetCenterX = planet.position.x * CELL_SIZE + CELL_SIZE / 2;
  const planetCenterY = planet.position.y * CELL_SIZE + CELL_SIZE / 2;
  const touchTargetHalfSize = PLANET_SIZE_SELECTED / 2;

  useEffect(() => {
    if (!highlighted) {
      pulse.setValue(0);
      return;
    }
    const animation = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: false }),
        RNAnimated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: false }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [highlighted, pulse]);

  const borderColor = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(70, 96, 200, 0.5)', 'rgba(0,0,0,0)'],
  });

  const touchStyle = [
    styles.planetTouchTarget,
    {
      left: planetCenterX - touchTargetHalfSize,
      top: planetCenterY - touchTargetHalfSize,
    },
  ];

  const circleLeft = touchTargetHalfSize - size / 2;
  const circleTop = touchTargetHalfSize - size / 2;
  const nameTop = circleTop - PLANET_NAME_ABOVE_GAP - PLANET_LABEL_FONT_SIZE;
  const circleFrame = {
    position: 'absolute' as const,
    left: circleLeft,
    top: circleTop,
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
  };

  const planetBody = (
    <>
      <Text
        style={[
          styles.planetNameLabel,
          { top: nameTop },
          !isOwned && styles.planetNameLabelFogged,
        ]}
      >
        {planet.name}
      </Text>
      {highlighted && !isDragOrigin && isOwned ? (
        <RNAnimated.View
          style={[
            styles.planetCircle,
            circleFrame,
            {
              borderWidth: PLANET_HIGHLIGHT_BORDER_WIDTH,
              borderColor,
            },
          ]}
        >
          <Text style={[styles.planetClassLabel, !isOwned && styles.planetClassLabelFogged]}>
            {displayPlanetClass(planet.class)}
          </Text>
        </RNAnimated.View>
      ) : (
        <View
          style={[
            styles.planetCircle,
            circleFrame,
            {
              borderWidth: isDragOrigin ? PLANET_HIGHLIGHT_BORDER_WIDTH : 0,
              borderColor: 'rgba(255,255,255,0.6)',
            },
          ]}
        >
          <Text style={[styles.planetClassLabel, !isOwned && styles.planetClassLabelFogged]}>
            {displayPlanetClass(planet.class)}
          </Text>
        </View>
      )}
      {isOwned && adjustedShipCount > 0 && (
        <Text
          style={[
            styles.shipCountLabel,
            { top: circleTop + size + SHIP_COUNT_LABEL_MARGIN_TOP },
          ]}
        >
          {adjustedShipCount}
        </Text>
      )}
      {hadBattleThisTurn && (
        <Text
          style={[
            styles.planetBattleIcon,
            {
              left: circleLeft + size + PLANET_BATTLE_ICON_MARGIN,
              top: touchTargetHalfSize - PLANET_BATTLE_ICON_FONT_SIZE / 2,
            },
          ]}
        >
          🔥
        </Text>
      )}
      {isBoxSelected && (
        <View
          style={{
            position: 'absolute',
            left: circleLeft - 4,
            top: circleTop - 4,
            width: size + 8,
            height: size + 8,
            borderRadius: (size + 8) / 2,
            borderWidth: 2,
            borderColor: '#00c9d4',
            backgroundColor: 'transparent',
          }}
        />
      )}
    </>
  );

  return (
    <View pointerEvents="none" style={touchStyle}>
      {planetBody}
    </View>
  );
}

const PENDING_DEPARTURE_OFFSET_PX = CELL_SIZE;

function fleetArrowPolygonPoints(
  cx: number,
  cy: number,
  towardX: number,
  towardY: number,
): string {
  const dx = towardX - cx;
  const dy = towardY - cy;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = len < 0.001 ? 1 : dx / len;
  const uy = len < 0.001 ? 0 : dy / len;
  const tipX = cx + ux * FLEET_ARROW_HALF_LENGTH;
  const tipY = cy + uy * FLEET_ARROW_HALF_LENGTH;
  const baseX = cx - ux * FLEET_ARROW_HALF_LENGTH;
  const baseY = cy - uy * FLEET_ARROW_HALF_LENGTH;
  const leftX = baseX + uy * FLEET_ARROW_HALF_WIDTH;
  const leftY = baseY - ux * FLEET_ARROW_HALF_WIDTH;
  const rightX = baseX - uy * FLEET_ARROW_HALF_WIDTH;
  const rightY = baseY + ux * FLEET_ARROW_HALF_WIDTH;
  return `${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`;
}

function FleetLayer({
  fleets,
  planets,
  queuedOrders,
  humanPlayerId,
  players,
  mapPixelWidth,
  mapPixelHeight,
}: {
  fleets: Fleet[];
  planets: Planet[];
  queuedOrders: PendingFleet[];
  humanPlayerId: string;
  players: Player[];
  mapPixelWidth: number;
  mapPixelHeight: number;
}) {
  return (
    <Svg
      width={mapPixelWidth}
      height={mapPixelHeight}
      style={styles.fleetLayer}
      pointerEvents="none"
    >
      {fleets.map((fleet) => {
        const originPlanet = planets.find((p) => p.id === fleet.originPlanetId);
        const destPlanet = planets.find((p) => p.id === fleet.destinationPlanetId);
        if (originPlanet === undefined || destPlanet === undefined) {
          return null;
        }
        const color = getPlayerColor(fleet.ownerId, humanPlayerId, players);
        const totalTurns = fleet.totalTurns;
        const progress = totalTurns > 0 ? 1 - fleet.turnsRemaining / totalTurns : 1;
        const x =
          originPlanet.position.x * CELL_SIZE +
          CELL_SIZE / 2 +
          (destPlanet.position.x - originPlanet.position.x) * CELL_SIZE * progress;
        const y =
          originPlanet.position.y * CELL_SIZE +
          CELL_SIZE / 2 +
          (destPlanet.position.y - originPlanet.position.y) * CELL_SIZE * progress;
        const destX = destPlanet.position.x * CELL_SIZE + CELL_SIZE / 2;
        const destY = destPlanet.position.y * CELL_SIZE + CELL_SIZE / 2;

        return (
          <G key={fleet.id}>
            <Line
              x1={x}
              y1={y}
              x2={destX}
              y2={destY}
              stroke={color}
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.6}
            />
            <Polygon points={fleetArrowPolygonPoints(x, y, destX, destY)} fill={color} />
            <SvgText
              x={x + FLEET_MARKER_TEXT_OFFSET_X}
              y={y - FLEET_MARKER_TEXT_OFFSET_Y}
              fill={color}
              fontSize={FLEET_MARKER_FONT_SIZE}
            >
              {fleet.shipCount}
            </SvgText>
          </G>
        );
      })}
      <G pointerEvents="none">
        {queuedOrders.filter((order) => !isBuildOrder(order)).map((order, index) => {
          const originPlanet = planets.find((p) => p.id === order.fromPlanetId);
          const destPlanet = planets.find((p) => p.id === order.toPlanetId);
          if (originPlanet === undefined || destPlanet === undefined) {
            return null;
          }
          const originCenter = planetCenterPx(originPlanet);
          const destCenter = planetCenterPx(destPlanet);
          const dx = destCenter.x - originCenter.x;
          const dy = destCenter.y - originCenter.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          if (length < 1) {
            return null;
          }
          const ux = dx / length;
          const uy = dy / length;
          const dotX = originCenter.x + ux * PENDING_DEPARTURE_OFFSET_PX;
          const dotY = originCenter.y + uy * PENDING_DEPARTURE_OFFSET_PX;

          return (
            <G key={`pending-${order.fromPlanetId}-${order.toPlanetId}-${index}`}>
              <Line
                x1={originCenter.x}
                y1={originCenter.y}
                x2={dotX}
                y2={dotY}
                stroke={HUMAN_COLOR}
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.5}
              />
              <Polygon
                points={fleetArrowPolygonPoints(dotX, dotY, destCenter.x, destCenter.y)}
                fill={HUMAN_COLOR}
                opacity={0.7}
              />
              <SvgText
                x={dotX + FLEET_MARKER_TEXT_OFFSET_X}
                y={dotY - FLEET_MARKER_TEXT_OFFSET_Y}
                fill={HUMAN_COLOR}
                fontSize={FLEET_MARKER_FONT_SIZE}
              >
                {order.shipCount}
              </SvgText>
            </G>
          );
        })}
      </G>
    </Svg>
  );
}

export default function GameScreen() {
  const navigation = useNavigation<GameNavigationProp>();
  const route = useRoute<GameRouteProp>();
  const isReadOnly = route.params?.isReadOnly ?? false;
  const insets = useSafeAreaInsets();
  const gameState = useVisibleGameState();
  const selectedPlanetId = useGameStore((s) => s.selectedPlanetId);
  const pendingFleet = useGameStore((s) => s.pendingFleet);
  const queuedOrders = useGameStore((s) => s.queuedOrders);
  const selectPlanet = useGameStore((s) => s.selectPlanet);
  const setPendingFleet = useGameStore((s) => s.setPendingFleet);
  const confirmPendingFleet = useGameStore((s) => s.confirmPendingFleet);
  const cancelQueuedOrder = useGameStore((s) => s.cancelQueuedOrder);
  const updateQueuedOrder = useGameStore((s) => s.updateQueuedOrder);
  const queueOrder = useGameStore((s) => s.queueOrder);
  const endTurn = useGameStore((s) => s.endTurn);
  const queueBuildOrder = useGameStore((s) => s.queueBuildOrder);
  const cancelBuildOrder = useGameStore((s) => s.cancelBuildOrder);
  const demolishBuilding = useGameStore((s) => s.demolishBuilding);
  const setProductionSlider = useGameStore((s) => s.setProductionSlider);
  const activeGameId = useGameStore((s) => s.activeGameId);
  const showingLockScreen = useGameStore((s) => s.showingLockScreen);
  const dismissLockScreen = useGameStore((s) => s.dismissLockScreen);
  const eliminatedPlayerPendingKnockout = useGameStore(
    (s) => s.eliminatedPlayerPendingKnockout,
  );
  const acknowledgeKnockout = useGameStore((s) => s.acknowledgeKnockout);
  const resetGame = useGameStore((s) => s.resetGame);
  const isAsyncGame = useGameStore((s) => {
    if (s.activeGameId === null) {
      return false;
    }
    const record = s.games.find((g) => g.id === s.activeGameId);
    return record?.asyncGameId != null;
  });
  const isSubmittingTurn = useGameStore((s) => s.isSubmittingTurn);
  const shouldReturnHome = useGameStore((s) => s.shouldReturnHome);
  const clearReturnHome = useGameStore((s) => s.clearReturnHome);
  const clearPendingTurnReport = useGameStore((s) => s.clearPendingTurnReport);
  const turnReport = useGameStore((s) => s.turnReport);
  const playerBattleArchiveByPlayerId = useGameStore(
    (s) => s.playerBattleArchiveByPlayerId,
  );
  const playerTurnReportByPlayerId = useGameStore(
    (s) => s.playerTurnReportByPlayerId,
  );
  const showingAiObserver = useGameStore((s) => s.showingAiObserver);
  const pendingAiTurnInput = useGameStore((s) => s.pendingAiTurnInput);
  const pendingAiPlayerId = useGameStore((s) => s.pendingAiPlayerId);
  const advanceStagedAiTurn = useGameStore((s) => s.advanceStagedAiTurn);

  const [dragOriginPlanetId, setDragOriginPlanetId] = useState<string | null>(null);
  const [measureDragOriginPlanetId, setMeasureDragOriginPlanetId] = useState<string | null>(
    null,
  );
  const [dragFingerLocal, setDragFingerLocal] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [dragDistanceLabel, setDragDistanceLabel] = useState<string | null>(null);
  const fleetDragActivatedRef = useRef(false);
  const measureDragActivatedRef = useRef(false);
  const fleetDragOriginPlanetRef = useRef<Planet | null>(null);
  const measureOriginPlanetRef = useRef<Planet | null>(null);
  const [outOfRangeMessage, setOutOfRangeMessage] = useState(false);
  const [showResearchModal, setShowResearchModal] = useState(false);
  const [showQueuedModal, setShowQueuedModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBattleReportModal, setShowBattleReportModal] = useState(false);
  const [planetBattleReportName, setPlanetBattleReportName] = useState<string | null>(null);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showStrategicMapModal, setShowStrategicMapModal] = useState(false);
  const [isSavingExit, setIsSavingExit] = useState(false);
  const [fleetTooltip, setFleetTooltip] = useState<{
    fleet: Fleet;
    absX: number;
    absY: number;
  } | null>(null);
  const [editingOrderIndex, setEditingOrderIndex] = useState<number | null>(null);
  const [isEditingFleetShipCount, setIsEditingFleetShipCount] = useState(false);
  const [fleetShipCountDraft, setFleetShipCountDraft] = useState('');
  const fleetShipCountInputRef = useRef<TextInput>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const mapAreaRef = useRef<View>(null);
  const mapAreaWindowRef = useRef({ x: 0, y: 0 });
  const initialSnapGameIdRef = useRef<string | null>(null);
  const prevShowingLockScreenRef = useRef(showingLockScreen);
  const prevShowingLockScreenBattleRef = useRef(showingLockScreen);
  const prevHumanCombatCountRef = useRef(0);
  const [mapViewportSize, setMapViewportSize] = useState({ width: 0, height: 0 });
  const [canAdvanceAi, setCanAdvanceAi] = useState(false);

  // Box-select state
  const [boxSelectMode, setBoxSelectMode] = useState(false);
  // 'idle' = mode on but not drawing; 'drawing' = drag in progress; 'awaiting_destination' = box released, waiting for destination tap
  const [boxSelectPhase, setBoxSelectPhase] = useState<'idle' | 'drawing' | 'awaiting_destination'>('idle');
  const [boxSelectRect, setBoxSelectRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [boxSelectedPlanetIds, setBoxSelectedPlanetIds] = useState<string[]>([]);
  const [boxSelectTooFarWarning, setBoxSelectTooFarWarning] = useState(false);

  useEffect(() => {
    if (gameState === null) {
      navigation.replace('Home');
    }
  }, [gameState, navigation]);

  useEffect(() => {
    if (!showingAiObserver) {
      setCanAdvanceAi(false);
      return;
    }
    const timeoutId = setTimeout(() => {
      setCanAdvanceAi(true);
    }, 300);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [showingAiObserver]);

  useEffect(() => {
    if (!shouldReturnHome) {
      return;
    }
    clearReturnHome();
    navigation.navigate('Home');
  }, [shouldReturnHome, clearReturnHome, navigation]);

  useEffect(() => {
    if (!isSubmittingTurn) {
      return;
    }
    const timeoutId = setTimeout(() => {
      if (useGameStore.getState().isSubmittingTurn) {
        useGameStore.setState({ isSubmittingTurn: false });
        showAlert(
          'Submit Timed Out',
          'The server took too long to respond. Check your connection and try End Turn again.',
        );
      }
    }, 45_000);
    return () => clearTimeout(timeoutId);
  }, [isSubmittingTurn]);

  const localHumanPlayerId = useMemo(
    () => (gameState !== null ? getLocalHumanPlayerId(gameState) : undefined),
    [gameState],
  );

  const viewingPlayerId = showingAiObserver ? pendingAiPlayerId ?? undefined : localHumanPlayerId;

  useEffect(() => {
    if (gameState === null || viewingPlayerId === undefined) {
      return;
    }
    if (selectedPlanetId !== null) {
      const p = gameState.map.planets.find((pl) => pl.id === selectedPlanetId);
      if (p === undefined || p.owner !== viewingPlayerId) {
        selectPlanet(null);
      }
    }
    if (dragOriginPlanetId !== null) {
      const p = gameState.map.planets.find((pl) => pl.id === dragOriginPlanetId);
      if (p === undefined || p.owner !== viewingPlayerId) {
        setDragOriginPlanetId(null);
        setDragFingerLocal(null);
      }
    }
  }, [
    gameState,
    viewingPlayerId,
    selectedPlanetId,
    dragOriginPlanetId,
    selectPlanet,
  ]);

  const humanPlayer = useMemo(
    () =>
      localHumanPlayerId !== undefined
        ? gameState?.players.find((p) => p.id === localHumanPlayerId)
        : undefined,
    [gameState?.players, localHumanPlayerId],
  );

  const humanCombatEvents = useMemo((): HumanCombatTurnEvent[] => {
    const archiveEvents = playerBattleArchiveByPlayerId[localHumanPlayerId ?? ''] ?? [];
    return archiveEvents.filter(
      (e): e is HumanCombatTurnEvent =>
        e.kind === 'combat' || e.kind === 'multiway_combat',
    );
  }, [playerBattleArchiveByPlayerId, localHumanPlayerId]);

  const sortedBattleReportCombatEvents = useMemo((): CombatTurnEvent[] => {
    return humanCombatEvents
      .filter((e): e is CombatTurnEvent => e.kind === 'combat')
      .sort((a, b) => {
        const aHome = a.isHomePlanetConquest === true ? 1 : 0;
        const bHome = b.isHomePlanetConquest === true ? 1 : 0;
        return bHome - aHome;
      });
  }, [humanCombatEvents]);

  const sortedBattleReportMultiwayEvents = useMemo((): MultiwayCombatTurnEvent[] => {
    return humanCombatEvents
      .filter((e): e is MultiwayCombatTurnEvent => e.kind === 'multiway_combat')
      .sort((a, b) => {
        const aHome = a.isHomePlanetConquest === true ? 1 : 0;
        const bHome = b.isHomePlanetConquest === true ? 1 : 0;
        return bHome - aHome;
      });
  }, [humanCombatEvents]);

  const playerTurnReport =
    playerTurnReportByPlayerId[localHumanPlayerId ?? ''] ?? [];

  const humanCombatByPlanetKey = useMemo(() => {
    const byKey = new Map<string, HumanCombatTurnEvent>();
    for (const event of humanCombatEvents) {
      byKey.set(event.planetId ?? event.planetName, event);
    }
    return byKey;
  }, [humanCombatEvents]);

  const battlePlanetKeys = useMemo(
    () => new Set(humanCombatEvents.map((event) => event.planetId ?? event.planetName)),
    [humanCombatEvents],
  );

  const reportResearchEvents = useMemo(
    () => playerTurnReport.filter((event) => event.kind === 'research_levelup'),
    [playerTurnReport],
  );
  const reportTroopLandingEvents = useMemo(
    () => playerTurnReport.filter((event) => event.kind === 'fleet_arrived'),
    [playerTurnReport],
  );
  const reportBuiltEvents = useMemo(
    () => playerTurnReport.filter((event) => event.kind === 'build_complete'),
    [playerTurnReport],
  );
  const reportSections = useMemo(() => {
    const sections: { label: string; events: TurnEvent[] }[] = [];
    if (humanCombatEvents.length > 0) {
      sections.push({ label: 'Battles', events: humanCombatEvents });
    }
    if (reportResearchEvents.length > 0) {
      sections.push({ label: 'Research', events: reportResearchEvents });
    }
    if (reportTroopLandingEvents.length > 0) {
      sections.push({ label: 'Troop Landings', events: reportTroopLandingEvents });
    }
    if (reportBuiltEvents.length > 0) {
      sections.push({ label: 'Built', events: reportBuiltEvents });
    }
    return sections;
  }, [
    humanCombatEvents,
    reportResearchEvents,
    reportTroopLandingEvents,
    reportBuiltEvents,
  ]);

  useEffect(() => {
    if (humanCombatEvents.length === 0) {
      setShowBattleReportModal(false);
    }
  }, [humanCombatEvents]);

  useEffect(() => {
    if (
      planetBattleReportName !== null &&
      !battlePlanetKeys.has(planetBattleReportName)
    ) {
      setPlanetBattleReportName(null);
    }
  }, [battlePlanetKeys, planetBattleReportName]);

  useEffect(() => {
    const wasShowing = prevShowingLockScreenBattleRef.current;
    prevShowingLockScreenBattleRef.current = showingLockScreen;
    if (!wasShowing || showingLockScreen) {
      return;
    }
    if (humanCombatEvents.length > 0) {
      setShowBattleReportModal(true);
    }
  }, [showingLockScreen, humanCombatEvents]);

  // For async games there is no lock screen to dismiss, so open the battle
  // report as soon as combat events arrive (e.g. on game load or after the
  // opponent's turn resolves). The showingLockScreen guard ensures this does
  // not fire for pass-and-play, where endTurn batches the archive update
  // together with showingLockScreen: true before this effect can run.
  useEffect(() => {
    const prev = prevHumanCombatCountRef.current;
    prevHumanCombatCountRef.current = humanCombatEvents.length;
    if (prev === 0 && humanCombatEvents.length > 0 && !showingLockScreen) {
      setShowBattleReportModal(true);
    }
  }, [humanCombatEvents, showingLockScreen]);

  const selectedPlanet = useMemo(
    () => gameState?.map.planets.find((p) => p.id === selectedPlanetId),
    [gameState?.map.planets, selectedPlanetId],
  );

  const activePlanetBattleEvent =
    planetBattleReportName !== null
      ? humanCombatByPlanetKey.get(planetBattleReportName)
      : undefined;

  const activePlanetBattleOutcome =
    activePlanetBattleEvent !== undefined &&
    localHumanPlayerId !== undefined &&
    gameState !== null
      ? getHumanBattleOutcomeIsVictory(
          activePlanetBattleEvent,
          localHumanPlayerId,
          gameState.players,
        )
      : null;

  const showPlanetBattleAboveModal =
    activePlanetBattleEvent !== undefined &&
    selectedPlanet !== undefined &&
    selectedPlanet.id === planetBattleReportName &&
    selectedPlanet.owner === localHumanPlayerId &&
    activePlanetBattleOutcome === true;

  const showPlanetBattleOnly =
    activePlanetBattleEvent !== undefined &&
    planetBattleReportName !== null &&
    activePlanetBattleOutcome === false;

  const dismissPlanetBattleReport = useCallback(() => {
    setPlanetBattleReportName(null);
  }, []);

  const dismissFleetTooltip = useCallback(() => {
    setFleetTooltip(null);
  }, []);

  const dismissPlanetDetail = useCallback(() => {
    selectPlanet(null);
    setPlanetBattleReportName(null);
  }, [selectPlanet]);

  const pendingOriginPlanet = useMemo(
    () => gameState?.map.planets.find((p) => p.id === pendingFleet?.fromPlanetId),
    [gameState?.map.planets, pendingFleet?.fromPlanetId],
  );

  const pendingDestPlanet = useMemo(
    () => gameState?.map.planets.find((p) => p.id === pendingFleet?.toPlanetId),
    [gameState?.map.planets, pendingFleet?.toPlanetId],
  );

  const pendingTransitInfo = useMemo(() => {
    if (
      pendingOriginPlanet === undefined ||
      pendingDestPlanet === undefined ||
      humanPlayer === undefined
    ) {
      return null;
    }
    const clickDist = computeClickDistance(
      pendingOriginPlanet.position,
      pendingDestPlanet.position,
    );
    const turnsInTransit = computeTurnsInTransit(
      pendingOriginPlanet.position,
      pendingDestPlanet.position,
      effectiveSpeed(humanPlayer.techLevel),
    );
    return {
      clickDistLabel: clickDist.toFixed(1),
      turnsInTransit,
    };
  }, [humanPlayer, pendingDestPlanet, pendingOriginPlanet]);

  const selectedPlanetFactories = useMemo(
    () =>
      selectedPlanet?.buildings.filter((building) => building.type === 'factory').length ?? 0,
    [selectedPlanet],
  );
  const selectedPlanetActiveFactories = useMemo(
    () =>
      selectedPlanet?.buildings.filter(
        (building) =>
          building.type === 'factory' && building.builtOnRound < (gameState?.roundNumber ?? -1),
      ).length ?? 0,
    [gameState?.roundNumber, selectedPlanet],
  );
  const selectedPlanetLiveTroopsPerTurn = useMemo(() => {
    if (selectedPlanet === undefined) {
      return 0;
    }
    const sliderValue = selectedPlanet.productionSlider;
    return (
      selectedPlanetActiveFactories *
      (FACTORY_TROOP_OUTPUT[selectedPlanet.class] ?? 0) *
      sliderValue
    );
  }, [selectedPlanet, selectedPlanetActiveFactories]);
  const selectedPlanetLiveGoldPerTurn = useMemo(() => {
    if (selectedPlanet === undefined) {
      return 0;
    }
    const sliderValue = selectedPlanet.productionSlider;
    return (
      selectedPlanetActiveFactories *
      (FACTORY_GOLD_OUTPUT[selectedPlanet.class] ?? 0) *
      (1 - sliderValue)
    );
  }, [selectedPlanet, selectedPlanetActiveFactories]);
  const selectedRoundNumber = gameState?.roundNumber ?? -1;
  const selectedPlanetCommittedBuildings = useMemo(
    () =>
      selectedPlanet?.buildings.filter(
        (building) => building.builtOnRound < selectedRoundNumber,
      ).length ?? 0,
    [selectedPlanet, selectedRoundNumber],
  );
  const selectedPlanetQueuedBuildsThisRound = useMemo(
    () =>
      selectedPlanet?.buildings.filter(
        (building) => building.builtOnRound === selectedRoundNumber,
      ).length ?? 0,
    [selectedPlanet, selectedRoundNumber],
  );
  const availableSlots = useMemo(() => {
    if (selectedPlanet === undefined) {
      return 0;
    }
    return (
      selectedPlanet.buildingSlots -
      selectedPlanetCommittedBuildings -
      selectedPlanetQueuedBuildsThisRound
    );
  }, [
    selectedPlanet,
    selectedPlanetCommittedBuildings,
    selectedPlanetQueuedBuildsThisRound,
  ]);
  const noBuildSlotsRemaining = availableSlots <= 0;
  const currentResearchThreshold = humanPlayer
    ? researchThreshold(humanPlayer.techLevel)
    : researchThreshold(0);
  const activeResearchLabCount =
    gameState && localHumanPlayerId !== undefined
      ? gameState.map.planets.reduce((count, planet) => {
          if (planet.owner !== localHumanPlayerId) {
            return count;
          }
          return (
            count +
            planet.buildings.filter(
              (building) =>
                building.type === 'researchLab' && building.builtOnRound < gameState.roundNumber,
            ).length
          );
        }, 0)
      : 0;
  const projectedTurnsToNextLevel =
    humanPlayer && humanPlayer.techLevel >= MAX_TECH_LEVEL
      ? null
      : activeResearchLabCount === 0
        ? '∞'
        : String(
            Math.ceil(
              Math.max(0, currentResearchThreshold - (humanPlayer?.researchPoints ?? 0)) /
                activeResearchLabCount,
            ),
          );

  const currentRound = gameState?.roundNumber ?? 0;

  const buildDisplayEntries = useMemo((): BuildDisplayEntry[] => {
    if (gameState === null || localHumanPlayerId === undefined) {
      return [];
    }
    const entries: BuildDisplayEntry[] = [];
    for (const planet of gameState.map.planets) {
      if (planet.owner !== localHumanPlayerId) {
        continue;
      }
      for (let buildingIndex = 0; buildingIndex < planet.buildings.length; buildingIndex++) {
        const building = planet.buildings[buildingIndex];
        if (building.builtOnRound === currentRound) {
          entries.push({
            planetId: planet.id,
            buildingType: building.type,
            buildingIndex,
          });
        }
      }
    }
    return entries;
  }, [gameState, localHumanPlayerId, currentRound]);

  const buildDisplayGroups = useMemo((): BuildDisplayGroup[] => {
    const groupMap = new Map<string, BuildDisplayGroup>();
    for (const entry of buildDisplayEntries) {
      const key = `${entry.planetId}:${entry.buildingType}`;
      let group = groupMap.get(key);
      if (group === undefined) {
        group = {
          planetId: entry.planetId,
          buildingType: entry.buildingType,
          buildingIndices: [],
        };
        groupMap.set(key, group);
      }
      group.buildingIndices.push(entry.buildingIndex);
    }
    return Array.from(groupMap.values());
  }, [buildDisplayEntries]);

  const queuedOrderCount = useMemo(() => {
    const fleetCount = queuedOrders.filter((order) => !isBuildOrder(order)).length;
    const buildsInQueue = queuedOrders.filter(isBuildOrder).length;
    const buildCount =
      buildsInQueue > 0 ? buildsInQueue : buildDisplayEntries.length;
    return fleetCount + buildCount;
  }, [queuedOrders, buildDisplayEntries]);

  const queuedModalItems = useMemo(() => {
    type ModalItem =
      | { kind: 'fleet'; order: PendingFleet; queueIndex: number }
      | { kind: 'build'; group: BuildDisplayGroup };

    const items: ModalItem[] = [];
    const addedGroupKeys = new Set<string>();
    let buildEntryIndex = 0;

    const addGroupForEntry = (entry: BuildDisplayEntry) => {
      const key = `${entry.planetId}:${entry.buildingType}`;
      if (addedGroupKeys.has(key)) {
        return;
      }
      const group = buildDisplayGroups.find(
        (g) => g.planetId === entry.planetId && g.buildingType === entry.buildingType,
      );
      if (group !== undefined) {
        items.push({ kind: 'build', group });
        addedGroupKeys.add(key);
      }
    };

    for (let queueIndex = 0; queueIndex < queuedOrders.length; queueIndex++) {
      const order = queuedOrders[queueIndex];
      if (isBuildOrder(order)) {
        const entry = buildDisplayEntries[buildEntryIndex];
        if (entry !== undefined) {
          addGroupForEntry(entry);
          buildEntryIndex++;
        }
      } else {
        items.push({ kind: 'fleet', order, queueIndex });
      }
    }

    for (; buildEntryIndex < buildDisplayEntries.length; buildEntryIndex++) {
      addGroupForEntry(buildDisplayEntries[buildEntryIndex]);
    }

    return items;
  }, [queuedOrders, buildDisplayEntries, buildDisplayGroups]);

  const observerEconomyModalRows = useMemo(() => {
    if (!showingAiObserver || pendingAiTurnInput === null || gameState === null) {
      return [] as { key: string; label: string }[];
    }
    const rows: { key: string; label: string }[] = [];
    for (const action of pendingAiTurnInput.actions) {
      if (action.type === 'BUILD') {
        const planetName =
          gameState.map.planets.find((p) => p.id === action.planetId)?.name ?? action.planetId;
        const label = buildTypeLabel(action.buildingType);
        rows.push({
          key: `ai-build-${action.planetId}-${action.buildingType}-${rows.length}`,
          label: `Build ${label} on ${planetName}`,
        });
      } else if (action.type === 'SET_PRODUCTION_SLIDER') {
        const planetName =
          gameState.map.planets.find((p) => p.id === action.planetId)?.name ?? action.planetId;
        rows.push({
          key: `ai-slider-${action.planetId}-${rows.length}`,
          label: `${planetName}: ${Math.round(action.value * 100)}% troops`,
        });
      }
    }
    return rows;
  }, [showingAiObserver, pendingAiTurnInput, gameState]);

  const queuedShipsPerPlanet = useMemo(() => {
    const map: Record<string, number> = {};
    for (const order of queuedOrders) {
      if (isBuildOrder(order)) {
        continue;
      }
      map[order.fromPlanetId] = (map[order.fromPlanetId] ?? 0) + order.shipCount;
    }
    return map;
  }, [queuedOrders]);

  const shipsAlreadyQueued = queuedOrders
    .filter(
      (o, i) =>
        !isBuildOrder(o) &&
        o.fromPlanetId === pendingFleet?.fromPlanetId &&
        i !== editingOrderIndex,
    )
    .reduce((sum, o) => sum + o.shipCount, 0);
  const modalMaxShips =
    pendingOriginPlanet !== undefined
      ? Math.max(0, pendingOriginPlanet.shipCount - shipsAlreadyQueued)
      : 0;

  useEffect(() => {
    if (pendingFleet === null) {
      setIsEditingFleetShipCount(false);
      setFleetShipCountDraft('');
    }
  }, [pendingFleet]);

  useEffect(() => {
    if (isEditingFleetShipCount) {
      fleetShipCountInputRef.current?.focus();
    }
  }, [isEditingFleetShipCount]);

  const applyFleetShipCountFromDraft = useCallback(() => {
    if (pendingFleet === null) {
      setIsEditingFleetShipCount(false);
      setFleetShipCountDraft('');
      return;
    }
    const shipCount = parseFleetShipCountFromDraft(
      fleetShipCountDraft,
      modalMaxShips,
      pendingFleet.shipCount,
    );
    setPendingFleet({ ...pendingFleet, shipCount });
    setIsEditingFleetShipCount(false);
    setFleetShipCountDraft('');
  }, [pendingFleet, fleetShipCountDraft, modalMaxShips, setPendingFleet]);

  const resolvedFleetShipCount =
    pendingFleet === null
      ? 0
      : isEditingFleetShipCount
        ? parseFleetShipCountFromDraft(
            fleetShipCountDraft,
            modalMaxShips,
            pendingFleet.shipCount,
          )
        : pendingFleet.shipCount;

  const scale = useSharedValue(DEFAULT_MAP_SCALE);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(DEFAULT_MAP_SCALE);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const pinchFocalX = useSharedValue(0);
  const pinchFocalY = useSharedValue(0);
  const pinchStartScale = useSharedValue(1);
  const pinchStartTranslateX = useSharedValue(0);
  const pinchStartTranslateY = useSharedValue(0);
  // isPinching blocks the pan gesture while a pinch is in progress, preventing
  // the two gestures from fighting over translateX and causing viewport jumps.
  const isPinching = useSharedValue(false);
  // Delta-based pan tracking: pan moves by the increment since the last frame
  // rather than accumulating from a fixed onStart baseline. This means the pan
  // self-corrects after a pinch modifies translateX without needing an explicit
  // baseline resync.
  const panPrevTranslationX = useSharedValue(0);
  const panPrevTranslationY = useSharedValue(0);
  const viewportWidth = useSharedValue(0);
  const viewportHeight = useSharedValue(0);
  const mapWidthSV = useSharedValue(1);
  const mapHeightSV = useSharedValue(1);
  const isFleetDragging = useSharedValue(false);

  // Box-select shared values (accessible from gesture worklets)
  const isBoxSelectModeSV = useSharedValue(false);
  // true only while the finger is actively drawing the selection rectangle
  const isBoxSelecting = useSharedValue(false);
  // true once the box is released and we're waiting for a destination tap
  const isBoxSelectAwaitingDestSV = useSharedValue(false);
  const boxSelectStartX = useSharedValue(0);
  const boxSelectStartY = useSharedValue(0);

  const measureMapArea = useCallback(() => {
    mapAreaRef.current?.measureInWindow((x, y) => {
      mapAreaWindowRef.current = { x, y };
    });
  }, []);

  const absoluteToMapLocal = useCallback((absoluteX: number, absoluteY: number) => {
    const { x: winX, y: winY } = mapAreaWindowRef.current;
    return { x: absoluteX - winX, y: absoluteY - winY };
  }, []);

  useEffect(() => {
    if (!outOfRangeMessage) {
      return;
    }
    const timer = setTimeout(() => setOutOfRangeMessage(false), 1500);
    return () => clearTimeout(timer);
  }, [outOfRangeMessage]);

  useEffect(() => {
    if (!boxSelectTooFarWarning) {
      return;
    }
    const timer = setTimeout(() => setBoxSelectTooFarWarning(false), 2000);
    return () => clearTimeout(timer);
  }, [boxSelectTooFarWarning]);

  useEffect(() => {
    if (buildError === null) {
      return;
    }
    const timer = setTimeout(() => setBuildError(null), 2000);
    return () => clearTimeout(timer);
  }, [buildError]);

  useEffect(() => {
    if (selectedPlanetId === null) {
      setBuildError(null);
    }
  }, [selectedPlanetId]);

  useEffect(() => {
    if (gameState === null) {
      return;
    }
    mapWidthSV.value = gameState.map.width * CELL_SIZE;
    mapHeightSV.value = gameState.map.height * CELL_SIZE;
  }, [gameState?.map.width, gameState?.map.height]);

  const animateMapToSnap = useCallback(
    (homePlanet: Planet) => {
      if (gameState === null) {
        return;
      }
      const viewW = viewportWidth.value;
      const viewH = viewportHeight.value;
      if (viewW <= 0 || viewH <= 0) {
        return;
      }
      const mapPixelWidth = gameState.map.width * CELL_SIZE;
      const mapPixelHeight = gameState.map.height * CELL_SIZE;
      const { scale: targetScale, translateX: targetTx, translateY: targetTy } =
        snapToHomePlanet(homePlanet, viewW, viewH, mapPixelWidth, mapPixelHeight);
      runOnUI(
        (snapScale: number, snapTx: number, snapTy: number) => {
          'worklet';
          scale.value = snapScale;
          translateX.value = snapTx;
          translateY.value = snapTy;
          savedScale.value = snapScale;
          savedTranslateX.value = snapTx;
          savedTranslateY.value = snapTy;
        },
      )(targetScale, targetTx, targetTy);
    },
    [gameState, scale, translateX, translateY, savedScale, savedTranslateX, savedTranslateY, viewportWidth, viewportHeight],
  );

  const snapToLocalHumanHomePlanet = useCallback(() => {
    if (gameState === null || localHumanPlayerId === undefined) {
      return;
    }
    const player = gameState.players.find((p) => p.id === localHumanPlayerId);
    if (player === undefined) {
      return;
    }
    const homePlanet = gameState.map.planets.find((p) => p.id === player.homePlanetId);
    if (homePlanet === undefined) {
      return;
    }
    animateMapToSnap(homePlanet);
  }, [animateMapToSnap, gameState, localHumanPlayerId]);

  useEffect(() => {
    if (
      gameState === null ||
      localHumanPlayerId === undefined ||
      activeGameId === null ||
      mapViewportSize.width <= 0 ||
      mapViewportSize.height <= 0
    ) {
      return;
    }
    if (initialSnapGameIdRef.current === activeGameId) {
      return;
    }
    initialSnapGameIdRef.current = activeGameId;
    snapToLocalHumanHomePlanet();
  }, [
    activeGameId,
    gameState,
    localHumanPlayerId,
    mapViewportSize.height,
    mapViewportSize.width,
    snapToLocalHumanHomePlanet,
  ]);

  useEffect(() => {
    const wasShowing = prevShowingLockScreenRef.current;
    prevShowingLockScreenRef.current = showingLockScreen;
    if (!wasShowing || showingLockScreen) {
      return;
    }
    if (mapViewportSize.width <= 0 || mapViewportSize.height <= 0) {
      return;
    }
    snapToLocalHumanHomePlanet();
  }, [
    mapViewportSize.height,
    mapViewportSize.width,
    showingLockScreen,
    snapToLocalHumanHomePlanet,
  ]);

  const pinch = Gesture.Pinch()
    .onStart((event) => {
      isPinching.value = true;
      pinchFocalX.value = event.focalX;
      pinchFocalY.value = event.focalY;
      pinchStartScale.value = scale.value;
      pinchStartTranslateX.value = translateX.value;
      pinchStartTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      const newScale = Math.min(4, Math.max(0.4, pinchStartScale.value * event.scale));
      const fx = pinchFocalX.value;
      const fy = pinchFocalY.value;
      // Correct focal-point formula: map point under the focal stays fixed.
      // screen = mapCoord * scale + translate  →  translate = screen - mapCoord * scale
      // mapCoord = (focalX - startTx) / startScale  (focal in map space at gesture start)
      const newTx =
        fx - (fx - pinchStartTranslateX.value) * (newScale / pinchStartScale.value);
      const newTy =
        fy - (fy - pinchStartTranslateY.value) * (newScale / pinchStartScale.value);
      // Do NOT clamp here. Clamping every frame fights the focal-point formula
      // at map edges, creating the "wall" where zooming near an edge jumps the
      // viewport away. Clamp once when the gesture ends instead.
      scale.value = newScale;
      translateX.value = newTx;
      translateY.value = newTy;
    })
    .onEnd(() => {
      isPinching.value = false;
      const clamped = clampTranslation(
        translateX.value,
        translateY.value,
        scale.value,
        mapWidthSV.value,
        mapHeightSV.value,
        viewportWidth.value,
        viewportHeight.value,
      );
      translateX.value = clamped.x;
      translateY.value = clamped.y;
      savedScale.value = scale.value;
      savedTranslateX.value = clamped.x;
      savedTranslateY.value = clamped.y;
    });

  const pan = Gesture.Pan()
    .minDistance(8)
    .onStart(() => {
      panPrevTranslationX.value = 0;
      panPrevTranslationY.value = 0;
    })
    .onUpdate((event) => {
      // Compute the delta since the last handled frame so the pan is
      // self-correcting after a pinch changes translateX mid-gesture.
      const dtx = event.translationX - panPrevTranslationX.value;
      const dty = event.translationY - panPrevTranslationY.value;
      panPrevTranslationX.value = event.translationX;
      panPrevTranslationY.value = event.translationY;
      // Bail out without writing translateX while a fleet drag, pinch, or
      // box-select draw is active.
      if (isFleetDragging.value || isPinching.value || isBoxSelecting.value) {
        return;
      }
      const clamped = clampTranslation(
        translateX.value + dtx,
        translateY.value + dty,
        scale.value,
        mapWidthSV.value,
        mapHeightSV.value,
        viewportWidth.value,
        viewportHeight.value,
      );
      translateX.value = clamped.x;
      translateY.value = clamped.y;
    })
    .onEnd(() => {
      if (isFleetDragging.value) {
        return;
      }
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const animatedStyle = useAnimatedStyle(() => ({
    // Keep logical map transform as: screen = map * scale + translate.
    // We explicitly compensate for default center-based scaling so this
    // holds regardless of transformOrigin support.
    transform: [
      {
        translateX:
          translateX.value + (mapWidthSV.value * (scale.value - 1)) / 2,
      },
      {
        translateY:
          translateY.value + (mapHeightSV.value * (scale.value - 1)) / 2,
      },
      { scale: scale.value },
    ],
  }), [translateX, translateY, mapWidthSV, mapHeightSV, scale]);

  const cancelDrag = useCallback(() => {
    fleetDragActivatedRef.current = false;
    fleetDragOriginPlanetRef.current = null;
    setDragOriginPlanetId(null);
    setDragFingerLocal(null);
    setDragDistanceLabel(null);
    runOnUI(() => {
      'worklet';
      isFleetDragging.value = false;
    })();
  }, []);

  const exitBoxSelect = useCallback(() => {
    setBoxSelectMode(false);
    setBoxSelectPhase('idle');
    setBoxSelectRect(null);
    setBoxSelectedPlanetIds([]);
    runOnUI(() => {
      'worklet';
      isBoxSelectModeSV.value = false;
      isBoxSelecting.value = false;
      isBoxSelectAwaitingDestSV.value = false;
    })();
  }, [isBoxSelectModeSV, isBoxSelecting, isBoxSelectAwaitingDestSV]);

  const handleBoxSelectEnd = useCallback(
    (x1: number, y1: number, x2: number, y2: number, s: number, tx: number, ty: number) => {
      if (gameState === null || localHumanPlayerId === undefined) {
        setBoxSelectPhase('idle');
        setBoxSelectRect(null);
        return;
      }

      const mapCorner1 = screenToMapCoords(x1, y1, s, tx, ty);
      const mapCorner2 = screenToMapCoords(x2, y2, s, tx, ty);
      const mapLeft = Math.min(mapCorner1.x, mapCorner2.x);
      const mapRight = Math.max(mapCorner1.x, mapCorner2.x);
      const mapTop = Math.min(mapCorner1.y, mapCorner2.y);
      const mapBottom = Math.max(mapCorner1.y, mapCorner2.y);

      const selectedIds: string[] = [];
      for (const planet of gameState.map.planets) {
        if (planet.owner !== localHumanPlayerId) {
          continue;
        }
        const center = planetCenterPx(planet);
        if (
          center.x >= mapLeft &&
          center.x <= mapRight &&
          center.y >= mapTop &&
          center.y <= mapBottom
        ) {
          const hasQueuedOrder = queuedOrders.some(
            (o) => !isBuildOrder(o) && o.fromPlanetId === planet.id,
          );
          if (planet.shipCount > 0 || hasQueuedOrder) {
            selectedIds.push(planet.id);
          }
        }
      }

      setBoxSelectRect(null);

      if (selectedIds.length === 0) {
        setBoxSelectPhase('idle');
      } else {
        setBoxSelectedPlanetIds(selectedIds);
        setBoxSelectPhase('awaiting_destination');
        runOnUI(() => {
          'worklet';
          isBoxSelectAwaitingDestSV.value = true;
          isBoxSelecting.value = false;
        })();
      }
    },
    [gameState, localHumanPlayerId, queuedOrders, isBoxSelectAwaitingDestSV, isBoxSelecting],
  );

  const handleBoxSelectSend = useCallback(
    (destinationPlanetId: string) => {
      if (gameState === null || humanPlayer === undefined || boxSelectedPlanetIds.length === 0) {
        setBoxSelectPhase('idle');
        setBoxSelectedPlanetIds([]);
        runOnUI(() => {
          'worklet';
          isBoxSelectAwaitingDestSV.value = false;
        })();
        return;
      }

      const destPlanet = gameState.map.planets.find((p) => p.id === destinationPlanetId);
      if (destPlanet === undefined) {
        setBoxSelectPhase('idle');
        setBoxSelectedPlanetIds([]);
        runOnUI(() => {
          'worklet';
          isBoxSelectAwaitingDestSV.value = false;
        })();
        return;
      }

      const range = effectiveRange(humanPlayer.techLevel);
      let someOutOfRange = false;

      // Collect all order indices to cancel from in-range selected planets
      const allIndicesToCancel: number[] = [];
      const planetsInRange: string[] = [];

      for (const planetId of boxSelectedPlanetIds) {
        if (planetId === destinationPlanetId) {
          continue;
        }
        const planet = gameState.map.planets.find((p) => p.id === planetId);
        if (planet === undefined) {
          continue;
        }
        if (!isInRange(planet.position, destPlanet.position, range)) {
          someOutOfRange = true;
          continue;
        }
        planetsInRange.push(planetId);
        // Collect existing queued order indices from this planet to cancel/redirect
        queuedOrders.forEach((o, i) => {
          if (!isBuildOrder(o) && o.fromPlanetId === planetId) {
            allIndicesToCancel.push(i);
          }
        });
      }

      // Cancel in descending index order so lower indices remain valid
      allIndicesToCancel.sort((a, b) => b - a);
      for (const idx of allIndicesToCancel) {
        cancelQueuedOrder(idx);
      }

      // Queue all available troops from each in-range planet to the destination
      for (const planetId of planetsInRange) {
        const planet = gameState.map.planets.find((p) => p.id === planetId);
        if (planet === undefined || planet.shipCount <= 0) {
          continue;
        }
        queueOrder({ fromPlanetId: planetId, toPlanetId: destinationPlanetId, shipCount: planet.shipCount });
      }

      if (someOutOfRange) {
        setBoxSelectTooFarWarning(true);
      }

      // Reset to idle (keep mode ON so user can make another selection)
      setBoxSelectPhase('idle');
      setBoxSelectedPlanetIds([]);
      runOnUI(() => {
        'worklet';
        isBoxSelectAwaitingDestSV.value = false;
      })();
    },
    [
      gameState,
      humanPlayer,
      boxSelectedPlanetIds,
      queuedOrders,
      cancelQueuedOrder,
      queueOrder,
      isBoxSelectAwaitingDestSV,
    ],
  );

  const handleDragStart = useCallback(
    (localX: number, localY: number, s: number, tx: number, ty: number) => {
      if (
        isReadOnly ||
        showingAiObserver ||
        gameState === null ||
        localHumanPlayerId === undefined ||
        boxSelectMode
      ) {
        return;
      }
      const mapPoint = screenToMapCoords(localX, localY, s, tx, ty);
      const planet = findPlanetAtMapCoords(
        mapPoint.x,
        mapPoint.y,
        gameState.map.planets,
        s,
      );
      if (planet === undefined || planet.owner !== localHumanPlayerId) {
        fleetDragOriginPlanetRef.current = null;
        return;
      }
      measureMapArea();
      fleetDragOriginPlanetRef.current = planet;
      setDragOriginPlanetId(planet.id);
      setDragFingerLocal(null);
      runOnUI(() => {
        'worklet';
        isFleetDragging.value = true;
      })();
    },
    [isReadOnly, showingAiObserver, gameState, localHumanPlayerId, measureMapArea, boxSelectMode],
  );

  const handleFleetPanUpdate = useCallback(
    (
      startX: number,
      startY: number,
      localX: number,
      localY: number,
      absoluteX: number,
      absoluteY: number,
      s: number,
      tx: number,
      ty: number,
    ) => {
      if (!fleetDragActivatedRef.current) {
        fleetDragActivatedRef.current = true;
        handleDragStart(startX, startY, s, tx, ty);
      }
      setDragFingerLocal(absoluteToMapLocal(absoluteX, absoluteY));
      const originPlanet = fleetDragOriginPlanetRef.current;
      if (originPlanet !== null) {
        const mapPoint = screenToMapCoords(localX, localY, s, tx, ty);
        setDragDistanceLabel(formatDragDistanceLabel(originPlanet, mapPoint.x, mapPoint.y));
      }
    },
    [absoluteToMapLocal, handleDragStart],
  );

  const handleMeasureDragStart = useCallback(
    (localX: number, localY: number, s: number, tx: number, ty: number) => {
      if (showingAiObserver || gameState === null || localHumanPlayerId === undefined || boxSelectMode) {
        return;
      }
      const mapPoint = screenToMapCoords(localX, localY, s, tx, ty);
      const planet = findPlanetAtMapCoords(
        mapPoint.x,
        mapPoint.y,
        gameState.map.planets,
        s,
      );
      if (planet === undefined || planet.owner === localHumanPlayerId) {
        measureOriginPlanetRef.current = null;
        return;
      }
      measureMapArea();
      measureOriginPlanetRef.current = planet;
      setMeasureDragOriginPlanetId(planet.id);
      setDragFingerLocal(null);
      runOnUI(() => {
        'worklet';
        isFleetDragging.value = true;
      })();
    },
    [showingAiObserver, gameState, localHumanPlayerId, measureMapArea, boxSelectMode],
  );

  const handleMeasureDragUpdate = useCallback(
    (
      localX: number,
      localY: number,
      absoluteX: number,
      absoluteY: number,
      s: number,
      tx: number,
      ty: number,
    ) => {
      const originPlanet = measureOriginPlanetRef.current;
      if (originPlanet === null) {
        return;
      }
      setDragFingerLocal(absoluteToMapLocal(absoluteX, absoluteY));
      const mapPoint = screenToMapCoords(localX, localY, s, tx, ty);
      setDragDistanceLabel(formatDragDistanceLabel(originPlanet, mapPoint.x, mapPoint.y));
    },
    [absoluteToMapLocal],
  );

  const handleMeasurePanUpdate = useCallback(
    (
      startX: number,
      startY: number,
      localX: number,
      localY: number,
      absoluteX: number,
      absoluteY: number,
      s: number,
      tx: number,
      ty: number,
    ) => {
      if (!measureDragActivatedRef.current) {
        measureDragActivatedRef.current = true;
        handleMeasureDragStart(startX, startY, s, tx, ty);
      }
      handleMeasureDragUpdate(localX, localY, absoluteX, absoluteY, s, tx, ty);
    },
    [handleMeasureDragStart, handleMeasureDragUpdate],
  );

  const handleMeasureDragFinalize = useCallback(() => {
    measureDragActivatedRef.current = false;
    measureOriginPlanetRef.current = null;
    setMeasureDragOriginPlanetId(null);
    if (fleetDragOriginPlanetRef.current === null) {
      setDragFingerLocal(null);
      setDragDistanceLabel(null);
    }
  }, []);

  const handleDragEnd = useCallback(
    (absoluteX: number, absoluteY: number, s: number, tx: number, ty: number) => {
      if (gameState === null || humanPlayer === undefined || dragOriginPlanetId === null) {
        fleetDragActivatedRef.current = false;
        setDragFingerLocal(null);
        runOnUI(() => {
          'worklet';
          isFleetDragging.value = false;
        })();
        return;
      }

      const originPlanet = gameState.map.planets.find((p) => p.id === dragOriginPlanetId);
      if (originPlanet === undefined) {
        cancelDrag();
        return;
      }

      const fingerLocal = absoluteToMapLocal(absoluteX, absoluteY);
      const mapPoint = screenToMapCoords(fingerLocal.x, fingerLocal.y, s, tx, ty);
      const destPlanet = findPlanetAtMapCoords(
        mapPoint.x,
        mapPoint.y,
        gameState.map.planets,
        s,
      );

      const fromPlanetId = dragOriginPlanetId;
      cancelDrag();

      if (destPlanet === undefined || destPlanet.id === fromPlanetId) {
        const ordersFromPlanet = queuedOrders
          .map((o, i) => ({ order: o, index: i }))
          .filter(({ order }) => !isBuildOrder(order) && order.fromPlanetId === fromPlanetId);
        if (ordersFromPlanet.length === 1) {
          const { order: existingOrder, index: orderIdx } = ordersFromPlanet[0];
          setEditingOrderIndex(orderIdx);
          setPendingFleet({
            fromPlanetId: existingOrder.fromPlanetId,
            toPlanetId: existingOrder.toPlanetId,
            shipCount: existingOrder.shipCount,
          });
        } else if (ordersFromPlanet.length > 1) {
          setShowQueuedModal(true);
        }
        return;
      }

      const range = effectiveRange(humanPlayer.techLevel);
      if (!isInRange(originPlanet.position, destPlanet.position, range)) {
        setOutOfRangeMessage(true);
        return;
      }

      const existingOrderIdx = queuedOrders.findIndex(
        (o) =>
          !isBuildOrder(o) &&
          o.fromPlanetId === fromPlanetId &&
          o.toPlanetId === destPlanet.id,
      );
      if (existingOrderIdx !== -1) {
        const existingOrder = queuedOrders[existingOrderIdx];
        setEditingOrderIndex(existingOrderIdx);
        setPendingFleet({
          fromPlanetId,
          toPlanetId: destPlanet.id,
          shipCount: existingOrder.shipCount,
        });
      } else {
        const shipsAlreadyQueuedFromOrigin = queuedOrders
          .filter((o) => !isBuildOrder(o) && o.fromPlanetId === fromPlanetId)
          .reduce((sum, o) => sum + o.shipCount, 0);
        const maxShips = Math.max(0, originPlanet.shipCount - shipsAlreadyQueuedFromOrigin);
        setPendingFleet({
          fromPlanetId,
          toPlanetId: destPlanet.id,
          shipCount: Math.min(1, maxShips),
        });
      }
    },
    [
      absoluteToMapLocal,
      cancelDrag,
      dragOriginPlanetId,
      gameState,
      humanPlayer,
      queuedOrders,
      setEditingOrderIndex,
      setPendingFleet,
    ],
  );

  const handleMapTap = useCallback(
    (localX: number, localY: number, s: number, tx: number, ty: number, absX: number, absY: number) => {
      // Don't process taps while the box is being drawn
      if (boxSelectPhase === 'drawing') {
        return;
      }

      // When awaiting a destination after box-select, route the tap to box select logic
      if (boxSelectPhase === 'awaiting_destination') {
        const store = useGameStore.getState();
        const record = store.getActiveRecord();
        if (record === null) {
          exitBoxSelect();
          return;
        }
        const mapPoint = screenToMapCoords(localX, localY, s, tx, ty);
        const planet = findPlanetAtMapCoords(mapPoint.x, mapPoint.y, record.state.map.planets, s);
        if (planet === undefined) {
          // Tap on empty space — deselect and exit box select
          exitBoxSelect();
          return;
        }
        handleBoxSelectSend(planet.id);
        return;
      }

      const store = useGameStore.getState();
      const record = store.getActiveRecord();
      if (record === null) {
        setFleetTooltip(null);
        return;
      }
      const freshHumanId = getLocalHumanPlayerId(record.state);
      const viewingPlayerId = store.showingAiObserver
        ? store.pendingAiPlayerId
        : freshHumanId;
      if (viewingPlayerId === undefined || viewingPlayerId === null) {
        setFleetTooltip(null);
        return;
      }
      const mapPoint = screenToMapCoords(localX, localY, s, tx, ty);
      const planet = findPlanetAtMapCoords(
        mapPoint.x,
        mapPoint.y,
        record.state.map.planets,
        s,
      );
      if (planet === undefined) {
        const fleet = findFleetAtMapCoords(
          mapPoint.x,
          mapPoint.y,
          record.state.fleets,
          record.state.map.planets,
          s,
        );
        if (fleet !== undefined) {
          setFleetTooltip({ fleet, absX, absY });
        } else {
          setFleetTooltip(null);
        }
        return;
      }

      setFleetTooltip(null);

      const combat =
        humanCombatByPlanetKey.get(planet.id) ?? humanCombatByPlanetKey.get(planet.name);

      if (combat !== undefined && freshHumanId !== undefined) {
        const outcomeIsVictory = getHumanBattleOutcomeIsVictory(
          combat,
          freshHumanId,
          record.state.players,
        );
        if (outcomeIsVictory === false) {
          store.selectPlanet(null);
          setPlanetBattleReportName(planet.id);
          return;
        }
        if (planet.owner === viewingPlayerId) {
          store.selectPlanet(planet.id);
          setPlanetBattleReportName(planet.id);
          return;
        }
      }

      if (planet.owner !== viewingPlayerId) {
        return;
      }
      store.selectPlanet(planet.id);
      setPlanetBattleReportName(null);
    },
    [humanCombatByPlanetKey, setPlanetBattleReportName, setFleetTooltip, boxSelectPhase, exitBoxSelect, handleBoxSelectSend],
  );

  const planetTap = Gesture.Tap()
    .maxDuration(300)
    .onEnd((event) => {
      runOnJS(handleMapTap)(
        event.x,
        event.y,
        scale.value,
        translateX.value,
        translateY.value,
        event.absoluteX,
        event.absoluteY,
      );
    });

  const fleetDrag = Gesture.Pan()
    .minDistance(10)
    .onUpdate((event) => {
      runOnJS(handleFleetPanUpdate)(
        event.x - event.translationX,
        event.y - event.translationY,
        event.x,
        event.y,
        event.absoluteX,
        event.absoluteY,
        scale.value,
        translateX.value,
        translateY.value,
      );
    })
    .onEnd((event) => {
      runOnJS(handleDragEnd)(
        event.absoluteX,
        event.absoluteY,
        scale.value,
        translateX.value,
        translateY.value,
      );
    })
    .onFinalize(() => {
      isFleetDragging.value = false;
    });

  const measureDrag = Gesture.Pan()
    .minDistance(10)
    .onUpdate((event) => {
      runOnJS(handleMeasurePanUpdate)(
        event.x - event.translationX,
        event.y - event.translationY,
        event.x,
        event.y,
        event.absoluteX,
        event.absoluteY,
        scale.value,
        translateX.value,
        translateY.value,
      );
    })
    .onFinalize(() => {
      isFleetDragging.value = false;
      runOnJS(handleMeasureDragFinalize)();
    });

  // Box-select drag: draws the selection rectangle when box select mode is active.
  // Uses minDistance(5) so it activates before the pan (minDistance 8), ensuring
  // isBoxSelecting is set before pan.onUpdate can run.
  const boxSelectDrag = Gesture.Pan()
    .minDistance(5)
    .onStart((event) => {
      // Only activate when mode is on and not already awaiting a destination tap
      if (!isBoxSelectModeSV.value || isBoxSelectAwaitingDestSV.value) {
        return;
      }
      isBoxSelecting.value = true;
      boxSelectStartX.value = event.x;
      boxSelectStartY.value = event.y;
      runOnJS(setBoxSelectRect)({ x1: event.x, y1: event.y, x2: event.x, y2: event.y });
      runOnJS(setBoxSelectPhase)('drawing');
    })
    .onUpdate((event) => {
      if (!isBoxSelecting.value) {
        return;
      }
      runOnJS(setBoxSelectRect)({
        x1: boxSelectStartX.value,
        y1: boxSelectStartY.value,
        x2: event.x,
        y2: event.y,
      });
    })
    .onEnd((event) => {
      if (!isBoxSelecting.value) {
        return;
      }
      runOnJS(handleBoxSelectEnd)(
        boxSelectStartX.value,
        boxSelectStartY.value,
        event.x,
        event.y,
        scale.value,
        translateX.value,
        translateY.value,
      );
    })
    .onFinalize(() => {
      // Only clear isBoxSelecting; awaiting-dest flag is managed by handleBoxSelectEnd
      if (!isBoxSelectAwaitingDestSV.value) {
        isBoxSelecting.value = false;
      }
    });

  const composed = Gesture.Simultaneous(pinch, pan);
  // Last gesture has highest priority — planetTap must win stationary taps over fleetDrag.
  const planetFleet = Gesture.Exclusive(fleetDrag, planetTap);
  const mapGesture = Gesture.Simultaneous(composed, planetFleet, measureDrag, boxSelectDrag);

  const handleConfirmFleet = () => {
    if (pendingFleet === null) {
      return;
    }

    const rawShipCount = isEditingFleetShipCount
      ? parseFleetShipCountFromDraft(
          fleetShipCountDraft,
          modalMaxShips,
          pendingFleet.shipCount,
        )
      : pendingFleet.shipCount;
    const shipCount = Math.min(modalMaxShips, Math.max(0, rawShipCount));

    setIsEditingFleetShipCount(false);
    setFleetShipCountDraft('');

    if (shipCount === 0) {
      if (editingOrderIndex !== null) {
        cancelQueuedOrder(editingOrderIndex);
      }
      setPendingFleet(null);
      setEditingOrderIndex(null);
      setDragOriginPlanetId(null);
      selectPlanet(null);
      return;
    }

    if (editingOrderIndex !== null) {
      updateQueuedOrder(editingOrderIndex, shipCount);
      setPendingFleet(null);
      setEditingOrderIndex(null);
    } else {
      setPendingFleet({ ...pendingFleet, shipCount });
      confirmPendingFleet();
    }
    selectPlanet(null);
  };

  const handleCloseBattleReport = useCallback(() => {
    if (eliminatedPlayerPendingKnockout) {
      acknowledgeKnockout();
    }
    setShowBattleReportModal(false);
    clearPendingTurnReport();
  }, [eliminatedPlayerPendingKnockout, acknowledgeKnockout, clearPendingTurnReport]);

  const handleNewGame = () => {
    resetGame();
    navigation.replace('Home');
  };

  const handleExitToHome = useCallback(() => {
    setShowHeaderMenu(false);
    navigation.navigate('Home');
  }, [navigation]);

  const handleExitGame = useCallback(async () => {
    setShowHeaderMenu(false);
    setIsSavingExit(true);

    const { getActiveRecord, queuedOrders: currentQueuedOrders } = useGameStore.getState();
    const record = getActiveRecord();

    if (record === null) {
      setIsSavingExit(false);
      return;
    }

    const asyncGameId = record.asyncGameId;
    if (!asyncGameId) {
      setIsSavingExit(false);
      navigation.navigate('Home');
      return;
    }

    try {
      await saveTurnProgress(asyncGameId, {
        partialStateJson: JSON.stringify(record.state),
        queuedOrders: currentQueuedOrders,
      });
      setIsSavingExit(false);
      navigation.navigate('Home');
    } catch (err) {
      console.error('[Exit Save] Failed:', err);
      showAlert('Failed to save', 'Could not save your progress. Please try again.');
      setIsSavingExit(false);
    }
  }, [navigation]);

  const handleViewRules = useCallback(async () => {
    setShowHeaderMenu(false);
    setIsSavingExit(true);

    const { getActiveRecord, queuedOrders: currentQueuedOrders } = useGameStore.getState();
    const record = getActiveRecord();

    if (record === null) {
      setIsSavingExit(false);
      return;
    }

    const asyncGameId = record.asyncGameId;
    if (!asyncGameId) {
      setIsSavingExit(false);
      navigation.navigate('Rules');
      return;
    }

    try {
      await saveTurnProgress(asyncGameId, {
        partialStateJson: JSON.stringify(record.state),
        queuedOrders: currentQueuedOrders,
      });
      setIsSavingExit(false);
      navigation.navigate('Rules');
    } catch (err) {
      console.error('[Rules Save] Failed:', err);
      showAlert('Failed to save', 'Could not save your progress. Please try again.');
      setIsSavingExit(false);
    }
  }, [navigation]);

  const handleBuildChipPress = (type: 'factory' | 'researchLab') => {
    if (selectedPlanet === undefined || noBuildSlotsRemaining) {
      return;
    }
    const result = queueBuildOrder(selectedPlanet.id, type);
    if (result === 'insufficient_gold') {
      setBuildError('Not enough gold');
    }
  };

  const handleFilledBuildingSlotPress = (slotIndex: number) => {
    if (selectedPlanet === undefined) {
      return;
    }
    const building = selectedPlanet.buildings[slotIndex];
    if (building === undefined) {
      return;
    }
    if (building.builtOnRound === selectedRoundNumber) {
      cancelBuildOrder(selectedPlanet.id, slotIndex);
      return;
    }
    if (building.builtOnRound < selectedRoundNumber) {
      showConfirm(
        'Demolish building?',
        'This cannot be undone. You will not receive your gold back.',
        () => demolishBuilding(selectedPlanet.id, slotIndex),
      );
    }
  };

  if (gameState === null || humanPlayer === undefined || localHumanPlayerId === undefined) {
    return <View style={styles.root} />;
  }

  const {
    map,
    players,
    fleets,
    roundNumber,
    currentPlayerId,
    status,
    winnerId,
  } = gameState;
  const mapPixelWidth = map.width * CELL_SIZE;
  const mapPixelHeight = map.height * CELL_SIZE;
  const isHumanTurn = status === 'active' && currentPlayerId === humanPlayer.id;
  const isKnockoutTurn = eliminatedPlayerPendingKnockout && isHumanTurn;
  const pendingAiPlayer = players.find((p) => p.id === pendingAiPlayerId) ?? null;
  const currentTurnPlayer = players.find((p) => p.id === currentPlayerId);
  const currentTurnPlayerName = currentTurnPlayer?.name ?? 'another commander';
  const humanWon = status === 'finished' && winnerId === humanPlayer.id;
  const winnerPlayer =
    winnerId !== null ? players.find((p) => p.id === winnerId) : undefined;

  const effectiveViewingPlayerId = viewingPlayerId ?? humanPlayer.id;

  const selectedPlanetFillColor =
    selectedPlanet !== undefined
      ? getPlanetColor(
          selectedPlanet,
          effectiveViewingPlayerId,
          showingAiObserver
            ? (pendingAiPlayer?.homePlanetId ?? humanPlayer.homePlanetId)
            : humanPlayer.homePlanetId,
        )
      : '#2e8a50';

  const dragOriginPlanet =
    dragOriginPlanetId !== null
      ? map.planets.find((p) => p.id === dragOriginPlanetId)
      : undefined;

  const measureDragOriginPlanet =
    measureDragOriginPlanetId !== null
      ? map.planets.find((p) => p.id === measureDragOriginPlanetId)
      : undefined;

  const dragLineOriginPlanet = dragOriginPlanet ?? measureDragOriginPlanet;

  const dragLineStart =
    dragLineOriginPlanet !== undefined
      ? (() => {
          const center = planetCenterPx(dragLineOriginPlanet);
          const s = scale.value;
          const tx = translateX.value;
          const ty = translateY.value;
          return { x: center.x * s + tx, y: center.y * s + ty };
        })()
      : null;

  return (
    <View style={styles.root}>
      <View style={[styles.statusBar, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.statusMain}>
          Turn {roundNumber} ·{' '}
          {showingAiObserver
            ? `Watching: ${pendingAiPlayer?.name ?? 'AI'}'s Turn`
            : isHumanTurn
              ? 'Your turn'
              : "AI's turn"}
        </Text>
        <Text style={styles.statusSub}>
          Gold {humanPlayer.gold} · Tech Level {humanPlayer.techLevel}
        </Text>
      </View>

      {isReadOnly && (
        <View style={styles.spectatorBanner}>
          <Text style={styles.spectatorBannerText}>
            It's {currentTurnPlayerName}'s turn
          </Text>
        </View>
      )}

      {(isHumanTurn || showingAiObserver) &&
        status === 'active' &&
        !isKnockoutTurn &&
        !isReadOnly && (
        <>
          <Pressable
            style={[styles.headerMenuTrigger, { top: insets.top + 8 }]}
            onPress={() => setShowHeaderMenu((prev) => !prev)}
            hitSlop={8}
          >
            <Text style={styles.headerMenuTriggerText}>⋮</Text>
          </Pressable>
          {showHeaderMenu && (
            <>
              <Pressable
                style={styles.headerMenuBackdrop}
                onPress={() => setShowHeaderMenu(false)}
              />
              <View style={[styles.headerMenuPanel, { top: insets.top + 8 + 36 }]}>
                <Pressable
                  style={styles.headerMenuRow}
                  onPress={() => {
                    setShowHeaderMenu(false);
                    setShowQueuedModal(true);
                  }}
                >
                  <Text style={styles.headerMenuRowText}>Queued</Text>
                  <View style={styles.headerMenuBadge}>
                    <Text style={styles.headerMenuBadgeText}>{queuedOrderCount}</Text>
                  </View>
                </Pressable>
                <Pressable
                  style={styles.headerMenuRow}
                  onPress={() => {
                    setShowHeaderMenu(false);
                    setShowResearchModal(true);
                  }}
                >
                  <Text style={styles.headerMenuRowText}>R&D</Text>
                </Pressable>
                <Pressable
                  style={styles.headerMenuRow}
                  onPress={() => {
                    setShowHeaderMenu(false);
                    setShowStrategicMapModal(true);
                  }}
                >
                  <Text style={styles.headerMenuRowText}>Map</Text>
                </Pressable>
                {humanCombatEvents.length > 0 && (
                  <Pressable
                    style={styles.headerMenuRow}
                    onPress={() => {
                      setShowHeaderMenu(false);
                      setShowBattleReportModal(true);
                    }}
                  >
                    <Text style={styles.headerMenuRowText}>Battles</Text>
                  </Pressable>
                )}
                <Pressable
                  style={styles.headerMenuRow}
                  onPress={() => {
                    setShowHeaderMenu(false);
                    setShowReportModal(true);
                  }}
                >
                  <Text style={styles.headerMenuRowText}>Report</Text>
                </Pressable>
                <Pressable
                  style={styles.headerMenuRow}
                  disabled={isSavingExit}
                  onPress={handleViewRules}
                >
                  <Text style={styles.headerMenuRowText}>📖 Rules</Text>
                  {isSavingExit && (
                    <ActivityIndicator size="small" color={COLORS.accent} />
                  )}
                </Pressable>
                {isAsyncGame ? (
                  <Pressable
                    style={styles.headerMenuRow}
                    disabled={isSavingExit}
                    onPress={handleExitGame}
                  >
                    <Text style={styles.headerMenuRowText}>Exit Game</Text>
                    {isSavingExit && (
                      <ActivityIndicator size="small" color={COLORS.accent} />
                    )}
                  </Pressable>
                ) : (
                  <Pressable style={styles.headerMenuRow} onPress={handleExitToHome}>
                    <Text style={styles.headerMenuRowText}>Exit to Home</Text>
                  </Pressable>
                )}
              </View>
            </>
          )}
        </>
      )}

      <View
        ref={mapAreaRef}
        style={styles.mapArea}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          viewportWidth.value = width;
          viewportHeight.value = height;
          setMapViewportSize((prev) =>
            prev.width === width && prev.height === height ? prev : { width, height },
          );
          measureMapArea();
        }}
      >
        {dragLineStart !== null && dragFingerLocal !== null && (
          <DragLine
            startX={dragLineStart.x}
            startY={dragLineStart.y}
            endX={dragFingerLocal.x}
            endY={dragFingerLocal.y}
          />
        )}
        {outOfRangeMessage && (
          <View style={styles.outOfRangeOverlay} pointerEvents="none">
            <Text style={styles.outOfRangeText}>Out of range</Text>
          </View>
        )}
        {boxSelectTooFarWarning && (
          <View style={styles.outOfRangeOverlay} pointerEvents="none">
            <Text style={styles.outOfRangeText}>Too far for some troops</Text>
          </View>
        )}
        {boxSelectRect !== null && boxSelectPhase === 'drawing' && (
          <View
            style={[
              styles.boxSelectRect,
              {
                left: Math.min(boxSelectRect.x1, boxSelectRect.x2),
                top: Math.min(boxSelectRect.y1, boxSelectRect.y2),
                width: Math.abs(boxSelectRect.x2 - boxSelectRect.x1),
                height: Math.abs(boxSelectRect.y2 - boxSelectRect.y1),
              },
            ]}
            pointerEvents="none"
          />
        )}
        {boxSelectPhase === 'awaiting_destination' && (
          <View style={styles.boxSelectHintOverlay} pointerEvents="none">
            <Text style={styles.boxSelectHintText}>Tap destination planet</Text>
          </View>
        )}
        <GestureDetector gesture={mapGesture}>
          <View style={styles.mapGestureHost}>
            <Animated.View
              style={[
                {
                  width: mapPixelWidth,
                  height: mapPixelHeight,
                },
                animatedStyle,
              ]}
            >
              {map.planets.map((planet) => (
                <PlanetNode
                  key={planet.id}
                  planet={planet}
                  color={getPlanetColor(
                    planet,
                    effectiveViewingPlayerId,
                    showingAiObserver
                      ? (pendingAiPlayer?.homePlanetId ?? humanPlayer.homePlanetId)
                      : humanPlayer.homePlanetId,
                  )}
                  isOwned={planet.owner === effectiveViewingPlayerId}
                  isSelected={planet.id === selectedPlanetId}
                  isDragOrigin={planet.id === dragOriginPlanetId}
                  isBoxSelected={boxSelectedPlanetIds.includes(planet.id)}
                  adjustedShipCount={Math.max(
                    0,
                    planet.shipCount - (queuedShipsPerPlanet[planet.id] ?? 0),
                  )}
                  hadBattleThisTurn={
                    battlePlanetKeys.has(planet.id) || battlePlanetKeys.has(planet.name)
                  }
                />
              ))}
              <FleetLayer
                fleets={fleets}
                planets={map.planets}
                queuedOrders={queuedOrders}
                humanPlayerId={humanPlayer.id}
                players={players}
                mapPixelWidth={mapPixelWidth}
                mapPixelHeight={mapPixelHeight}
              />
            </Animated.View>
          </View>
        </GestureDetector>
      </View>

      <Modal
        visible={pendingFleet !== null && !showingAiObserver}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsEditingFleetShipCount(false);
          setFleetShipCountDraft('');
          setPendingFleet(null);
          setEditingOrderIndex(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingOrderIndex !== null ? 'Edit Fleet' : 'Send Fleet'}</Text>
            {pendingOriginPlanet !== undefined && pendingDestPlanet !== undefined && (
              <Text style={styles.modalRoute}>
                {pendingOriginPlanet.name} → {pendingDestPlanet.name}
              </Text>
            )}
            {pendingTransitInfo !== null && (
              <Text style={styles.modalRouteInfo}>
                Distance: {pendingTransitInfo.clickDistLabel} clicks · ETA:{' '}
                {pendingTransitInfo.turnsInTransit} turn
                {pendingTransitInfo.turnsInTransit === 1 ? '' : 's'}
              </Text>
            )}
            <View style={styles.stepperRow}>
              <Text style={styles.sectionHint}>Ships</Text>
              <View style={styles.stepperControls}>
                <Pressable
                  style={styles.stepperBtn}
                  onPress={() => {
                    setIsEditingFleetShipCount(false);
                    setFleetShipCountDraft('');
                    if (pendingFleet !== null) {
                      setPendingFleet({
                        ...pendingFleet,
                        shipCount: Math.max(0, pendingFleet.shipCount - 1),
                      });
                    }
                  }}
                  disabled={pendingFleet === null || pendingFleet.shipCount <= 0}
                >
                  <Text style={styles.stepperBtnText}>−</Text>
                </Pressable>
                {isEditingFleetShipCount ? (
                  <TextInput
                    ref={fleetShipCountInputRef}
                    style={styles.stepperValueInput}
                    value={fleetShipCountDraft}
                    onChangeText={(text) =>
                      setFleetShipCountDraft(text.replace(/[^0-9]/g, ''))
                    }
                    onBlur={applyFleetShipCountFromDraft}
                    onSubmitEditing={applyFleetShipCountFromDraft}
                    keyboardType="number-pad"
                    selectTextOnFocus
                    maxLength={String(modalMaxShips).length || 1}
                  />
                ) : (
                  <Pressable
                    style={styles.stepperValuePressable}
                    onPress={() => {
                      if (pendingFleet === null) {
                        return;
                      }
                      setFleetShipCountDraft(String(pendingFleet.shipCount));
                      setIsEditingFleetShipCount(true);
                    }}
                    disabled={pendingFleet === null}
                  >
                    <Text style={styles.stepperValue}>{pendingFleet?.shipCount ?? 0}</Text>
                  </Pressable>
                )}
                <Pressable
                  style={styles.stepperBtn}
                  onPress={() => {
                    setIsEditingFleetShipCount(false);
                    setFleetShipCountDraft('');
                    if (pendingFleet !== null) {
                      setPendingFleet({
                        ...pendingFleet,
                        shipCount: Math.min(modalMaxShips, pendingFleet.shipCount + 1),
                      });
                    }
                  }}
                  disabled={
                    pendingFleet === null || pendingFleet.shipCount >= modalMaxShips
                  }
                >
                  <Text style={styles.stepperBtnText}>+</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.stepperAllBtn,
                    (pendingFleet === null ||
                      modalMaxShips === 0 ||
                      pendingFleet.shipCount >= modalMaxShips) &&
                      styles.stepperAllBtnDisabled,
                  ]}
                  onPress={() => {
                    setIsEditingFleetShipCount(false);
                    setFleetShipCountDraft('');
                    if (pendingFleet !== null) {
                      setPendingFleet({
                        ...pendingFleet,
                        shipCount: modalMaxShips,
                      });
                    }
                  }}
                  disabled={
                    pendingFleet === null ||
                    modalMaxShips === 0 ||
                    pendingFleet.shipCount >= modalMaxShips
                  }
                >
                  <Text
                    style={[
                      styles.stepperAllBtnText,
                      (pendingFleet === null ||
                        modalMaxShips === 0 ||
                        pendingFleet.shipCount >= modalMaxShips) &&
                        styles.stepperAllBtnTextDisabled,
                    ]}
                  >
                    All
                  </Text>
                </Pressable>
                <Text style={styles.stepperMax}>max {modalMaxShips}</Text>
              </View>
            </View>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => { setPendingFleet(null); setEditingOrderIndex(null); }}
              >
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={handleConfirmFleet}>
                <Text style={styles.primaryButtonText}>
                  {resolvedFleetShipCount === 0 ? 'Cancel Order' : 'Confirm'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={
          selectedPlanet !== undefined &&
          selectedPlanet.owner === viewingPlayerId
        }
        transparent
        animationType="fade"
        onRequestClose={dismissPlanetDetail}
      >
        <Pressable style={styles.modalBackdrop} onPress={dismissPlanetDetail}>
          <Pressable style={styles.planetModalStack} onPress={() => {}}>
            {showPlanetBattleAboveModal &&
              activePlanetBattleEvent !== undefined &&
              gameState !== null && (
                <View style={styles.planetBattleReportAbove}>
                  {activePlanetBattleEvent.kind === 'combat' ? (
                    <BattleReportCard
                      event={activePlanetBattleEvent}
                      localHumanPlayerId={localHumanPlayerId}
                      players={gameState.players}
                      turnEvents={turnReport}
                      planetClass={
                        gameState.map.planets.find(
                          (p) => p.name === activePlanetBattleEvent.planetName,
                        )?.class ?? ''
                      }
                    />
                  ) : (
                    <MultiwayBattleReportCard
                      event={activePlanetBattleEvent}
                      localHumanPlayerId={localHumanPlayerId}
                      players={gameState.players}
                      planetClass={
                        gameState.map.planets.find(
                          (p) => p.name === activePlanetBattleEvent.planetName,
                        )?.class ?? ''
                      }
                    />
                  )}
                </View>
              )}
            <Pressable style={styles.planetDetailCard} onPress={() => {}}>
            <View style={styles.planetDetailHeader}>
              <View style={styles.planetDetailHeaderSpacer} />
              <Text style={styles.planetDetailName}>{selectedPlanet?.name}</Text>
              <Pressable
                onPress={dismissPlanetDetail}
                hitSlop={12}
                style={styles.planetDetailHeaderClose}
              >
                <Text style={styles.planetDetailClose}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.planetInfoRow}>
              <View
                style={[styles.planetClassTile, { backgroundColor: selectedPlanetFillColor }]}
              >
                <Text style={styles.planetClassTileText}>
                  {displayPlanetClass(selectedPlanet?.class ?? '')}
                </Text>
              </View>
              <View style={styles.troopsSummary}>
                <Text style={styles.troopsSummaryValue}>{selectedPlanet?.shipCount ?? 0}</Text>
                <Text style={styles.troopsSummaryLabel}>troops</Text>
              </View>
            </View>

            {!showingAiObserver && (
              <View style={styles.buildChipRow}>
                <Pressable
                  style={[
                    styles.buildChip,
                    noBuildSlotsRemaining && styles.buildChipDisabled,
                  ]}
                  onPress={() => handleBuildChipPress('factory')}
                  disabled={noBuildSlotsRemaining}
                >
                  <Text
                    style={[
                      styles.buildChipText,
                      noBuildSlotsRemaining && styles.buildChipTextDisabled,
                    ]}
                  >
                    Factory
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.buildChip,
                    noBuildSlotsRemaining && styles.buildChipDisabled,
                  ]}
                  onPress={() => handleBuildChipPress('researchLab')}
                  disabled={noBuildSlotsRemaining}
                >
                  <Text
                    style={[
                      styles.buildChipText,
                      noBuildSlotsRemaining && styles.buildChipTextDisabled,
                    ]}
                  >
                    Research Lab
                  </Text>
                </Pressable>
              </View>
            )}

            {buildError !== null && (
              <Text style={styles.buildErrorLabel}>{buildError}</Text>
            )}

            <View style={styles.buildingSlotsGrid}>
              {Array.from({ length: selectedPlanet?.buildingSlots ?? 0 }).map((_, slotIndex) => {
                const building = selectedPlanet?.buildings[slotIndex];
                const slotFilled = building !== undefined;
                const slotStyle = [
                  styles.buildingSlotTile,
                  slotFilled ? styles.buildingSlotFilled : styles.buildingSlotEmpty,
                  slotFilled &&
                    building.builtOnRound === gameState.roundNumber &&
                    styles.buildingSlotUnderConstruction,
                ];
                if (!slotFilled) {
                  return <View key={`building-slot-${slotIndex}`} style={slotStyle} />;
                }
                if (showingAiObserver) {
                  return (
                    <View key={`building-slot-${slotIndex}`} style={slotStyle}>
                      <Text style={styles.buildingSlotLabel}>
                        {building.type === 'factory' ? '🏭' : '🔬'}
                      </Text>
                    </View>
                  );
                }
                return (
                  <Pressable
                    key={`building-slot-${slotIndex}`}
                    style={slotStyle}
                    onPress={() => handleFilledBuildingSlotPress(slotIndex)}
                  >
                    <Text style={styles.buildingSlotLabel}>
                      {building.type === 'factory' ? '🏭' : '🔬'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {!showingAiObserver && selectedPlanetFactories > 0 && (
              <View style={styles.productionSliderSection}>
                <PlatformSlider
                  minimumValue={0}
                  maximumValue={1}
                  value={selectedPlanet?.productionSlider ?? 0.5}
                  onValueChange={(value) => {
                    if (selectedPlanet !== undefined) {
                      setProductionSlider(selectedPlanet.id, value);
                    }
                  }}
                  minimumTrackTintColor={COLORS.accent}
                  maximumTrackTintColor={COLORS.border}
                  thumbTintColor={COLORS.accent}
                />
                <Text style={styles.productionSplitLabel}>
                  {Math.round((selectedPlanet?.productionSlider ?? 0.5) * 100)}% troops /{' '}
                  {100 - Math.round((selectedPlanet?.productionSlider ?? 0.5) * 100)}% gold
                </Text>
                <Text style={styles.productionOutputLabel}>
                  ⚔ {selectedPlanetLiveTroopsPerTurn.toFixed(1)} troops/turn · 💰{' '}
                  {selectedPlanetLiveGoldPerTurn.toFixed(1)} gold/turn
                </Text>
              </View>
            )}
          </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showPlanetBattleOnly}
        transparent
        animationType="fade"
        onRequestClose={dismissPlanetBattleReport}
      >
        <Pressable style={styles.modalBackdrop} onPress={dismissPlanetBattleReport}>
          <Pressable style={styles.planetBattleOnlyCard} onPress={() => {}}>
            {activePlanetBattleEvent !== undefined && gameState !== null && (
              activePlanetBattleEvent.kind === 'combat' ? (
                <BattleReportCard
                  event={activePlanetBattleEvent}
                  localHumanPlayerId={localHumanPlayerId}
                  players={gameState.players}
                  turnEvents={turnReport}
                  planetClass={
                    gameState.map.planets.find((p) => p.name === activePlanetBattleEvent.planetName)
                      ?.class ?? ''
                  }
                />
              ) : (
                <MultiwayBattleReportCard
                  event={activePlanetBattleEvent}
                  localHumanPlayerId={localHumanPlayerId}
                  players={gameState.players}
                  planetClass={
                    gameState.map.planets.find((p) => p.name === activePlanetBattleEvent.planetName)
                      ?.class ?? ''
                  }
                />
              )
            )}
            <Pressable
              style={[styles.primaryButton, styles.battleReportCloseButton]}
              onPress={dismissPlanetBattleReport}
            >
              <Text style={styles.primaryButtonText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showResearchModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResearchModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowResearchModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.researchHeader}>
              <Text style={styles.modalTitle}>Research Status</Text>
              <Pressable
                onPress={() => setShowResearchModal(false)}
                hitSlop={12}
                style={styles.researchCloseButton}
              >
                <Text style={styles.planetDetailClose}>✕</Text>
              </Pressable>
            </View>
            <Text style={styles.researchLine}>Tech Level {humanPlayer.techLevel}</Text>
            <Text style={styles.researchLine}>
              {humanPlayer.researchPoints} / {currentResearchThreshold} research points
            </Text>
            <Text style={styles.researchLine}>Active research labs: {activeResearchLabCount}</Text>
            {humanPlayer.techLevel >= MAX_TECH_LEVEL ? (
              <Text style={styles.researchProjection}>Maximum tech level reached</Text>
            ) : (
              <Text style={styles.researchProjection}>
                Turns to next level: {projectedTurnsToNextLevel}
              </Text>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <StrategicMapModal
        visible={showStrategicMapModal}
        onClose={() => setShowStrategicMapModal(false)}
        map={map}
        humanPlayerId={effectiveViewingPlayerId}
      />

      <Modal
        visible={showQueuedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQueuedModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowQueuedModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.researchHeader}>
              <Text style={styles.modalTitle}>Queued Orders</Text>
              <Pressable
                onPress={() => setShowQueuedModal(false)}
                hitSlop={12}
                style={styles.researchCloseButton}
              >
                <Text style={styles.planetDetailClose}>✕</Text>
              </Pressable>
            </View>
            {queuedModalItems.length === 0 && observerEconomyModalRows.length === 0 ? (
              <Text style={styles.queuedEmptyText}>No orders queued</Text>
            ) : (
              <>
              {queuedModalItems.map((item, index) => {
                if (item.kind === 'fleet') {
                  const { order, queueIndex } = item;
                  const originPlanet = map.planets.find((p) => p.id === order.fromPlanetId);
                  const destPlanet = map.planets.find((p) => p.id === order.toPlanetId);
                  const originLabel = originPlanet?.name ?? formatPlanetId(order.fromPlanetId);
                  const destLabel = destPlanet?.name ?? formatPlanetId(order.toPlanetId);
                  return (
                    <View
                      key={`fleet-${order.fromPlanetId}-${order.toPlanetId}-${queueIndex}`}
                      style={styles.queuedModalRow}
                    >
                      <Text style={styles.queuedModalText} numberOfLines={1}>
                        {originLabel} → {destLabel} · {order.shipCount}
                      </Text>
                      {!showingAiObserver && (
                        <Pressable onPress={() => cancelQueuedOrder(queueIndex)} hitSlop={8}>
                          <Text style={styles.queueOverlayCancelText}>✕</Text>
                        </Pressable>
                      )}
                    </View>
                  );
                }

                const { group } = item;
                const planet = map.planets.find((p) => p.id === group.planetId);
                const planetLabel = planet?.name ?? formatPlanetId(group.planetId);
                const typeLabel = buildTypeLabel(group.buildingType);
                const count = group.buildingIndices.length;
                const buildLabel =
                  count > 1
                    ? `${buildTypePrefix(group.buildingType)} ${planetLabel} — ${count}× ${typeLabel}`
                    : `${buildTypePrefix(group.buildingType)} ${planetLabel} — ${typeLabel}`;
                return (
                  <View
                    key={`build-${group.planetId}-${group.buildingType}-${index}`}
                    style={styles.queuedModalRow}
                  >
                    <Text style={styles.queuedModalText} numberOfLines={1}>
                      {buildLabel}
                    </Text>
                    {!showingAiObserver && (
                      <Pressable
                        onPress={() => {
                          [...group.buildingIndices]
                            .sort((a, b) => b - a)
                            .forEach((idx) => cancelBuildOrder(group.planetId, idx));
                        }}
                        hitSlop={8}
                      >
                        <Text style={styles.queueOverlayCancelText}>✕</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
              {observerEconomyModalRows.map((row) => (
                <View key={row.key} style={styles.queuedModalRow}>
                  <Text style={styles.queuedModalText} numberOfLines={1}>
                    {row.label}
                  </Text>
                </View>
              ))}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showReportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReportModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowReportModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.researchHeader}>
              <Text style={styles.modalTitle}>Turn Report</Text>
              <Pressable
                onPress={() => setShowReportModal(false)}
                hitSlop={12}
                style={styles.researchCloseButton}
              >
                <Text style={styles.planetDetailClose}>✕</Text>
              </Pressable>
            </View>
            {reportSections.length === 0 ? (
              <Text style={styles.queuedEmptyText}>Nothing to report this turn.</Text>
            ) : (
              <ScrollView style={styles.reportModalScroll} nestedScrollEnabled>
                {reportSections.map((section, sectionIndex) => (
                  <View key={section.label}>
                    {sectionIndex > 0 && <View style={styles.reportSectionDivider} />}
                    <Text
                      style={[
                        styles.reportSectionHeader,
                        sectionIndex === 0 && styles.reportSectionHeaderFirst,
                      ]}
                    >
                      {section.label}
                    </Text>
                    {section.label === 'Built'
                      ? groupBuildCompleteEvents(
                          section.events.filter(
                            (event): event is BuildCompleteTurnEvent =>
                              event.kind === 'build_complete',
                          ),
                        ).map((item, index) => (
                          <Text
                            key={`${section.label}-${item.planetName}-${item.buildingType}-${index}`}
                            style={styles.reportModalLine}
                          >
                            {formatGroupedBuildComplete(item)}
                          </Text>
                        ))
                      : section.events.map((event, index) =>
                          event.kind === 'fleet_arrived' ? (
                            <FleetArrivedReportCard
                              key={`${section.label}-${event.kind}-${index}`}
                              event={event}
                            />
                          ) : (
                            <Text
                              key={`${section.label}-${event.kind}-${index}`}
                              style={styles.reportModalLine}
                            >
                              {formatTurnEvent(
                                event,
                                localHumanPlayerId,
                                gameState?.players,
                                turnReport,
                              )}
                            </Text>
                          ),
                        )}
                  </View>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={
          showBattleReportModal &&
          !isSubmittingTurn &&
          (sortedBattleReportCombatEvents.length > 0 ||
            sortedBattleReportMultiwayEvents.length > 0)
        }
        transparent
        animationType="fade"
        onRequestClose={handleCloseBattleReport}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Battle Report</Text>
            {isKnockoutTurn && (
              <Text style={styles.knockoutBanner}>You have been knocked out of the game!</Text>
            )}
            <ScrollView style={styles.battleReportScroll} nestedScrollEnabled>
              {sortedBattleReportCombatEvents.map((event, index) => (
                <BattleReportCard
                  key={`combat-${event.planetName}-${index}`}
                  event={event}
                  localHumanPlayerId={localHumanPlayerId}
                  players={gameState?.players ?? []}
                  turnEvents={turnReport}
                  homePlanetConquestHighlight={isHumanHomePlanetConquestVictory(
                    event,
                    localHumanPlayerId,
                    gameState?.players ?? [],
                  )}
                  planetClass={
                    gameState?.map.planets.find((p) => p.name === event.planetName)?.class ?? ''
                  }
                />
              ))}
              {sortedBattleReportMultiwayEvents.map((event, index) => (
                <MultiwayBattleReportCard
                  key={`multiway-${event.planetName}-${index}`}
                  event={event}
                  localHumanPlayerId={localHumanPlayerId}
                  players={gameState?.players ?? []}
                  planetClass={
                    gameState?.map.planets.find((p) => p.name === event.planetName)?.class ?? ''
                  }
                />
              ))}
            </ScrollView>
            <Pressable
              style={[styles.primaryButton, styles.battleReportCloseButton]}
              onPress={handleCloseBattleReport}
            >
              <Text style={styles.primaryButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={status === 'finished' && humanWon}
        transparent
        animationType="fade"
        onRequestClose={handleNewGame}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.victoryModalTitle}>Victory</Text>
            <Text style={styles.victoryModalMessage}>
              You are the last player standing! The galaxy is yours.
            </Text>
            <Pressable style={styles.primaryButton} onPress={handleNewGame}>
              <Text style={styles.primaryButtonText}>Return to Home</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={status === 'finished' && !humanWon}
        transparent
        animationType="fade"
        onRequestClose={handleNewGame}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Game Over</Text>
            <Text style={styles.victoryModalMessage}>
              {winnerPlayer !== undefined
                ? `${winnerPlayer.name} is the last player standing.`
                : 'The galaxy has a new ruler.'}
            </Text>
            <Pressable style={styles.primaryButton} onPress={handleNewGame}>
              <Text style={styles.primaryButtonText}>Return to Home</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {isHumanTurn &&
        !showingAiObserver &&
        status === 'active' &&
        !isKnockoutTurn &&
        !isReadOnly && (
        <>
          <Pressable
            style={[
              styles.endTurnButton,
              { bottom: insets.bottom + 16 },
              isSubmittingTurn && styles.endTurnButtonDisabled,
            ]}
            disabled={isSubmittingTurn}
            onPress={() => {
              cancelDrag();
              exitBoxSelect();
              endTurn();
              dismissPlanetDetail();
            }}
          >
            <Text style={styles.endTurnButtonText}>End Turn</Text>
          </Pressable>
          <Pressable
            style={[
              styles.boxSelectToggle,
              { bottom: insets.bottom + 16 },
              boxSelectMode && styles.boxSelectToggleActive,
            ]}
            accessibilityLabel={
              boxSelectPhase === 'awaiting_destination'
                ? 'Box select: tap destination planet'
                : boxSelectMode
                  ? 'Turn off box select'
                  : 'Turn on box select'
            }
            accessibilityRole="button"
            onPress={() => {
              if (boxSelectMode) {
                exitBoxSelect();
              } else {
                setBoxSelectMode(true);
                setBoxSelectPhase('idle');
                runOnUI(() => {
                  'worklet';
                  isBoxSelectModeSV.value = true;
                  isBoxSelecting.value = false;
                  isBoxSelectAwaitingDestSV.value = false;
                })();
              }
            }}
          >
            <BoxSelectToggleIcon
              variant={boxSelectPhase === 'awaiting_destination' ? 'target' : 'select'}
              color={boxSelectMode ? '#e0f7f9' : COLORS.text}
            />
          </Pressable>
        </>
      )}

      {showingAiObserver && (
        <Pressable
          style={[
            styles.endTurnButton,
            { bottom: insets.bottom + 16 },
            !canAdvanceAi && styles.endTurnButtonDisabled,
          ]}
          disabled={!canAdvanceAi}
          onPress={() => {
            cancelDrag();
            advanceStagedAiTurn();
            dismissPlanetDetail();
          }}
        >
          <Text style={styles.endTurnButtonText}>End Turn</Text>
        </Pressable>
      )}

      {fleetTooltip !== null && gameState !== null && localHumanPlayerId !== undefined && (
        <FleetTooltipOverlay
          tooltip={fleetTooltip}
          players={gameState.players}
          localHumanPlayerId={localHumanPlayerId}
          onDismiss={dismissFleetTooltip}
        />
      )}

      {dragDistanceLabel !== null && (
        <View
          style={[styles.dragDistancePill, { bottom: insets.bottom + 120 }]}
          pointerEvents="none"
        >
          <Text style={styles.dragDistancePillText}>{dragDistanceLabel}</Text>
        </View>
      )}

      {showingLockScreen && !isAsyncGame && (
        <View style={[styles.lockScreen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <Text style={styles.lockTitle}>Pass the device</Text>
          <Text style={styles.lockTurnNumber}>Turn {roundNumber}</Text>
          <Text style={styles.lockPlayerName}>{currentTurnPlayerName}'s turn</Text>
          <Pressable style={styles.lockExitButton} onPress={handleExitToHome}>
            <Text style={styles.lockExitButtonText}>Exit</Text>
          </Pressable>
          <Pressable style={styles.lockStartButton} onPress={dismissLockScreen}>
            <Text style={styles.lockStartButtonText}>Start Turn</Text>
          </Pressable>
        </View>
      )}

      {isSubmittingTurn && (
        <View style={styles.submittingOverlay} pointerEvents="auto">
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.submittingOverlayText}>Submitting turn…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG_COLOR,
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
  spectatorBanner: {
    backgroundColor: '#f0a500',
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
  },
  spectatorBannerText: {
    color: '#1c1c2e',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  mapArea: {
    flex: 1,
    backgroundColor: BG_COLOR,
    overflow: 'hidden',
  },
  mapGestureHost: {
    flex: 1,
  },
  dragLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: COLORS.accent,
    opacity: 0.9,
    zIndex: 10,
    transformOrigin: 'left center',
  },
  outOfRangeOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  outOfRangeText: {
    color: COLORS.defeat,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
    backgroundColor: 'rgba(20, 18, 40, 0.55)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  planetTouchTarget: {
    position: 'absolute',
    width: PLANET_SIZE_SELECTED,
    height: PLANET_SIZE_SELECTED,
  },
  planetCircle: {
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planetNameLabel: {
    position: 'absolute',
    width: PLANET_NAME_LABEL_WIDTH,
    left: '50%',
    marginLeft: -PLANET_NAME_LABEL_WIDTH / 2,
    textAlign: 'center',
    color: COLORS.text,
    fontSize: PLANET_LABEL_FONT_SIZE,
    lineHeight: PLANET_LABEL_FONT_SIZE + 1,
  },
  planetNameLabelFogged: {
    color: COLORS.textMuted,
  },
  planetClassLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: PLANET_CLASS_FONT_SIZE,
    fontWeight: '600',
    letterSpacing: 0,
  },
  planetClassLabelFogged: {
    color: COLORS.background,
  },
  shipCountLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    color: COLORS.text,
    fontSize: SHIP_COUNT_FONT_SIZE,
    textAlign: 'center',
  },
  fleetLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
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
  dragHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  gameOverOverlay: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 80,
    backgroundColor: COLORS.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    zIndex: 10,
    alignItems: 'center',
  },
  queuedEmptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  queuedModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
  },
  queuedModalText: {
    color: COLORS.text,
    fontSize: 13,
    flex: 1,
  },
  reportModalScroll: {
    maxHeight: 280,
    marginTop: 4,
  },
  reportModalLine: {
    color: COLORS.text,
    fontSize: 13,
    marginTop: 10,
  },
  reportSectionHeader: {
    fontWeight: 'bold',
    fontSize: 15,
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 4,
  },
  reportSectionHeaderFirst: {
    marginTop: 0,
  },
  reportSectionDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginTop: 10,
    marginBottom: 2,
  },
  battleReportScroll: {
    maxHeight: 360,
    marginTop: 8,
    marginBottom: 12,
  },
  battleReportCard: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
    marginBottom: 10,
  },
  battleReportRoundLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 4,
  },
  fleetArrivedReportCard: {
    marginTop: 4,
  },
  fleetArrivedPlanetName: {
    fontWeight: '600',
  },
  fleetArrivedAttackerName: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  battleReportCardWrapper: {
    marginBottom: 0,
  },
  homePlanetConquestBanner: {
    color: '#2255cc',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  battleReportCardVictory: {
    backgroundColor: 'rgba(39, 107, 64, 0.12)',
  },
  battleReportCardHomeConquest: {
    backgroundColor: '#e8eeff',
    borderLeftColor: '#2255cc',
    borderLeftWidth: 4,
  },
  battleReportCardDefeat: {
    backgroundColor: 'rgba(184, 48, 48, 0.12)',
  },
  battleReportHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  battleReportPlanetCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: NEUTRAL_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  battleReportPlanetCircleText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  battleReportHeaderCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  battleReportPlanetName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  battleReportHeaderEnd: {
    width: 34,
    alignItems: 'flex-end',
  },
  battleReportOutcomeBadge: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 30,
  },
  battleReportOutcomeWin: {
    color: COLORS.victory,
  },
  battleReportOutcomeLoss: {
    color: COLORS.defeat,
  },
  battleReportTroopColumn: {
    alignItems: 'center',
    flex: 1,
  },
  battleReportTroopCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  battleReportTroopCount: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  battleReportTroopIcon: {
    fontSize: 22,
  },
  battleReportTroopLabelYou: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.victory,
    marginTop: 4,
  },
  battleReportTroopLabelOpponent: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  battleReportTroopsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  battleReportVsColumn: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  battleReportVsText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  battleReportRemainingRow: {
    marginTop: 12,
    alignItems: 'center',
  },
  battleReportRemainingText: {
    fontSize: 15,
    fontWeight: '700',
  },
  battleReportRemainingVictory: {
    color: COLORS.victory,
  },
  battleReportRemainingDefeat: {
    color: COLORS.defeat,
  },
  battleReportRemainingNeutral: {
    color: COLORS.textMuted,
  },
  battleReportMultiwayParticipantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
    gap: 8,
  },
  battleReportMultiwayParticipantName: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  battleReportMultiwayParticipantNameWinner: {
    fontWeight: '600',
  },
  battleReportMultiwayParticipantShips: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  battleReportMultiwayEliminated: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  planetBattleIcon: {
    position: 'absolute',
    fontSize: PLANET_BATTLE_ICON_FONT_SIZE,
    lineHeight: PLANET_BATTLE_ICON_FONT_SIZE + 2,
  },
  planetModalStack: {
    width: '90%',
    maxWidth: 360,
    alignItems: 'center',
  },
  planetBattleReportAbove: {
    width: '100%',
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
  },
  planetBattleOnlyCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
  },
  battleReportLine: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  battleReportOutcomeNeutral: {
    color: COLORS.textMuted,
  },
  battleReportCloseButton: {
    marginTop: 4,
  },
  queueOverlayCancelText: {
    color: COLORS.defeat,
    fontSize: 13,
    fontWeight: '700',
  },
  endTurnButton: {
    position: 'absolute',
    right: 16,
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  endTurnButtonText: {
    color: COLORS.background,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  endTurnButtonDisabled: {
    opacity: 0.5,
  },
  boxSelectToggle: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  boxSelectToggleActive: {
    backgroundColor: '#007a84',
    borderColor: '#00c9d4',
  },
  boxSelectRect: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#00c9d4',
    backgroundColor: 'rgba(0, 201, 212, 0.08)',
    zIndex: 20,
  },
  boxSelectHintOverlay: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 20,
    pointerEvents: 'none',
  } as const,
  boxSelectHintText: {
    color: '#00c9d4',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(20, 18, 40, 0.65)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    overflow: 'hidden',
  },
  headerMenuTrigger: {
    position: 'absolute',
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  headerMenuTriggerText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: -2,
  },
  headerMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 49,
  },
  headerMenuPanel: {
    position: 'absolute',
    right: 16,
    minWidth: 160,
    backgroundColor: COLORS.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 4,
    zIndex: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  headerMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 12,
  },
  headerMenuRowText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  headerMenuBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
  },
  headerMenuBadgeText: {
    color: COLORS.background,
    fontSize: 11,
    fontWeight: '700',
  },
  planetSection: {
    marginBottom: 12,
  },
  sectionHint: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  stepperRow: {
    marginBottom: 10,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
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
  stepperValuePressable: {
    minWidth: 28,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepperValueInput: {
    color: COLORS.text,
    fontSize: 18,
    minWidth: 40,
    textAlign: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.background,
  },
  stepperMax: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  stepperAllBtn: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperAllBtnDisabled: {
    borderColor: COLORS.border,
    opacity: 0.5,
  },
  stepperAllBtnText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  stepperAllBtnTextDisabled: {
    color: COLORS.textMuted,
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 8,
  },
  knockoutBanner: {
    color: '#cc3300',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  victoryModalTitle: {
    color: COLORS.victory,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  victoryModalMessage: {
    color: COLORS.text,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  researchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  researchCloseButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 28,
    alignItems: 'flex-end',
  },
  researchLine: {
    color: COLORS.text,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  researchProjection: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  modalRoute: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 6,
  },
  modalRouteInfo: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalBtnPrimary: {
    backgroundColor: COLORS.accent,
  },
  modalBtnSecondary: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalBtnSecondaryText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  planetDetailCard: {
    width: '90%',
    maxWidth: 360,
    backgroundColor: COLORS.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
  },
  planetDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  planetDetailHeaderSpacer: {
    width: 28,
  },
  planetDetailHeaderClose: {
    width: 28,
    alignItems: 'flex-end',
  },
  planetDetailName: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
    flex: 1,
    textAlign: 'center',
  },
  planetDetailClose: {
    color: COLORS.textMuted,
    fontSize: 20,
    fontWeight: '600',
  },
  planetInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  planetClassTile: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planetClassTileText: {
    color: COLORS.background,
    fontSize: 24,
    fontWeight: '700',
  },
  troopsSummary: {
    flex: 1,
    alignItems: 'center',
  },
  troopsSummaryValue: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
  },
  troopsSummaryLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    textTransform: 'lowercase',
  },
  buildChipRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  buildChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  buildChipDisabled: {
    opacity: 0.45,
  },
  buildChipActive: {
    borderColor: COLORS.accent,
    backgroundColor: '#1a2a44',
  },
  buildChipText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  buildChipTextDisabled: {
    color: '#5c5c7c',
  },
  buildChipTextActive: {
    color: COLORS.text,
  },
  buildErrorLabel: {
    color: COLORS.defeat,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  buildingSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  buildingSlotTile: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buildingSlotEmpty: {
    borderColor: COLORS.border,
    backgroundColor: 'transparent',
  },
  buildingSlotFilled: {
    borderColor: '#2d4e7c',
    backgroundColor: '#243c5f',
  },
  buildingSlotUnderConstruction: {
    opacity: 0.35,
  },
  buildingSlotLabel: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
  },
  productionSliderSection: {
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
  lockScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    backgroundColor: BG_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 2,
    marginBottom: 16,
  },
  lockTurnNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  lockPlayerName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.5,
    marginBottom: 32,
  },
  lockExitButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 32,
    minWidth: 200,
    alignItems: 'center',
    marginBottom: 12,
  },
  lockExitButtonText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  lockStartButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    minWidth: 200,
    alignItems: 'center',
  },
  lockStartButtonText: {
    color: COLORS.background,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  submittingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  submittingOverlayText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  dragDistancePill: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 15,
  },
  dragDistancePillText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  fleetTooltip: {
    position: 'absolute',
    flexDirection: 'row',
    backgroundColor: 'rgba(20, 18, 40, 0.78)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    zIndex: 20,
    minWidth: 200,
    maxWidth: 280,
  },
  fleetTooltipAccent: {
    width: 4,
  },
  fleetTooltipBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  fleetTooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  fleetTooltipClose: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  fleetTooltipCloseText: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 14,
    fontWeight: '600',
  },
  fleetTooltipShips: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  fleetTooltipTurns: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '500',
  },
});

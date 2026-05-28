import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated as RNAnimated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Slider from '@react-native-community/slider';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';
import Animated, {
  runOnJS,
  runOnUI,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../App';
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
import type { Fleet, OwnerId, Planet, Player } from '../game/types';
import {
  getLocalHumanPlayerId,
  type PendingFleet,
  useGameStore,
  useVisibleGameState,
} from '../store/gameStore';

type GameNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Game'>;

const CELL_SIZE = 11;
const PLANET_HIT_RADIUS = CELL_SIZE * 2.5;
// Visual sizes scaled from prior CELL_SIZE=18 baseline (~61% spacing)
const PLANET_SIZE = Math.round((14 / 18) * CELL_SIZE);
const PLANET_SIZE_SELECTED = Math.round((16 / 18) * CELL_SIZE);
const PLANET_NAME_LABEL_WIDTH = Math.round((48 / 18) * CELL_SIZE);
const PLANET_NAME_LABEL_TOP = Math.round((-11 / 18) * CELL_SIZE);
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

function getPlanetColor(planet: Planet, humanPlayerId: string): string {
  if (planet.owner === humanPlayerId) {
    return '#27ae60'; // green — current player's own planet
  }
  if (planet.owner === 'neutral') {
    return '#2a2a4a'; // very dim — neutral, no detail known
  }
  // All other planets are enemy-owned; the fog layer zeroes their shipCount
  // so they are visible only as gray blobs
  return '#333355'; // gray — enemy planet, fogged
}

function getOwnerName(ownerId: OwnerId, players: Player[]): string {
  if (ownerId === 'neutral') {
    return 'Neutral';
  }
  return players.find((p) => p.id === ownerId)?.name ?? ownerId;
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
): Planet | undefined {
  let best: Planet | undefined;
  let bestDist = Infinity;
  for (const planet of planets) {
    const center = planetCenterPx(planet);
    const dx = mapX - center.x;
    const dy = mapY - center.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= PLANET_HIT_RADIUS && dist < bestDist) {
      bestDist = dist;
      best = planet;
    }
  }
  return best;
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
  const maxOffsetX = Math.max(0, mapW * currentScale - viewW);
  const maxOffsetY = Math.max(0, mapH * currentScale - viewH);
  const minX = -maxOffsetX;
  const maxX = 0;
  const minY = -maxOffsetY;
  const maxY = 0;
  return {
    x: Math.min(maxX, Math.max(minX, tx)),
    y: Math.min(maxY, Math.max(minY, ty)),
  };
}

function PlanetNode({
  planet,
  color,
  isOwned,
  isSelected,
  isDragOrigin,
  adjustedShipCount,
}: {
  planet: Planet;
  color: string;
  isOwned: boolean;
  isSelected: boolean;
  isDragOrigin: boolean;
  adjustedShipCount: number;
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
    outputRange: ['rgba(255,255,255,0.85)', 'rgba(255,255,255,0.15)'],
  });

  const touchStyle = [
    styles.planetTouchTarget,
    {
      left: planetCenterX - touchTargetHalfSize,
      top: planetCenterY - touchTargetHalfSize,
    },
  ];

  const planetBody = (
    <>
      <Text
        style={[styles.planetNameLabel, !isOwned && styles.planetNameLabelFogged]}
      >
        {planet.name}
      </Text>
      {highlighted && !isDragOrigin && isOwned ? (
        <RNAnimated.View
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
        >
          <Text style={[styles.planetClassLabel, !isOwned && styles.planetClassLabelFogged]}>
            {planet.class}
          </Text>
        </RNAnimated.View>
      ) : (
        <View
          style={[
            styles.planetCircle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
              borderWidth: isDragOrigin ? 2 : 0,
              borderColor: 'rgba(255,255,255,0.6)',
            },
          ]}
        >
          <Text style={[styles.planetClassLabel, !isOwned && styles.planetClassLabelFogged]}>
            {planet.class}
          </Text>
        </View>
      )}
      {isOwned && (
        <Text style={styles.shipCountLabel}>{adjustedShipCount}</Text>
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
            <Circle cx={x} cy={y} r={4} fill={color} />
            <SvgText x={x + 6} y={y - 4} fill="white" fontSize={8}>
              {fleet.shipCount}
            </SvgText>
          </G>
        );
      })}
      <G pointerEvents="none">
        {queuedOrders.map((order, index) => {
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
              <Circle cx={dotX} cy={dotY} r={3} fill={HUMAN_COLOR} opacity={0.7} />
              <SvgText x={dotX + 5} y={dotY - 4} fill="white" fontSize={8}>
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
  const insets = useSafeAreaInsets();
  const gameState = useVisibleGameState();
  const selectedPlanetId = useGameStore((s) => s.selectedPlanetId);
  const pendingFleet = useGameStore((s) => s.pendingFleet);
  const queuedOrders = useGameStore((s) => s.queuedOrders);
  const selectPlanet = useGameStore((s) => s.selectPlanet);
  const setPendingFleet = useGameStore((s) => s.setPendingFleet);
  const confirmPendingFleet = useGameStore((s) => s.confirmPendingFleet);
  const cancelQueuedOrder = useGameStore((s) => s.cancelQueuedOrder);
  const endTurn = useGameStore((s) => s.endTurn);
  const queueBuildOrder = useGameStore((s) => s.queueBuildOrder);
  const cancelBuildOrder = useGameStore((s) => s.cancelBuildOrder);
  const demolishBuilding = useGameStore((s) => s.demolishBuilding);
  const setProductionSlider = useGameStore((s) => s.setProductionSlider);
  const showingLockScreen = useGameStore((s) => s.showingLockScreen);
  const dismissLockScreen = useGameStore((s) => s.dismissLockScreen);
  const resetGame = useGameStore((s) => s.resetGame);

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
  const [buildError, setBuildError] = useState<string | null>(null);
  const mapAreaRef = useRef<View>(null);
  const mapAreaWindowRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (gameState === null) {
      navigation.replace('Home');
    }
  }, [gameState, navigation]);

  const localHumanPlayerId = useMemo(
    () => (gameState !== null ? getLocalHumanPlayerId(gameState) : undefined),
    [gameState],
  );

  useEffect(() => {
    if (gameState === null || localHumanPlayerId === undefined) {
      return;
    }
    if (selectedPlanetId !== null) {
      const p = gameState.map.planets.find((pl) => pl.id === selectedPlanetId);
      if (p === undefined || p.owner !== localHumanPlayerId) {
        selectPlanet(null);
      }
    }
    if (dragOriginPlanetId !== null) {
      const p = gameState.map.planets.find((pl) => pl.id === dragOriginPlanetId);
      if (p === undefined || p.owner !== localHumanPlayerId) {
        setDragOriginPlanetId(null);
        setDragFingerLocal(null);
      }
    }
  }, [
    gameState,
    localHumanPlayerId,
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

  const selectedPlanet = useMemo(
    () => gameState?.map.planets.find((p) => p.id === selectedPlanetId),
    [gameState?.map.planets, selectedPlanetId],
  );

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

  const queuedShipsPerPlanet = useMemo(() => {
    const map: Record<string, number> = {};
    for (const order of queuedOrders) {
      map[order.fromPlanetId] = (map[order.fromPlanetId] ?? 0) + order.shipCount;
    }
    return map;
  }, [queuedOrders]);

  const shipsAlreadyQueued = queuedOrders
    .filter((o) => o.fromPlanetId === pendingFleet?.fromPlanetId)
    .reduce((sum, o) => sum + o.shipCount, 0);
  const modalMaxShips =
    pendingOriginPlanet !== undefined
      ? Math.max(1, pendingOriginPlanet.shipCount - 1 - shipsAlreadyQueued)
      : 1;

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
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
    scale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [gameState?.map.width, gameState?.map.height]);

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
      // Bail out without writing translateX while a fleet drag or pinch is
      // active (pinch owns translate during zoom; allowing pan to write
      // simultaneously is the primary cause of the zoom-jump bug).
      if (isFleetDragging.value || isPinching.value) {
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
  }));

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

  const handleDragStart = useCallback(
    (localX: number, localY: number, s: number, tx: number, ty: number) => {
      if (gameState === null || localHumanPlayerId === undefined) {
        return;
      }
      const mapPoint = screenToMapCoords(localX, localY, s, tx, ty);
      const planet = findPlanetAtMapCoords(mapPoint.x, mapPoint.y, gameState.map.planets);
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
    [gameState, localHumanPlayerId, measureMapArea],
  );

  const handleFleetPanUpdate = useCallback(
    (
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
        handleDragStart(localX, localY, s, tx, ty);
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
      if (gameState === null || localHumanPlayerId === undefined) {
        return;
      }
      const mapPoint = screenToMapCoords(localX, localY, s, tx, ty);
      const planet = findPlanetAtMapCoords(mapPoint.x, mapPoint.y, gameState.map.planets);
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
    [gameState, localHumanPlayerId, measureMapArea],
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
        handleMeasureDragStart(localX, localY, s, tx, ty);
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
      );

      const fromPlanetId = dragOriginPlanetId;
      cancelDrag();

      if (destPlanet === undefined || destPlanet.id === fromPlanetId) {
        return;
      }

      const range = effectiveRange(humanPlayer.techLevel);
      if (!isInRange(originPlanet.position, destPlanet.position, range)) {
        setOutOfRangeMessage(true);
        return;
      }

      setPendingFleet({
        fromPlanetId,
        toPlanetId: destPlanet.id,
        shipCount: 1,
      });
    },
    [
      absoluteToMapLocal,
      cancelDrag,
      dragOriginPlanetId,
      gameState,
      humanPlayer,
      setPendingFleet,
    ],
  );

  const handleMapTap = useCallback(
    (localX: number, localY: number, s: number, tx: number, ty: number) => {
      const store = useGameStore.getState();
      const record = store.getActiveRecord();
      if (record === null) {
        return;
      }
      const freshHumanId = getLocalHumanPlayerId(record.state);
      if (freshHumanId === undefined) {
        return;
      }
      const mapPoint = screenToMapCoords(localX, localY, s, tx, ty);
      const planet = findPlanetAtMapCoords(
        mapPoint.x,
        mapPoint.y,
        record.state.map.planets,
      );
      if (planet === undefined || planet.owner !== freshHumanId) {
        return;
      }
      store.selectPlanet(planet.id);
    },
    [],
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
      );
    });

  const fleetDrag = Gesture.Pan()
    .minDistance(10)
    .onUpdate((event) => {
      runOnJS(handleFleetPanUpdate)(
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

  const composed = Gesture.Simultaneous(pinch, pan);
  // Last gesture has highest priority — planetTap must win stationary taps over fleetDrag.
  const planetFleet = Gesture.Exclusive(fleetDrag, planetTap);
  const mapGesture = Gesture.Simultaneous(composed, planetFleet, measureDrag);

  const handleConfirmFleet = () => {
    confirmPendingFleet();
    selectPlanet(null);
  };

  const handleNewGame = () => {
    resetGame();
    navigation.replace('Home');
  };

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
      Alert.alert(
        'Demolish building?',
        'This cannot be undone. You will not receive your gold back.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Demolish',
            style: 'destructive',
            onPress: () => demolishBuilding(selectedPlanet.id, slotIndex),
          },
        ],
      );
    }
  };

  if (gameState === null || humanPlayer === undefined || localHumanPlayerId === undefined) {
    return <View style={styles.root} />;
  }

  const { map, players, fleets, roundNumber, currentPlayerId, status, winnerId } = gameState;
  const mapPixelWidth = map.width * CELL_SIZE;
  const mapPixelHeight = map.height * CELL_SIZE;
  const isHumanTurn = status === 'active' && currentPlayerId === humanPlayer.id;
  const humanWon = status === 'finished' && winnerId === humanPlayer.id;
  const humanLost = status === 'finished' && winnerId !== null && winnerId !== humanPlayer.id;

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
          Turn {roundNumber} · {isHumanTurn ? 'Your turn' : "AI's turn"}
        </Text>
        <Text style={styles.statusSub}>
          Gold {humanPlayer.gold} · Tech Level {humanPlayer.techLevel}
        </Text>
      </View>

      <View
        ref={mapAreaRef}
        style={styles.mapArea}
        onLayout={(e) => {
          viewportWidth.value = e.nativeEvent.layout.width;
          viewportHeight.value = e.nativeEvent.layout.height;
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
                  color={getPlanetColor(planet, localHumanPlayerId)}
                  isOwned={planet.owner === localHumanPlayerId}
                  isSelected={planet.id === selectedPlanetId}
                  isDragOrigin={planet.id === dragOriginPlanetId}
                  adjustedShipCount={Math.max(
                    0,
                    planet.shipCount - (queuedShipsPerPlanet[planet.id] ?? 0),
                  )}
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
        visible={pendingFleet !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingFleet(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Send Fleet</Text>
            {pendingOriginPlanet !== undefined && pendingDestPlanet !== undefined && (
              <Text style={styles.modalRoute}>
                {formatPlanetId(pendingOriginPlanet.id)} →{' '}
                {formatPlanetId(pendingDestPlanet.id)}
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
                  onPress={() =>
                    pendingFleet !== null &&
                    setPendingFleet({
                      ...pendingFleet,
                      shipCount: Math.max(1, pendingFleet.shipCount - 1),
                    })
                  }
                  disabled={pendingFleet === null || pendingFleet.shipCount <= 1}
                >
                  <Text style={styles.stepperBtnText}>−</Text>
                </Pressable>
                <Text style={styles.stepperValue}>{pendingFleet?.shipCount ?? 1}</Text>
                <Pressable
                  style={styles.stepperBtn}
                  onPress={() =>
                    pendingFleet !== null &&
                    setPendingFleet({
                      ...pendingFleet,
                      shipCount: Math.min(modalMaxShips, pendingFleet.shipCount + 1),
                    })
                  }
                  disabled={
                    pendingFleet === null || pendingFleet.shipCount >= modalMaxShips
                  }
                >
                  <Text style={styles.stepperBtnText}>+</Text>
                </Pressable>
                <Text style={styles.stepperMax}>max {modalMaxShips}</Text>
              </View>
            </View>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => setPendingFleet(null)}
              >
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={handleConfirmFleet}>
                <Text style={styles.primaryButtonText}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={
          selectedPlanet !== undefined && selectedPlanet.owner === localHumanPlayerId
        }
        transparent
        animationType="fade"
        onRequestClose={() => selectPlanet(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => selectPlanet(null)}
        >
          <Pressable style={styles.planetDetailCard} onPress={() => {}}>
            <View style={styles.planetDetailHeader}>
              <View style={styles.planetDetailHeaderSpacer} />
              <Text style={styles.planetDetailName}>{selectedPlanet?.name}</Text>
              <Pressable
                onPress={() => selectPlanet(null)}
                hitSlop={12}
                style={styles.planetDetailHeaderClose}
              >
                <Text style={styles.planetDetailClose}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.planetInfoRow}>
              <View style={styles.planetClassTile}>
                <Text style={styles.planetClassTileText}>{selectedPlanet?.class}</Text>
              </View>
              <View style={styles.troopsSummary}>
                <Text style={styles.troopsSummaryValue}>{selectedPlanet?.shipCount ?? 0}</Text>
                <Text style={styles.troopsSummaryLabel}>troops</Text>
              </View>
            </View>

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

            {selectedPlanetFactories > 0 && (
              <View style={styles.productionSliderSection}>
                <Slider
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
            {queuedOrders.length === 0 ? (
              <Text style={styles.queuedEmptyText}>No orders queued</Text>
            ) : (
              queuedOrders.map((order, index) => {
                const originPlanet = map.planets.find((p) => p.id === order.fromPlanetId);
                const destPlanet = map.planets.find((p) => p.id === order.toPlanetId);
                const originLabel = originPlanet?.name ?? formatPlanetId(order.fromPlanetId);
                const destLabel = destPlanet?.name ?? formatPlanetId(order.toPlanetId);
                return (
                  <View
                    key={`${order.fromPlanetId}-${order.toPlanetId}-${index}`}
                    style={styles.queuedModalRow}
                  >
                    <Text style={styles.queuedModalText} numberOfLines={1}>
                      {originLabel} → {destLabel} · {order.shipCount}
                    </Text>
                    <Pressable onPress={() => cancelQueuedOrder(index)} hitSlop={8}>
                      <Text style={styles.queueOverlayCancelText}>✕</Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {status === 'finished' && (
        <View style={styles.gameOverOverlay}>
          <Text style={[styles.banner, humanWon ? styles.bannerVictory : styles.bannerDefeat]}>
            {humanWon ? 'Victory' : humanLost ? 'Defeat' : 'Game Over'}
          </Text>
          <Pressable style={styles.primaryButton} onPress={handleNewGame}>
            <Text style={styles.primaryButtonText}>New Game</Text>
          </Pressable>
        </View>
      )}

      {isHumanTurn && status === 'active' && (
        <Pressable
          style={[styles.researchButton, { bottom: insets.bottom + 128 }]}
          onPress={() => setShowQueuedModal(true)}
        >
          <Text style={styles.researchButtonText}>Queued ({queuedOrders.length})</Text>
        </Pressable>
      )}

      {isHumanTurn && status === 'active' && (
        <Pressable
          style={[styles.researchButton, { bottom: insets.bottom + 72 }]}
          onPress={() => setShowResearchModal(true)}
        >
          <Text style={styles.researchButtonText}>R&D</Text>
        </Pressable>
      )}

      {isHumanTurn && status === 'active' && (
        <Pressable
          style={[styles.endTurnButton, { bottom: insets.bottom + 16 }]}
          onPress={() => {
            cancelDrag();
            endTurn();
            selectPlanet(null);
          }}
        >
          <Text style={styles.endTurnButtonText}>End Turn</Text>
        </Pressable>
      )}

      {dragDistanceLabel !== null && (
        <View
          style={[styles.dragDistancePill, { bottom: insets.bottom + 120 }]}
          pointerEvents="none"
        >
          <Text style={styles.dragDistancePillText}>{dragDistanceLabel}</Text>
        </View>
      )}

      {showingLockScreen && (
        <Pressable
          style={[styles.lockScreen, { paddingTop: insets.top }]}
          onPress={dismissLockScreen}
        >
          <Text style={styles.lockTitle}>Pass the device</Text>
          <Text style={styles.lockSub}>Tap anywhere to continue</Text>
        </Pressable>
      )}
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
    backgroundColor: 'rgba(10, 10, 26, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  planetTouchTarget: {
    position: 'absolute',
    width: PLANET_SIZE_SELECTED,
    height: PLANET_SIZE_SELECTED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planetCircle: {
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planetNameLabel: {
    position: 'absolute',
    top: PLANET_NAME_LABEL_TOP,
    width: PLANET_NAME_LABEL_WIDTH,
    marginLeft: -(PLANET_NAME_LABEL_WIDTH - CELL_SIZE) / 2,
    textAlign: 'center',
    color: '#c8c8e8',
    fontSize: 4,
  },
  planetNameLabelFogged: {
    color: '#666688',
  },
  planetClassLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 4,
    fontWeight: '700',
    letterSpacing: 0,
  },
  planetClassLabelFogged: {
    color: 'rgba(180, 180, 200, 0.5)',
  },
  shipCountLabel: {
    color: COLORS.text,
    fontSize: 6,
    marginTop: 1,
    textAlign: 'center',
    width: CELL_SIZE * 2,
    marginLeft: -CELL_SIZE / 2,
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
    backgroundColor: 'rgba(18, 18, 42, 0.95)',
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
  researchButton: {
    position: 'absolute',
    right: 16,
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    zIndex: 10,
  },
  researchButtonText: {
    color: COLORS.background,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
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
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a34',
  },
  planetClassTileText: {
    color: COLORS.text,
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
    backgroundColor: COLORS.background,
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
  lockSub: {
    fontSize: 15,
    color: COLORS.textMuted,
    fontStyle: 'italic',
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
});

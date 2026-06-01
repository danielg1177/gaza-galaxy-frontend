import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import type { GameMap, Planet } from '../game/types';

const CELL_SIZE = 18;
const OWNED_COLOR = '#2e8a50';
const OTHER_COLOR = '#7a7a96';
const MAP_BG = '#e8e2d8';
const MIN_SCALE = 0.15;
const MAX_SCALE = 6;
const VIEWPORT_PADDING = 24;

const COLORS = {
  panel: '#faf7f4',
  text: '#1c1c2e',
  textMuted: '#6a6880',
  border: '#ccc4b8',
};

function planetCenterPx(planet: Planet): { x: number; y: number } {
  return {
    x: planet.position.x * CELL_SIZE + CELL_SIZE / 2,
    y: planet.position.y * CELL_SIZE + CELL_SIZE / 2,
  };
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
  const minX = Math.min(-(mapW * currentScale - viewW) - VIEWPORT_PADDING, VIEWPORT_PADDING);
  const maxX = VIEWPORT_PADDING;
  const minY = Math.min(-(mapH * currentScale - viewH) - VIEWPORT_PADDING, VIEWPORT_PADDING);
  const maxY = VIEWPORT_PADDING;
  return {
    x: Math.min(maxX, Math.max(minX, tx)),
    y: Math.min(maxY, Math.max(minY, ty)),
  };
}

function fitMapToViewport(
  mapPixelWidth: number,
  mapPixelHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): { scale: number; translateX: number; translateY: number } {
  const fitScale =
    Math.min(viewportWidth / mapPixelWidth, viewportHeight / mapPixelHeight) * 0.92;
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, fitScale));
  const translateX = viewportWidth / 2 - mapPixelWidth * scale + mapPixelWidth / 2;
  const translateY = viewportHeight / 2 - mapPixelHeight * scale + mapPixelHeight / 2;
  const clamped = clampTranslation(
    translateX,
    translateY,
    scale,
    mapPixelWidth,
    mapPixelHeight,
    viewportWidth,
    viewportHeight,
  );
  return { scale, translateX: clamped.x, translateY: clamped.y };
}

function StrategicPlanetDot({
  planet,
  humanPlayerId,
  dotSize,
}: {
  planet: Planet;
  humanPlayerId: string;
  dotSize: number;
}) {
  const center = planetCenterPx(planet);
  const isOwned = planet.owner === humanPlayerId;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.planetDot,
        {
          left: center.x - dotSize / 2,
          top: center.y - dotSize / 2,
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: isOwned ? OWNED_COLOR : OTHER_COLOR,
          opacity: isOwned ? 1 : 0.75,
        },
      ]}
    />
  );
}

export interface StrategicMapModalProps {
  visible: boolean;
  onClose: () => void;
  map: GameMap;
  humanPlayerId: string;
}

export default function StrategicMapModal({
  visible,
  onClose,
  map,
  humanPlayerId,
}: StrategicMapModalProps) {
  const mapPixelWidth = map.width * CELL_SIZE;
  const mapPixelHeight = map.height * CELL_SIZE;
  const dotSize = Math.max(4, Math.round(CELL_SIZE * 0.45 * 1.25));

  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

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
  const isPinching = useSharedValue(false);
  const panPrevTranslationX = useSharedValue(0);
  const panPrevTranslationY = useSharedValue(0);
  const viewportWidth = useSharedValue(0);
  const viewportHeight = useSharedValue(0);
  const mapWidthSV = useSharedValue(mapPixelWidth);
  const mapHeightSV = useSharedValue(mapPixelHeight);

  const applyFitToViewport = useCallback(() => {
    const viewW = viewportWidth.value;
    const viewH = viewportHeight.value;
    if (viewW <= 0 || viewH <= 0) {
      return;
    }
    const fitted = fitMapToViewport(mapPixelWidth, mapPixelHeight, viewW, viewH);
    scale.value = fitted.scale;
    translateX.value = fitted.translateX;
    translateY.value = fitted.translateY;
    savedScale.value = fitted.scale;
    savedTranslateX.value = fitted.translateX;
    savedTranslateY.value = fitted.translateY;
  }, [
    mapPixelWidth,
    mapPixelHeight,
    scale,
    translateX,
    translateY,
    savedScale,
    savedTranslateX,
    savedTranslateY,
    viewportWidth,
    viewportHeight,
  ]);

  useEffect(() => {
    mapWidthSV.value = mapPixelWidth;
    mapHeightSV.value = mapPixelHeight;
  }, [mapPixelWidth, mapPixelHeight, mapWidthSV, mapHeightSV]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    if (viewportSize.width > 0 && viewportSize.height > 0) {
      viewportWidth.value = viewportSize.width;
      viewportHeight.value = viewportSize.height;
      applyFitToViewport();
    }
  }, [
    visible,
    viewportSize.width,
    viewportSize.height,
    applyFitToViewport,
    viewportWidth,
    viewportHeight,
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
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchStartScale.value * event.scale));
      const fx = pinchFocalX.value;
      const fy = pinchFocalY.value;
      const newTx = fx - (fx - pinchStartTranslateX.value) * (newScale / pinchStartScale.value);
      const newTy = fy - (fy - pinchStartTranslateY.value) * (newScale / pinchStartScale.value);
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
      if (isPinching.value) {
        return;
      }
      const dtx = event.translationX - panPrevTranslationX.value;
      const dty = event.translationY - panPrevTranslationY.value;
      panPrevTranslationX.value = event.translationX;
      panPrevTranslationY.value = event.translationY;
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
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const mapGesture = Gesture.Simultaneous(pinch, pan);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: translateX.value + (mapWidthSV.value * (scale.value - 1)) / 2,
      },
      {
        translateY: translateY.value + (mapHeightSV.value * (scale.value - 1)) / 2,
      },
      { scale: scale.value },
    ],
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Strategic Map</Text>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>Pinch to zoom · drag to pan</Text>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: OWNED_COLOR }]} />
            <Text style={styles.legendText}>Your planets</Text>
            <View style={[styles.legendDot, { backgroundColor: OTHER_COLOR }]} />
            <Text style={styles.legendText}>Other</Text>
          </View>
          <View
            style={styles.mapViewport}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              viewportWidth.value = width;
              viewportHeight.value = height;
              setViewportSize((prev) =>
                prev.width === width && prev.height === height ? prev : { width, height },
              );
            }}
          >
            <GestureDetector gesture={mapGesture}>
              <View style={styles.mapGestureHost}>
                <Animated.View
                  style={[
                    {
                      width: mapPixelWidth,
                      height: mapPixelHeight,
                      backgroundColor: MAP_BG,
                    },
                    animatedStyle,
                  ]}
                >
                  {map.planets.map((planet) => (
                    <StrategicPlanetDot
                      key={planet.id}
                      planet={planet}
                      humanPlayerId={humanPlayerId}
                      dotSize={dotSize}
                    />
                  ))}
                </Animated.View>
              </View>
            </GestureDetector>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 16,
    justifyContent: 'center',
  },
  card: {
    flex: 1,
    maxHeight: '92%',
    backgroundColor: COLORS.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    color: COLORS.textMuted,
    fontSize: 18,
    fontWeight: '600',
  },
  hint: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginRight: 8,
  },
  mapViewport: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    backgroundColor: MAP_BG,
  },
  mapGestureHost: {
    flex: 1,
    overflow: 'hidden',
  },
  planetDot: {
    position: 'absolute',
  },
});

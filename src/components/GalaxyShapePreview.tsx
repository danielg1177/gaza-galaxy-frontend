import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { GALAXY_PREVIEW_SVGS } from '../assets/galaxyPreviewSvgs';
import type { GalaxyShape } from '../game/types';

const PREVIEW_SIZE = 46;

export function GalaxyShapePreview({
  shape,
}: {
  shape: GalaxyShape | 'random';
}) {
  const [enlarged, setEnlarged] = useState(false);
  const { width, height } = useWindowDimensions();

  if (shape === 'random') {
    return (
      <View style={styles.randomWrap}>
        <Text style={styles.randomMark}>?</Text>
      </View>
    );
  }

  const largeSize = Math.min(360, Math.round(Math.min(width, height) * 0.78));

  return (
    <>
      <Pressable
        onPress={() => setEnlarged(true)}
        accessibilityRole="button"
        accessibilityLabel="View larger map preview"
        hitSlop={6}
        style={({ pressed }) => [styles.hit, pressed && styles.hitPressed]}
      >
        <SvgXml
          xml={GALAXY_PREVIEW_SVGS[shape]}
          width={PREVIEW_SIZE}
          height={PREVIEW_SIZE}
        />
      </Pressable>
      <Modal
        visible={enlarged}
        transparent
        animationType="fade"
        onRequestClose={() => setEnlarged(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setEnlarged(false)}>
          <Pressable
            style={[styles.largeCard, { width: largeSize, height: largeSize }]}
            onPress={() => setEnlarged(false)}
          >
            <SvgXml
              xml={GALAXY_PREVIEW_SVGS[shape]}
              width={largeSize}
              height={largeSize}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  randomWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  randomMark: {
    color: '#6a6880',
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 26,
  },
  hit: {
    cursor: 'pointer',
  },
  hitPressed: {
    opacity: 0.85,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  largeCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ccc4b8',
    backgroundColor: '#f5f0eb',
  },
});

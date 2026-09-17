import { StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { GALAXY_PREVIEW_SVGS } from '../assets/galaxyPreviewSvgs';
import type { GalaxyShape } from '../game/types';

const PREVIEW_SIZE = 46;

export function GalaxyShapePreview({
  shape,
}: {
  shape: GalaxyShape | 'random';
}) {
  if (shape === 'random') {
    return (
      <View style={styles.randomWrap}>
        <Text style={styles.randomMark}>?</Text>
      </View>
    );
  }

  return (
    <SvgXml
      xml={GALAXY_PREVIEW_SVGS[shape]}
      width={PREVIEW_SIZE}
      height={PREVIEW_SIZE}
    />
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
});

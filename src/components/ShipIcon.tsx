import { Image, StyleSheet } from 'react-native';

export const SPACE_SHIP_IMAGE = require('../../assets/Space_Ship.png');

const DEFAULT_SIZE = 22;
const DEFAULT_ROTATION_DEG = 45;

export function ShipIcon({
  size = DEFAULT_SIZE,
  rotationDeg = DEFAULT_ROTATION_DEG,
}: {
  size?: number;
  rotationDeg?: number;
}) {
  return (
    <Image
      source={SPACE_SHIP_IMAGE}
      style={[
        styles.ship,
        {
          width: size,
          height: size,
          transform: [{ rotate: `${rotationDeg}deg` }],
        },
      ]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  ship: {},
});

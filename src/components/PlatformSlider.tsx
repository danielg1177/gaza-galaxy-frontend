import { Platform } from 'react-native';
import SliderNative from '@react-native-community/slider';
function SliderWeb(props: {
  value: number;
  minimumValue: number;
  maximumValue: number;
  onValueChange: (v: number) => void;
  style?: object;
}) {
  return (
    <input
      type="range"
      min={props.minimumValue}
      max={props.maximumValue}
      value={props.value}
      step={0.01}
      onChange={e => props.onValueChange(Number(e.target.value))}
      style={{ width: '100%', accentColor: '#4a90e2', ...(props.style as object) }}
    />
  );
}
export const PlatformSlider = Platform.OS === 'web' ? (SliderWeb as unknown as typeof SliderNative) : SliderNative;

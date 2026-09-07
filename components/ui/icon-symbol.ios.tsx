import { SymbolView, SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { StyleProp, ViewStyle } from 'react-native';

const MAPPING: Record<string, string> = {
  'history': 'clock.arrow.circlepath',
};

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = 'regular',
}: {
  name: string;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  const iosName = MAPPING[name] || name;
  return (
    <SymbolView
      weight={weight}
      tintColor={color}
      resizeMode="scaleAspectFit"
      name={iosName as any}
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
    />
  );
}

import React, { useId } from 'react';
import Svg, { Circle, ClipPath, Defs, G, Rect } from 'react-native-svg';
import { C, DEPTH_Y } from '../theme';

const Body = () => (
  <>
    <Circle cx="12" cy="6" r="4.6" />
    <Rect x="7" y="12" width="10" height="17" rx="3.5" />
    <Rect x="3.6" y="13" width="3" height="13" rx="1.5" />
    <Rect x="17.4" y="13" width="3" height="13" rx="1.5" />
    <Rect x="7.3" y="27" width="4.4" height="20" rx="2" />
    <Rect x="12.3" y="27" width="4.4" height="20" rx="2" />
  </>
);

// A person with water up to the given depth: the app's main way of showing severity.
export default function DepthFigure({ depth = 'unknown', width = 22, color = '#34464B' }) {
  const id = `fig${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const y = DEPTH_Y[depth] ?? 48;
  const h = 48 - y;
  return (
    <Svg width={width} height={width * 2} viewBox="0 0 24 48">
      <Defs>
        <ClipPath id={id}><Body /></ClipPath>
      </Defs>
      {h > 0 && <Rect x="0" y={y} width="24" height={h} fill={C.waterLight} />}
      <G fill={color}><Body /></G>
      {h > 0 && <Rect x="0" y={y} width="24" height={h} fill={C.water} clipPath={`url(#${id})`} />}
    </Svg>
  );
}

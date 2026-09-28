import Svg, { Rect } from 'react-native-svg';
import qrcode from 'qrcode-generator';

import { tokens } from '@/constants/theme';

type Props = {
  installId: string;
  size?: number;
};

/** QR encodes the Install ID as plain text. A camera scan shows the ID to send. */
export function InstallIdQr({ installId, size = 200 }: Props) {
  const qr = qrcode(0, 'M');
  qr.addData(installId);
  qr.make();
  const count = qr.getModuleCount();
  const cell = size / count;
  const cells: { x: number; y: number }[] = [];
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (qr.isDark(row, col)) cells.push({ x: col * cell, y: row * cell });
    }
  }
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Rect width={size} height={size} fill={tokens.bgElevated} />
      {cells.map((cellBox) => (
        <Rect
          key={`${cellBox.x}-${cellBox.y}`}
          x={cellBox.x}
          y={cellBox.y}
          width={cell}
          height={cell}
          fill={tokens.text}
        />
      ))}
    </Svg>
  );
}

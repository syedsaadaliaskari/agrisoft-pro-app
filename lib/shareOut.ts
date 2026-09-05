import { Alert, Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export function safeFilename(name: string, ext: string) {
  const base =
    name
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'export';
  return `${base}.${ext}`;
}

export function downloadOnWeb(filename: string, mime: string, contents: string): boolean {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return false;
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return true;
}

export async function shareTextOrFile(opts: {
  filename: string;
  mime: string;
  contents: string;
  title: string;
  uti?: string;
}) {
  if (downloadOnWeb(opts.filename, opts.mime, opts.contents)) return;

  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (dir) {
    const path = `${dir}${opts.filename}`;
    await FileSystem.writeAsStringAsync(path, opts.contents);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, {
        mimeType: opts.mime,
        UTI: opts.uti,
        dialogTitle: opts.title,
      });
      return;
    }
  }

  const result = await Share.share({ title: opts.title, message: opts.contents });
  if (result.action === Share.dismissedAction && Platform.OS === 'ios') return;
}

export async function sharePdfFromHtml(html: string, title: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
      return;
    }
    downloadOnWeb(safeFilename(title, 'html'), 'text/html;charset=utf-8', html);
    return;
  }

  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (uri && (await Sharing.isAvailableAsync())) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: title,
      });
      return;
    }
    await Print.printAsync({ html });
  } catch {
    await shareTextOrFile({
      filename: safeFilename(title, 'html'),
      mime: 'text/html;charset=utf-8',
      contents: html,
      title,
    });
  }
}

export function showShareError(err: unknown) {
  const message = err instanceof Error ? err.message : 'Share failed';
  Alert.alert('Could not share', message);
}

import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

import { tokens } from '@/constants/theme';

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: lightThemeCss }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const lightThemeCss = `
:root, [data-theme="light"] {
  --bg: ${tokens.bg};
  --bg-elevated: ${tokens.bgElevated};
  --bg-soft: ${tokens.bgSoft};
  --border: ${tokens.border};
  --border-strong: ${tokens.borderStrong};
  --text: ${tokens.text};
  --text-muted: ${tokens.textMuted};
  --accent: ${tokens.accent};
  --accent-hover: ${tokens.accentHover};
  --accent-soft: ${tokens.accentSoft};
  --success: ${tokens.success};
  --danger: ${tokens.danger};
  --info: ${tokens.info};
  --logo-ink: ${tokens.logoInk};
  --atmosphere-1: ${tokens.atmosphere1};
  --atmosphere-2: ${tokens.atmosphere2};
  --sidebar-width: 260px;
  --font-display: "Segoe UI", "Segoe UI Variable", system-ui, sans-serif;
  --font-body: "Segoe UI", "Segoe UI Variable", system-ui, sans-serif;
}
html, body {
  background-color: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  background-image:
    radial-gradient(ellipse 80% 50% at 10% -10%, var(--atmosphere-1), transparent),
    radial-gradient(ellipse 60% 40% at 100% 0%, var(--atmosphere-2), transparent);
  background-attachment: fixed;
}
`;

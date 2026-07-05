# Cognitive Stream File Explorer

Drop-in React file explorer component, designed to be portable into any Vite/React/TypeScript host project.

## Quick start

```tsx
import { FileExplorer } from '@/components/explorer';

export default function Page() {
  return <FileExplorer />;
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialFolderId` | `string` | `'root'` | Folder id to open the first tab in. |
| `initialLocale` | `'fr' \| 'en'` | `'fr'` | UI language. |
| `showWindowChrome` | `boolean` | `true` | Show tab bar + mock window controls. Set `false` to embed inline. |
| `className` | `string` | — | Wrapper className (e.g. `h-[600px]`). |
| `onFileOpen` | `(folderId) => void` | — | Fired when a file is double-clicked. |
| `onNavigate` | `(folderId) => void` | — | Fired when the active tab changes folder. |

## Embedded inline (no chrome)

```tsx
<FileExplorer className="h-[600px] rounded-lg border" showWindowChrome={false} />
```

## Files to copy when porting

- `src/components/explorer/**` (all files in this folder)
- `src/components/explorer/icons/**`
- `src/hooks/useFileExplorer.ts`
- `src/hooks/useFileOperations.ts`
- `src/hooks/useSound.ts`
- `src/hooks/useMarqueeSelection.ts`
- `src/hooks/useDragDrop.ts`
- `src/hooks/useGlobalClipboard.ts`
- `src/hooks/useNotifications.ts`
- `src/data/mockFileSystem.ts` (replace with your own data source)
- `src/data/localServers.ts`
- `src/types/fileExplorer.ts`
- `src/lib/sounds.ts`
- `src/lib/iconCache.ts`
- `src/lib/utils.ts`
- `src/i18n/LanguageContext.tsx`, `src/i18n/translations.ts`
- `public/sounds/*.wav`

### Required shadcn/ui primitives
button, dropdown-menu, dialog, sheet, popover, tooltip, slider, command, resizable, sonner, toast

### Required npm packages
`react`, `react-dom`, `framer-motion`, `lucide-react`, `sonner`, `class-variance-authority`, `clsx`, `tailwind-merge`, `cmdk`, and the `@radix-ui/*` packages used by the shadcn primitives above.

### Tailwind tokens
Copy the explorer-specific CSS variables from `src/index.css`:

```css
--explorer-surface, --explorer-hover, --explorer-selected, --sidebar-background, --sidebar-border
```

(These are namespaced; they will not conflict with a host design system.)

## Customising the data source

By default the explorer reads from `src/data/mockFileSystem.ts`. To plug your own data, replace that file (or refactor to inject through context). The `FileItem` shape is defined in `src/types/fileExplorer.ts`.

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Command palette |
| `Ctrl+T` | New tab |
| `Ctrl+W` | Close tab |
| `Ctrl+1..9` | Switch to tab N |
| `Ctrl+C / X / V` | Copy / Cut / Paste |
| `Ctrl+A` | Select all |
| `F2` | Rename |
| `Delete` | Delete |
| `Alt+Enter` | Properties |
| `Ctrl+\`` | Toggle terminal |
| `Backspace` | Parent folder |
| `Alt+← / →` | Back / Forward |

// Stroke icons from the prototype, plus the official WhatsApp glyph.

const PATHS = {
  home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z',
  products: 'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  booking: 'M4 5h16v15H4zM4 10h16M9 3v4M15 3v4',
  info: 'M4 9l1.5-5h13L20 9M4 9h16v11H4zM9 20v-6h6v6',
  faq: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12zM9.5 9.5a2.5 2.5 0 1 1 3 2.4c-.4.2-.5.5-.5.9v.7M12 16h.01',
  check: 'M5 12.5l4.5 4.5L19 7',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
  upload: 'M12 16V4M7 9l5-5 5 5M4 16v4h16v-4',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4z',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20h4',
  retry: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  next: 'M15 6l-6 6 6 6',
  back: 'M9 6l6 6-6 6',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z',
  calendar: 'M4 5h16v15H4zM4 10h16M9 3v4M15 3v4',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
} as const;

export type IconName = keyof typeof PATHS | 'alert' | 'search' | 'grid';

export function Icon({ name, size, className = 'i', style }: { name: IconName; size?: number; className?: string; style?: React.CSSProperties }) {
  const s = size ? { width: size, height: size, ...style } : style;
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" style={s}>
      {name === 'alert' ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6M12 16.5h.01" />
        </>
      ) : name === 'search' ? (
        <>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </>
      ) : name === 'grid' ? (
        <>
          <rect x="4" y="4" width="7" height="7" rx="1.5" />
          <rect x="13" y="4" width="7" height="7" rx="1.5" />
          <rect x="4" y="13" width="7" height="7" rx="1.5" />
          <rect x="13" y="13" width="7" height="7" rx="1.5" />
        </>
      ) : name === 'camera' ? (
        <>
          <path d={PATHS.camera} />
          <circle cx="12" cy="13" r="3.5" />
        </>
      ) : name === 'eye' ? (
        <>
          <path d={PATHS.eye} />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <path d={PATHS[name]} />
      )}
    </svg>
  );
}

const WA_PATH =
  'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z';

export function WhatsAppLogo({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" style={{ fill: 'currentColor', flex: 'none' }}>
      <path d={WA_PATH} />
    </svg>
  );
}

/** The white-on-#25D366 WhatsApp tile used in the onboarding step and the modal. */
export function WhatsAppTile({ size = 64 }: { size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), background: '#25D366', color: '#fff', display: 'grid', placeItems: 'center', flex: 'none' }}>
      <WhatsAppLogo size={Math.round(size * 0.56)} />
    </span>
  );
}

export function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

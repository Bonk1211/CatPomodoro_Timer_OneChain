// Pixel Cat Pomodoro Theme for dApp Kit WalletProvider
// Custom theme matching the pixel-art game aesthetic

// Note: ThemeVars type is inferred from the theme object structure

/**
 * Light theme with pixel-art game colors
 * Matches the game's purple/blue gradient background and pixel-art style
 */
export const pixelCatLightTheme = {
  blurs: {
    modalOverlay: 'blur(0)',
  },
  backgroundColors: {
    primaryButton: '#4ecdc4',
    primaryButtonHover: '#5eddd4',
    outlineButtonHover: '#F4F4F5',
    modalOverlay: 'rgba(45, 27, 61, 0.85)',
    modalPrimary: '#2d1b3d',
    modalSecondary: '#1a0f2e',
    iconButton: 'transparent',
    iconButtonHover: '#3C424226',
    dropdownMenu: '#2d1b3d',
    dropdownMenuSeparator: '#4a4a4a',
    walletItemSelected: '#4ecdc4',
    walletItemHover: '#3C424226',
  },
  borderColors: {
    outlineButton: '#000000',
  },
  colors: {
    primaryButton: '#000000',
    outlineButton: '#ffd700',
    iconButton: '#ffd700',
    body: '#ffd700',
    bodyMuted: '#9e9e9e',
    bodyDanger: '#ff6b6b',
  },
  radii: {
    small: '0px',
    medium: '0px',
    large: '0px',
    xlarge: '0px',
  },
  shadows: {
    primaryButton: '0 4px 0 #000, inset 0 -2px 0 rgba(0, 0, 0, 0.2)',
    walletItemSelected: '0px 2px 6px rgba(0, 0, 0, 0.3)',
  },
  fontWeights: {
    normal: '400',
    medium: '500',
    bold: '600',
  },
  fontSizes: {
    small: '12px',
    medium: '14px',
    large: '16px',
    xlarge: '18px',
  },
  typography: {
    fontFamily: '"Press Start 2P", cursive, ui-sans-serif, system-ui',
    fontStyle: 'normal',
    lineHeight: '1.5',
    letterSpacing: '2px',
  },
}

/**
 * Dark theme variant with darker colors
 */
export const pixelCatDarkTheme = {
  ...pixelCatLightTheme,
  backgroundColors: {
    ...pixelCatLightTheme.backgroundColors,
    modalPrimary: '#1a0f2e',
    modalSecondary: '#0f0819',
    dropdownMenu: '#1a0f2e',
  },
  colors: {
    ...pixelCatLightTheme.colors,
    body: '#ffd700',
    bodyMuted: '#767A81',
  },
}

/**
 * Pink theme variant (for fun!)
 */
export const pixelCatPinkTheme = {
  ...pixelCatLightTheme,
  backgroundColors: {
    ...pixelCatLightTheme.backgroundColors,
    primaryButton: '#ff6b9d',
    primaryButtonHover: '#ff7bad',
    modalPrimary: '#2d1b3d',
  },
  colors: {
    ...pixelCatLightTheme.colors,
    primaryButton: '#ffffff',
  },
}


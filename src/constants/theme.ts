export const COLORS = {
  // Brand
  blue: '#1B4FFF',
  blueLight: '#3D6FFF',
  bluePale: '#EEF2FF',

  // Accent
  green: '#00C896',
  greenPale: '#E6FBF5',
  orange: '#FF6B2B',
  orangePale: '#FFF1EB',
  yellow: '#FFB800',
  yellowPale: '#FFFAE6',
  red: '#FF3B5C',
  redPale: '#FFF0F3',

  // Dark (POS theme)
  dark: '#0D1117',
  dark2: '#161B27',
  dark3: '#1E2535',

  // Text
  text: '#0D1117',
  text2: '#4A5568',
  text3: '#9AABB8',

  // UI
  border: '#E8EDF5',
  bg: '#F5F7FB',
  white: '#FFFFFF',

  // Status badge text
  greenText: '#00A07A',
  yellowText: '#B38000',
  redText: '#CC1F3A',
} as const;

export const FONTS = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semiBold: 'DMSans_600SemiBold',
  bold: 'Syne_700Bold',
  extraBold: 'Syne_800ExtraBold',
} as const;

export const RADIUS = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 24,
  full: 999,
} as const;

export const SHADOWS = {
  sm: {
    shadowColor: '#0D1117',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#0D1117',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0D1117',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 40,
    elevation: 8,
  },
  blue: {
    shadowColor: '#1B4FFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

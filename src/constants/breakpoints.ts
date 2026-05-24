export const BREAKPOINT_VALUES = {
  xs: 360,
  sm: 560,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const

export const BREAKPOINTS_PX = {
  xs: `${BREAKPOINT_VALUES.xs}px`,
  sm: `${BREAKPOINT_VALUES.sm}px`,
  md: `${BREAKPOINT_VALUES.md}px`,
  lg: `${BREAKPOINT_VALUES.lg}px`,
  xl: `${BREAKPOINT_VALUES.xl}px`,
} as const

export const CONTAINER_BREAKPOINTS = {
  xs: BREAKPOINTS_PX.xs,
  sm: BREAKPOINTS_PX.sm,
  md: BREAKPOINTS_PX.md,
  lg: BREAKPOINTS_PX.md,
  xl: BREAKPOINTS_PX.xl,
} as const

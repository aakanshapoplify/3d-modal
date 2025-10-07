export const FLOORS = [0, 3, 6, 9, 12];
export const GRID_SIZE = 0.25;
export const INTERIOR_FLOOR_DURATION_MS = 12000; // per interior floor stage
export const EXTERIOR_STAGE_DURATION_MS = 18000; // exterior stage in full tour
export const DEFAULT_TOUR_SPEED_RPM = 0.4; // revolutions per minute (default gentle pace)
export const MAX_TOUR_SPEED_RPM = 6; // hard clamp to prevent extreme jumps / motion sickness
// Commonly useful speed presets (rpm). Exterior: full revolution time = 60 / rpm seconds.
export const SPEED_PRESETS_RPM = [0.3, 0.6, 1.2, 3, 6];

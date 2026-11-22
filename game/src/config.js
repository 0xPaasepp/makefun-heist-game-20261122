// Shared constants for Velvet Midnight: the canvas size, the palette and the
// tuning numbers every system reads, so the look and the feel live in one place.

export const VIEW = { width: 1280, height: 800 };

// The museum floor is bigger than one screen; the camera follows the thief.
export const WORLD = { width: 1600, height: 1000 };

export const STEP = 1 / 60;

export const PALETTE = {
  floor: '#1b1626',
  floorAlt: '#221b30',
  carpet: '#3d1f3a',
  carpetEdge: '#6b2d5e',
  wall: '#0d0a14',
  wallTop: '#4a3f66',
  wallLine: '#8a7bb0',
  gold: '#f2c14e',
  goldBright: '#ffe9a8',
  loot: '#7fe7ff',
  danger: '#ff3b4e',
  dangerSoft: 'rgba(255, 59, 78, 0.20)',
  cone: 'rgba(255, 196, 66, 0.30)',
  coneAlert: 'rgba(255, 59, 78, 0.42)',
  coneCamera: 'rgba(127, 231, 255, 0.24)',
  guard: '#e8e4f2',
  guardSuit: '#2c3550',
  thief: '#14101f',
  thiefCoat: '#5b2d8e',
  hud: '#f5efe0',
  hudDim: '#9a8fb5',
  safe: '#58d68d',
  shadow: 'rgba(0, 0, 0, 0.55)',
};

// Movement: walk is brisk, sneak is slow and quiet, sprint is loud and fast.
export const PLAYER = {
  radius: 13,
  walkSpeed: 205,
  sneakSpeed: 105,
  sprintSpeed: 295,
  // How fast the alarm climbs (per second) while a guard or camera sees you.
  spotRateWalk: 26,
  spotRateSneak: 12,
  spotRateSprint: 48,
  spotRateCamera: 20,
  // How fast the alarm cools off while nobody sees you.
  coolRate: 9,
  // A guard that gets this close grabs you, whatever the alarm says.
  grabRadius: 26,
};

export const TOOLS = {
  emp: { uses: 2, freezeSeconds: 6, label: 'EMP' },
  noise: { uses: 2, label: 'NOISE' },
  // Seconds of holding E at the vault door before the lockpick opens it.
  lockpickSeconds: 2.2,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 62,
  chaseSpeed: 148,
  // Vision cone: how far and how wide a guard sees.
  viewRange: 235,
  viewHalfAngle: 0.62,
  // A guard that has lost you keeps hunting this long before giving up.
  huntSeconds: 3.5,
};

export const CAMERA = {
  viewRange: 215,
  viewHalfAngle: 0.5,
  sweepSpeed: 0.55,
};

// Loot values in dollars; the diamond is the prize of the whole heist.
export const LOOT_VALUES = { gem: 2500, vase: 1200, painting: 1800, diamond: 25000 };

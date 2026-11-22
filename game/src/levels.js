// The three floors of the Aurelia Museum, each one a room the thief crosses:
// the Gallery, the Vault Hall and the Aurelia Vault itself. Every floor is a
// set of walls with more than one route through them, guards on patrol loops,
// sweeping cameras, loot on pedestals and one way out. The floors are data,
// so the world, the renderer and the screenshots all read the same museum.

import { WORLD } from './config.js';

const T = 24; // wall thickness

function border() {
  return [
    { x: 0, y: 0, w: WORLD.width, h: T },
    { x: 0, y: WORLD.height - T, w: WORLD.width, h: T },
    { x: 0, y: 0, w: T, h: WORLD.height },
    { x: WORLD.width - T, y: 0, w: T, h: WORLD.height },
  ];
}

// A guard walks its waypoints in a loop, pausing at each one to look around.
function guard(waypoints, pause = 1.6) {
  return { waypoints, pause, waypoint: 0, wait: 0, x: waypoints[0][0], y: waypoints[0][1], facing: 0 };
}

// A camera is fixed to a wall and sweeps its cone back and forth.
function camera(x, y, centre, arc, phase = 0) {
  return { x, y, centre, arc, phase, angle: centre };
}

function loot(kind, x, y, name) {
  return { kind, x, y, name, taken: false, glint: Math.random() * Math.PI * 2 };
}

function floorOne() {
  return {
    name: 'FLOOR 1 — THE AURELIA GALLERY',
    subtitle: 'Slip past the night shift. Take everything that glints.',
    walls: [
      ...border(),
      // Divider A: the gap is mid-height, so the low road and the high road both work.
      { x: 560, y: T, w: T, h: 376 },
      { x: 560, y: 600, w: T, h: 376 },
      // Divider B: the gap is high, so the top corridor is the fast lane.
      { x: 1080, y: T, w: T, h: 216 },
      { x: 1080, y: 420, w: T, h: 556 },
      // Pillars to break sightlines in the middle room.
      { x: 760, y: 300, w: 44, h: 44 },
      { x: 900, y: 640, w: 44, h: 44 },
      { x: 760, y: 780, w: 44, h: 44 },
      // A velvet-rope island in the right room.
      { x: 1300, y: 560, w: 44, h: 44 },
    ],
    guards: [
      guard([[700, 260], [1000, 260], [1000, 700], [700, 700]]),
      guard([[1210, 480], [1500, 480], [1500, 860], [1210, 860]]),
    ],
    cameras: [
      camera(584, 130, Math.PI / 2, 1.5, 0),
      camera(1056, 880, -Math.PI / 2, 1.5, 2.1),
    ],
    loot: [
      loot('gem', 830, 500, 'Star Sapphire'),
      loot('vase', 1310, 200, 'Ming Vase'),
      loot('painting', 1310, 820, 'Portrait of Aurelia'),
    ],
    vaultDoor: null,
    spawn: { x: 100, y: 890 },
    exit: { x: 96, y: 96, label: 'STAIRS UP' },
  };
}

function floorTwo() {
  return {
    name: 'FLOOR 2 — THE VAULT HALL',
    subtitle: 'More guards, tighter cones. The hall never sleeps.',
    walls: [
      ...border(),
      // Divider A: the gap is low this time, so the bottom corridor is the lane.
      { x: 520, y: T, w: T, h: 620 },
      { x: 520, y: 820, w: T, h: 156 },
      // Divider B: two gaps, top and bottom, with a pillar between them.
      { x: 1040, y: T, w: T, h: 200 },
      { x: 1040, y: 380, w: T, h: 420 },
      { x: 1040, y: 880, w: T, h: 96 },
      // A long display case blocks the middle room's centre.
      { x: 700, y: 470, w: 220, h: 40 },
      { x: 700, y: 300, w: 40, h: 40 },
      { x: 880, y: 700, w: 40, h: 40 },
      { x: 1250, y: 300, w: 44, h: 44 },
      { x: 1250, y: 700, w: 44, h: 44 },
    ],
    guards: [
      guard([[650, 200], [950, 200], [950, 420], [650, 420]]),
      guard([[650, 800], [950, 800], [950, 560], [650, 560]], 1.2),
      guard([[1150, 500], [1480, 500], [1480, 850], [1150, 850]], 1.0),
    ],
    cameras: [
      camera(544, 700, 0, 1.4, 0),
      camera(1016, 120, Math.PI / 2, 1.4, 1.4),
      camera(1576, 500, Math.PI, 1.2, 2.6),
    ],
    loot: [
      loot('gem', 810, 250, 'Emerald Tear'),
      loot('painting', 810, 760, 'The Gilded Saint'),
      loot('vase', 1440, 180, 'Celadon Vase'),
      loot('gem', 1440, 900, 'Ruby Heart'),
    ],
    vaultDoor: null,
    spawn: { x: 100, y: 890 },
    exit: { x: 96, y: 96, label: 'STAIRS UP' },
  };
}

function floorThree() {
  return {
    name: 'FLOOR 3 — THE AURELIA VAULT',
    subtitle: 'The Diamond is behind the vault door. Pick the lock, grab it, run.',
    walls: [
      ...border(),
      // Divider A: the gap is mid-height again.
      { x: 520, y: T, w: T, h: 376 },
      { x: 520, y: 600, w: T, h: 376 },
      // The vault room: a walled box on the right, entered only through its door.
      { x: 1080, y: T, w: T, h: 420 },
      { x: 1080, y: 620, w: T, h: 356 },
      { x: 1080, y: 420, w: 496, h: T },
      { x: 1080, y: 596, w: 496, h: T },
      // Pillars in the approach hall.
      { x: 720, y: 300, w: 44, h: 44 },
      { x: 880, y: 680, w: 44, h: 44 },
    ],
    guards: [
      guard([[640, 220], [980, 220], [980, 460], [640, 460]]),
      guard([[640, 800], [980, 800], [980, 560], [640, 560]], 1.1),
      guard([[1120, 220], [1520, 220], [1520, 340], [1120, 340]], 0.9),
    ],
    cameras: [
      camera(544, 480, 0, 1.3, 0),
      camera(1056, 880, -Math.PI / 2, 1.3, 1.8),
      camera(1576, 500, Math.PI, 1.1, 3.1),
    ],
    loot: [
      loot('gem', 800, 520, 'Black Opal'),
      loot('painting', 1400, 180, 'Aurelia at Dusk'),
    ],
    // The vault door is the gap in the vault room's left wall; it opens only
    // after a lockpick. The Diamond waits inside the vault room.
    vaultDoor: { x: 1080, y: 444, w: T, h: 152, open: false, progress: 0 },
    vaultLoot: loot('diamond', 1330, 520, 'THE AURELIA DIAMOND'),
    spawn: { x: 100, y: 890 },
    exit: { x: 96, y: 96, label: 'GETAWAY VAN' },
  };
}

/** Build floor `index` (0, 1 or 2). The seed is kept for future variety. */
export function buildFloor(index) {
  const floor = [floorOne, floorTwo, floorThree][index]();
  floor.index = index;
  return floor;
}

export const FLOOR_COUNT = 3;

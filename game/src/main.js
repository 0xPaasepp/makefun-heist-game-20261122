// Boot: wire the canvas, the input, the world and the sounds together, run
// the fixed-step loop, and expose a small debug hook so a playtest can watch
// the real game state. Screenshot scenes come from ?shot= and &seed=.

import { STEP, VIEW } from './config.js';
import { Input } from './input.js';
import { render } from './render.js';
import { stageShot } from './shots.js';
import { World, SCREEN_CAUGHT, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './world.js';
import { setAlarmSound, sounds, unlockAudio } from './audio.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const ctx = canvas.getContext('2d');

function fitCanvas() {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
}

fitCanvas();
window.addEventListener('resize', fitCanvas);

const world = new World();
const input = new Input();
let shotMode = null;
let lastStatus = '';

world.onEvent = (name) => {
  if (name === 'loot') sounds.loot();
  if (name === 'emp') sounds.emp();
  if (name === 'noise') sounds.noise();
  if (name === 'vault') sounds.vault();
  if (name === 'spotted') sounds.spotted();
  if (name === 'caught') sounds.caught();
  if (name === 'win') sounds.win();
  if (name === 'floor') sounds.floor();
};

// ?shot=start|play|alert|vault stages an exact scene; &seed= picks the museum.
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || '1') || 1;
if (shot) {
  shotMode = shot;
  stageShot(shot, world);
} else {
  world.reset(seed);
}

window.addEventListener('keydown', unlockAudio, { once: true });
window.addEventListener('pointerdown', unlockAudio, { once: true });

/** The debug hook a playtest reads: live screen, player, guards, alarm. */
window.__heist = {
  get screen() {
    return world.screen;
  },
  get alarm() {
    return world.alarm;
  },
  get lootValue() {
    return world.lootValue;
  },
  get lootTaken() {
    return world.lootTaken;
  },
  get lootTotal() {
    return world.lootTotal;
  },
  get floorIndex() {
    return world.floorIndex;
  },
  get exitOpen() {
    return world.exitOpen;
  },
  get tools() {
    return { ...world.tools };
  },
  get empTimer() {
    return world.empTimer;
  },
  get player() {
    return { x: world.player.x, y: world.player.y, facing: world.player.facing };
  },
  get guards() {
    return world.floor.guards.map((g) => ({ x: g.x, y: g.y, mode: g.mode, facing: g.facing }));
  },
  get cameras() {
    return world.floor.cameras.map((c) => ({ x: c.x, y: c.y, angle: c.angle }));
  },
  get vaultDoor() {
    return world.floor.vaultDoor ? { ...world.floor.vaultDoor } : null;
  },
  get vaultLootTaken() {
    return world.floor.vaultLoot ? world.floor.vaultLoot.taken : null;
  },
  teleport(x, y) {
    world.player.x = x;
    world.player.y = y;
  },
  setAlarm(value) {
    world.alarm = value;
  },
  start() {
    world.begin();
  },
  world,
};

let last = performance.now();
let accumulator = 0;
let clock = 0;

function frame(now) {
  const elapsed = Math.min(0.1, (now - last) / 1000);
  last = now;
  clock += elapsed;
  if (world.screen === SCREEN_TITLE && input.wasPressed('start')) {
    unlockAudio();
    world.begin();
  } else if ((world.screen === SCREEN_CAUGHT || world.screen === SCREEN_WIN) && input.wasPressed('retry')) {
    unlockAudio();
    world.begin();
  } else if (world.screen === SCREEN_PLAY) {
    if (input.wasPressed('retry')) {
      world.begin();
    }
    if (input.wasPressed('emp')) world.useEmp();
    if (input.wasPressed('noise')) world.useNoise();
    if (input.wasPressed('interact')) world.interact();
    // In shot mode the staged scene stays exactly as staged: no stepping,
    // so the screenshot is the same frame every time.
    if (shotMode) {
      input.endFrame();
      render(ctx, world, clock);
      requestAnimationFrame(frame);
      return;
    }
    accumulator += elapsed;
    while (accumulator >= STEP) {
      world.step(STEP, input.state());
      accumulator -= STEP;
    }
    if (world.lockpicking && Math.random() < elapsed * 4) sounds.pick();
    setAlarmSound(world.alarm);
  }
  // In shot mode the world does not advance on its own: the frame is exact.
  const status = `${world.screen} floor ${world.floorIndex + 1} alarm ${Math.round(world.alarm)} loot $${world.lootValue}`;
  if (status !== lastStatus) {
    lastStatus = status;
    statusEl.textContent = status;
  }
  render(ctx, world, clock);
  input.endFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

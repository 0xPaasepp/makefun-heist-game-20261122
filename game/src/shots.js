// The screenshot scenes behind ?shot=start|play|alert|vault. Each one sets
// the real world to an exact state — the same code the player plays, placed
// where a real heist would be — so every screenshot is a true render of the
// game and the same seed always gives the same frame.

import { SCREEN_PLAY, SCREEN_TITLE } from './world.js';

function placeGuard(guard, x, y, facing, mode = 'patrol') {
  guard.x = x;
  guard.y = y;
  guard.facing = facing;
  guard.mode = mode;
  guard.wait = 0;
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * Unknown names fall back to the title screen.
 */
export function stageShot(name, world) {
  world.reset(1);
  if (name === 'play') {
    // Mid-heist on Floor 1: the thief crosses the middle room toward the
    // Star Sapphire, a guard's cone sweeps across the carpet, a camera
    // watches from the wall, the alarm is already a third full.
    world.screen = SCREEN_PLAY;
    world.time = 47;
    world.alarm = 34;
    world.player.x = 900;
    world.player.y = 520;
    world.player.facing = Math.PI;
    world.player.moving = true;
    const vase = world.floor.loot.find((item) => item.kind === 'vase');
    if (vase) {
      vase.taken = true;
      world.lootTaken = 1;
      world.lootValue = 1200;
    }
    placeGuard(world.floor.guards[0], 760, 320, 0.9);
    placeGuard(world.floor.guards[1], 1350, 620, Math.PI);
    world.floor.cameras[0].angle = Math.PI / 2 + 0.6;
    world.floor.cameras[1].angle = -Math.PI / 2 - 0.4;
    world.addParticles(830, 500, '#ffe9a8', 8, 60);
    world.say('The Star Sapphire glints across the room.');
    return { screen: SCREEN_PLAY };
  }
  if (name === 'alert') {
    // Spotted on Floor 2: the alarm is at 78%, a guard hunts the thief
    // down the hall with a red cone, and the exit is still locked.
    world.startFloor(1);
    world.screen = SCREEN_PLAY;
    world.time = 96;
    world.alarm = 78;
    world.player.x = 820;
    world.player.y = 380;
    world.player.facing = Math.PI;
    world.player.sneaking = true;
    const gem = world.floor.loot.find((item) => item.name === 'Emerald Tear');
    if (gem) {
      gem.taken = true;
      world.lootTaken = 1;
      world.lootValue = 2500;
    }
    placeGuard(world.floor.guards[0], 700, 200, 0.5, 'hunt');
    world.floor.guards[0].lastSeen = { x: 820, y: 380 };
    world.floor.guards[0].huntTimer = 3.5;
    placeGuard(world.floor.guards[1], 950, 700, -Math.PI / 2);
    world.floor.cameras[1].angle = Math.PI / 2 + 0.5;
    world.shake = 4;
    world.say('Spotted! Break line of sight before the alarm hits 100%.');
    return { screen: SCREEN_PLAY };
  }
  if (name === 'vault') {
    // At the vault on Floor 3: the thief picks the lock, the Diamond glows
    // behind the steel door, guards patrol the approach hall.
    world.startFloor(2);
    world.screen = SCREEN_PLAY;
    world.time = 168;
    world.alarm = 12;
    world.player.x = 985;
    world.player.y = 520;
    world.player.facing = 0;
    world.lockpicking = true;
    if (world.floor.vaultDoor) world.floor.vaultDoor.progress = 0.62;
    const opal = world.floor.loot.find((item) => item.kind === 'gem');
    if (opal) {
      opal.taken = true;
      world.lootTaken = 1;
      world.lootValue = 2500;
    }
    placeGuard(world.floor.guards[0], 800, 300, Math.PI / 2);
    placeGuard(world.floor.guards[1], 700, 750, 0);
    world.floor.cameras[0].angle = 0.5;
    world.say('Picking the vault lock — hold still, stay quiet.');
    return { screen: SCREEN_PLAY };
  }
  world.screen = SCREEN_TITLE;
  return { screen: SCREEN_TITLE };
}

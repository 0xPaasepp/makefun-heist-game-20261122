// The world: the thief, the guards, the cameras, the alarm and the loot.
// One step moves everything, checks every line of sight and decides whether
// the heist is still on, the thief is caught, or the getaway is happening.

import { CAMERA, GUARD, LOOT_VALUES, PLAYER, STEP, TOOLS, WORLD } from './config.js';
import { buildFloor, FLOOR_COUNT } from './levels.js';
import { angleDiff, angleTo, clamp, distance } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_WIN = 'win';

/** Does the segment (x1,y1)-(x2,y2) cross the rectangle? */
function segmentHitsRect(x1, y1, x2, y2, r) {
  // Quick reject by bounding box, then test the four edges.
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  if (maxX < r.x || minX > r.x + r.w || maxY < r.y || minY > r.y + r.h) return false;
  if (x1 >= r.x && x1 <= r.x + r.w && y1 >= r.y && y1 <= r.y + r.h) return true;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const edges = [
    [r.x, r.y, r.x + r.w, r.y],
    [r.x + r.w, r.y, r.x + r.w, r.y + r.h],
    [r.x + r.w, r.y + r.h, r.x, r.y + r.h],
    [r.x, r.y + r.h, r.x, r.y],
  ];
  for (const [ex1, ey1, ex2, ey2] of edges) {
    const ex = ex2 - ex1;
    const ey = ey2 - ey1;
    const denom = dx * ey - dy * ex;
    if (Math.abs(denom) < 1e-9) continue;
    const t = ((ex1 - x1) * ey - (ey1 - y1) * ex) / denom;
    const u = ((ex1 - x1) * dy - (ey1 - y1) * dx) / denom;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return true;
  }
  return false;
}

/** True when nothing solid stands between two points. */
function hasLineOfSight(walls, x1, y1, x2, y2) {
  for (const wall of walls) {
    if (segmentHitsRect(x1, y1, x2, y2, wall)) return false;
  }
  return true;
}

/** Push a circle out of a rectangle it overlaps; returns true on a hit. */
function collideCircleRect(p, r, rect) {
  const cx = clamp(p.x, rect.x, rect.x + rect.w);
  const cy = clamp(p.y, rect.y, rect.y + rect.h);
  const dx = p.x - cx;
  const dy = p.y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return false;
  if (d2 === 0) {
    p.x = rect.x - r;
    return true;
  }
  const d = Math.sqrt(d2);
  p.x = cx + (dx / d) * r;
  p.y = cy + (dy / d) * r;
  return true;
}

export class World {
  constructor() {
    this.reset(1);
  }

  reset(seed) {
    this.seed = seed;
    this.screen = SCREEN_TITLE;
    this.floorIndex = 0;
    this.floor = buildFloor(0);
    this.time = 0;
    this.alarm = 0;
    this.lootValue = 0;
    this.lootTaken = 0;
    this.lootTotal = this.countLoot();
    this.tools = { emp: TOOLS.emp.uses, noise: TOOLS.noise.uses };
    this.empTimer = 0;
    this.lockpicking = false;
    this.caughtBy = '';
    this.particles = [];
    this.shake = 0;
    this.flash = 0;
    this.message = '';
    this.messageTimer = 0;
    this.winTime = 0;
    this.player = {
      x: this.floor.spawn.x,
      y: this.floor.spawn.y,
      facing: -Math.PI / 2,
      moving: false,
      sneaking: false,
      sprinting: false,
    };
    this.resetFloorActors();
  }

  countLoot() {
    let n = this.floor.loot.length;
    if (this.floor.vaultLoot) n += 1;
    return n;
  }

  resetFloorActors() {
    for (const guard of this.floor.guards) {
      guard.mode = 'patrol';
      guard.waypoint = 0;
      guard.wait = 0;
      guard.x = guard.waypoints[0][0];
      guard.y = guard.waypoints[0][1];
      guard.facing = 0;
      guard.lastSeen = null;
      guard.huntTimer = 0;
      guard.noiseTarget = null;
    }
    for (const camera of this.floor.cameras) {
      camera.angle = camera.centre;
      camera.sweep = 1;
    }
    if (this.floor.vaultDoor) {
      this.floor.vaultDoor.open = false;
      this.floor.vaultDoor.progress = 0;
    }
  }

  startFloor(index) {
    this.floorIndex = index;
    this.floor = buildFloor(index);
    this.lootTotal = this.countLoot();
    this.lootTaken = 0;
    this.player.x = this.floor.spawn.x;
    this.player.y = this.floor.spawn.y;
    this.player.facing = -Math.PI / 2;
    this.alarm = Math.max(0, this.alarm - 25);
    this.empTimer = 0;
    this.resetFloorActors();
    this.say(this.floor.name);
  }

  say(text) {
    this.message = text;
    this.messageTimer = 3;
  }

  get exitOpen() {
    return this.lootTaken >= this.lootTotal;
  }

  get floorLoot() {
    return this.floor.vaultLoot ? [...this.floor.loot, this.floor.vaultLoot] : this.floor.loot;
  }

  addParticles(x, y, color, count, speed = 90) {
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 0.5 + Math.random() * 0.5,
        max: 1,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  /** Move the thief; walls stop the circle, they never swallow it. */
  movePlayer(dt, input) {
    const p = this.player;
    let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    if (mx === 0 && my === 0) {
      p.moving = false;
      p.sneaking = false;
      p.sprinting = false;
      return;
    }
    const len = Math.hypot(mx, my);
    mx /= len;
    my /= len;
    p.sneaking = !!input.sneak;
    p.sprinting = !!input.sprint && !input.sneak;
    const speed = p.sneaking ? PLAYER.sneakSpeed : p.sprinting ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    p.x += mx * speed * dt;
    p.y += my * speed * dt;
    p.facing = Math.atan2(my, mx);
    p.moving = true;
    for (const wall of this.floor.walls) collideCircleRect(p, PLAYER.radius, wall);
    if (this.floor.vaultDoor && !this.floor.vaultDoor.open) {
      collideCircleRect(p, PLAYER.radius, this.floor.vaultDoor);
    }
    p.x = clamp(p.x, 24 + PLAYER.radius, WORLD.width - 24 - PLAYER.radius);
    p.y = clamp(p.y, 24 + PLAYER.radius, WORLD.height - 24 - PLAYER.radius);
  }

  /** One guard step: patrol its loop, hunt what it saw, or chase a noise. */
  stepGuard(guard, dt) {
    const p = this.player;
    let target = null;
    let speed = GUARD.patrolSpeed;
    if (guard.mode === 'hunt' && guard.lastSeen) {
      target = guard.lastSeen;
      speed = GUARD.chaseSpeed;
      guard.huntTimer -= dt;
      if (guard.huntTimer <= 0) {
        guard.mode = 'patrol';
        guard.lastSeen = null;
      }
    } else if (guard.mode === 'investigate' && guard.noiseTarget) {
      target = guard.noiseTarget;
      speed = GUARD.patrolSpeed * 1.4;
      if (distance(guard.x, guard.y, target.x, target.y) < 24) {
        guard.noiseTarget = null;
        guard.mode = 'patrol';
        guard.wait = 1.5;
      }
    } else {
      const wp = guard.waypoints[guard.waypoint];
      if (guard.wait > 0) {
        guard.wait -= dt;
        guard.facing += Math.sin(this.time * 1.4 + guard.waypoint) * 0.02;
        return;
      }
      target = { x: wp[0], y: wp[1] };
      if (distance(guard.x, guard.y, wp[0], wp[1]) < 10) {
        guard.waypoint = (guard.waypoint + 1) % guard.waypoints.length;
        guard.wait = guard.pause;
        return;
      }
    }
    if (!target) return;
    const a = angleTo(guard.x, guard.y, target.x, target.y);
    guard.facing = a;
    const step = speed * dt;
    const d = distance(guard.x, guard.y, target.x, target.y);
    const move = Math.min(step, d);
    guard.x += Math.cos(a) * move;
    guard.y += Math.sin(a) * move;
    // A chasing guard that reaches the thief grabs them.
    if (guard.mode === 'hunt' && distance(guard.x, guard.y, p.x, p.y) < PLAYER.grabRadius) {
      this.getCaught('A guard grabbed you in the dark.');
    }
  }

  /** A guard's cone sees the thief: close, in front, and nothing in the way. */
  guardSees(guard) {
    const p = this.player;
    const d = distance(guard.x, guard.y, p.x, p.y);
    if (d > GUARD.viewRange) return 0;
    const a = angleTo(guard.x, guard.y, p.x, p.y);
    if (Math.abs(angleDiff(guard.facing, a)) > GUARD.viewHalfAngle) return 0;
    if (!hasLineOfSight(this.floor.walls, guard.x, guard.y, p.x, p.y)) return 0;
    // Closer and louder is easier to spot: distance scales the rate.
    const closeness = 1.3 - d / GUARD.viewRange;
    return closeness;
  }

  /** A camera's cone sees the thief the same way, unless EMP froze it. */
  cameraSees(camera) {
    if (this.empTimer > 0) return 0;
    const p = this.player;
    const d = distance(camera.x, camera.y, p.x, p.y);
    if (d > CAMERA.viewRange) return 0;
    const a = angleTo(camera.x, camera.y, p.x, p.y);
    if (Math.abs(angleDiff(camera.angle, a)) > CAMERA.viewHalfAngle) return 0;
    if (!hasLineOfSight(this.floor.walls, camera.x, camera.y, p.x, p.y)) return 0;
    return 1.3 - d / CAMERA.viewRange;
  }

  stepCameras(dt) {
    for (const camera of this.floor.cameras) {
      if (this.empTimer > 0) continue;
      camera.angle += CAMERA.sweepSpeed * camera.sweep * dt;
      const off = angleDiff(camera.centre, camera.angle);
      if (off > camera.arc) {
        camera.angle = camera.centre + camera.arc;
        camera.sweep = -1;
      } else if (off < -camera.arc) {
        camera.angle = camera.centre - camera.arc;
        camera.sweep = 1;
      }
    }
  }

  /** E near loot takes it; E at the vault door picks the lock. */
  interact() {
    const p = this.player;
    for (const item of this.floorLoot) {
      if (item.taken) continue;
      if (distance(p.x, p.y, item.x, item.y) < 46) {
        if (item.kind === 'diamond' && this.floor.vaultDoor && !this.floor.vaultDoor.open) continue;
        item.taken = true;
        this.lootTaken += 1;
        this.lootValue += LOOT_VALUES[item.kind] ?? 500;
        this.addParticles(item.x, item.y, '#ffe9a8', 22, 130);
        this.say(`Took the ${item.name} — $${LOOT_VALUES[item.kind].toLocaleString('en-US')}`);
        this.onEvent('loot');
        if (this.exitOpen) this.say('All loot taken — reach the exit!');
        return true;
      }
    }
    return false;
  }

  /** Hold E at the vault door to pick its lock, second by second. */
  stepLockpick(dt, holding) {
    const door = this.floor.vaultDoor;
    if (!door || door.open) {
      this.lockpicking = false;
      return;
    }
    const p = this.player;
    const near = distance(p.x, p.y, door.x + door.w / 2, door.y + door.h / 2) < 90;
    if (near && holding) {
      this.lockpicking = true;
      door.progress += dt / TOOLS.lockpickSeconds;
      if (Math.random() < dt * 6) {
        this.addParticles(door.x + door.w / 2, door.y + door.h / 2, '#7fe7ff', 1, 40);
      }
      if (door.progress >= 1) {
        door.open = true;
        this.lockpicking = false;
        this.addParticles(door.x + door.w / 2, door.y + door.h / 2, '#58d68d', 26, 150);
        this.say('The vault door swings open. The Diamond is yours to take.');
        this.onEvent('vault');
      }
    } else {
      this.lockpicking = false;
      door.progress = Math.max(0, door.progress - dt * 0.4);
    }
  }

  useEmp() {
    if (this.tools.emp <= 0) {
      this.say('No EMP charges left.');
      return false;
    }
    this.tools.emp -= 1;
    this.empTimer = TOOLS.emp.freezeSeconds;
    this.addParticles(this.player.x, this.player.y, '#7fe7ff', 30, 220);
    this.say(`EMP burst — cameras frozen for ${TOOLS.emp.freezeSeconds}s.`);
    this.onEvent('emp');
    return true;
  }

  useNoise() {
    if (this.tools.noise <= 0) {
      this.say('No noise-makers left.');
      return false;
    }
    this.tools.noise -= 1;
    const p = this.player;
    const tx = clamp(p.x + Math.cos(p.facing) * 190, 60, WORLD.width - 60);
    const ty = clamp(p.y + Math.sin(p.facing) * 190, 60, WORLD.height - 60);
    let nearest = null;
    let best = Infinity;
    for (const guard of this.floor.guards) {
      const d = distance(guard.x, guard.y, p.x, p.y);
      if (d < best) {
        best = d;
        nearest = guard;
      }
    }
    if (nearest) {
      nearest.mode = 'investigate';
      nearest.noiseTarget = { x: tx, y: ty };
      nearest.lastSeen = null;
    }
    this.addParticles(tx, ty, '#f2c14e', 16, 120);
    this.say('Clatter down the hall — the nearest guard goes to look.');
    this.onEvent('noise');
    return true;
  }

  getCaught(reason) {
    if (this.screen !== SCREEN_PLAY) return;
    this.screen = SCREEN_CAUGHT;
    this.caughtBy = reason;
    this.alarm = 100;
    this.shake = 14;
    this.flash = 0.7;
    this.onEvent('caught');
  }

  /** The exit only opens once every piece of loot on the floor is taken. */
  stepExit() {
    if (!this.exitOpen) return;
    const p = this.player;
    if (distance(p.x, p.y, this.floor.exit.x, this.floor.exit.y) < 42) {
      this.addParticles(p.x, p.y, '#58d68d', 30, 160);
      if (this.floorIndex + 1 >= FLOOR_COUNT) {
        this.screen = SCREEN_WIN;
        this.winTime = this.time;
        this.onEvent('win');
      } else {
        this.startFloor(this.floorIndex + 1);
        this.onEvent('floor');
      }
    }
  }

  /** The alarm is fair: it builds while you are seen and cools off in the dark. */
  stepDetection(dt) {
    const p = this.player;
    let rate = 0;
    let seenByGuard = false;
    for (const guard of this.floor.guards) {
      const seen = this.guardSees(guard);
      if (seen > 0) {
        seenByGuard = true;
        const base = p.sneaking ? PLAYER.spotRateSneak : p.sprinting ? PLAYER.spotRateSprint : PLAYER.spotRateWalk;
        rate = Math.max(rate, base * seen);
        if (this.alarm > 55) {
          guard.mode = 'hunt';
          guard.lastSeen = { x: p.x, y: p.y };
          guard.huntTimer = GUARD.huntSeconds;
        } else if (this.alarm > 25) {
          guard.lastSeen = { x: p.x, y: p.y };
        }
      }
    }
    for (const camera of this.floor.cameras) {
      const seen = this.cameraSees(camera);
      if (seen > 0) rate = Math.max(rate, PLAYER.spotRateCamera * seen);
    }
    if (rate > 0) {
      const before = this.alarm;
      this.alarm = clamp(this.alarm + rate * dt, 0, 100);
      if (this.alarm >= 100) {
        this.getCaught('The alarm hit 100% — lockdown. Security swarmed the room.');
      } else if (before < 55 && this.alarm >= 55) {
        this.shake = Math.max(this.shake, 6);
        this.onEvent('spotted');
      }
    } else {
      this.alarm = clamp(this.alarm - PLAYER.coolRate * dt, 0, 100);
    }
    // A guard close enough to touch you ends the heist at once.
    if (this.screen === SCREEN_PLAY) {
      for (const guard of this.floor.guards) {
        if (distance(guard.x, guard.y, p.x, p.y) < PLAYER.grabRadius) {
          this.getCaught('A guard grabbed you in the dark.');
          break;
        }
      }
    }
    return seenByGuard;
  }

  /** Hook the renderer and the sounds listen to; main.js sets it. */
  onEvent(_name) {}

  step(dt, input) {
    if (this.screen !== SCREEN_PLAY) return;
    this.time += dt;
    this.empTimer = Math.max(0, this.empTimer - dt);
    this.messageTimer = Math.max(0, this.messageTimer - dt);
    this.shake = Math.max(0, this.shake - dt * 22);
    this.flash = Math.max(0, this.flash - dt * 1.4);
    this.movePlayer(dt, input);
    this.stepCameras(dt);
    for (const guard of this.floor.guards) this.stepGuard(guard, dt);
    this.stepLockpick(dt, !!input.interact);
    this.stepDetection(dt);
    this.stepExit();
    for (const particle of this.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.96;
      particle.vy *= 0.96;
      particle.life -= dt;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  /** Start a fresh run from the title screen. */
  begin() {
    this.reset(this.seed);
    this.screen = SCREEN_PLAY;
    this.say(this.floor.name);
  }
}

export { STEP };

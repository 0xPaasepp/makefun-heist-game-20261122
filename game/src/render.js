// The renderer: every frame of Velvet Midnight, drawn on one canvas.
// The museum is dark on purpose — a light pool follows the thief, guard
// cones sweep amber across the floor, cameras paint cyan wedges, loot glints
// gold — so safe cover, danger and the prize read at a glance.

import { CAMERA, GUARD, PALETTE, PLAYER, VIEW, WORLD } from './config.js';
import { SCREEN_CAUGHT, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './world.js';
import { clamp } from './random.js';

const lightCanvas = document.createElement('canvas');
lightCanvas.width = VIEW.width;
lightCanvas.height = VIEW.height;
const lightCtx = lightCanvas.getContext('2d');

function drawCone(ctx, x, y, angle, range, halfAngle, fill) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawWall(ctx, wall) {
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
  ctx.fillStyle = PALETTE.wallTop;
  ctx.fillRect(wall.x, wall.y, wall.w, 4);
  ctx.strokeStyle = PALETTE.wallLine;
  ctx.lineWidth = 1;
  ctx.strokeRect(wall.x + 0.5, wall.y + 0.5, wall.w - 1, wall.h - 1);
}

function drawLoot(ctx, item, time, camX) {
  const pulse = 0.6 + Math.sin(time * 3 + item.glint) * 0.4;
  const glow = ctx.createRadialGradient(item.x, item.y, 2, item.x, item.y, 46 + pulse * 14);
  glow.addColorStop(0, item.kind === 'diamond' ? 'rgba(127, 231, 255, 0.55)' : 'rgba(242, 193, 78, 0.45)');
  glow.addColorStop(1, 'rgba(242, 193, 78, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(item.x, item.y, 60, 0, Math.PI * 2);
  ctx.fill();
  // Pedestal.
  ctx.fillStyle = '#241d33';
  ctx.beginPath();
  ctx.arc(item.x, item.y + 8, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2;
  ctx.stroke();
  // The piece itself, drawn as a faceted gem.
  const s = item.kind === 'diamond' ? 15 : 11;
  ctx.save();
  ctx.translate(item.x, item.y - 4 + Math.sin(time * 2 + item.glint) * 2);
  ctx.rotate(Math.sin(time * 1.5 + item.glint) * 0.15);
  ctx.fillStyle = item.kind === 'diamond' ? PALETTE.loot : PALETTE.goldBright;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.8, 0);
  ctx.lineTo(0, s);
  ctx.lineTo(-s * 0.8, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.4, -s * 0.2);
  ctx.lineTo(0, s * 0.3);
  ctx.lineTo(-s * 0.4, -s * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Sparkles.
  ctx.fillStyle = `rgba(255, 233, 168, ${0.4 + pulse * 0.5})`;
  for (let i = 0; i < 3; i += 1) {
    const a = item.glint + i * 2.1 + time * 0.8;
    const r = 26 + (i % 2) * 10;
    ctx.beginPath();
    ctx.arc(item.x + Math.cos(a) * r, item.y + Math.sin(a) * r * 0.6 - 4, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Label, so the target reads even shrunk to a contact sheet. Clamped
  // inside the view, so a prize near the edge never gets its name cut off.
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(245, 239, 224, 0.9)';
  const labelX = clamp(item.x, camX + 80, camX + VIEW.width - 80);
  ctx.fillText(item.name.toUpperCase(), labelX, item.y + 34);
}

function drawGuard(ctx, guard, time) {
  const alerted = guard.mode === 'hunt';
  const investigating = guard.mode === 'investigate';
  // Body: a night-shift guard in a dark suit, torch in hand.
  ctx.save();
  ctx.translate(guard.x, guard.y);
  ctx.rotate(guard.facing);
  ctx.fillStyle = alerted ? '#5a1620' : PALETTE.guardSuit;
  ctx.beginPath();
  ctx.arc(0, 0, GUARD.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = alerted ? PALETTE.danger : 'rgba(232, 228, 242, 0.7)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Torch beam nub and facing wedge.
  ctx.fillStyle = alerted ? PALETTE.danger : '#ffe9a8';
  ctx.beginPath();
  ctx.moveTo(GUARD.radius - 2, -4);
  ctx.lineTo(GUARD.radius + 10, 0);
  ctx.lineTo(GUARD.radius - 2, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Head.
  ctx.fillStyle = '#e8c39a';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c2436';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y - 2, 6, Math.PI, 0);
  ctx.fill();
  // "!" when hunting, "?" when investigating — the fair tell.
  if (alerted || investigating) {
    const bob = Math.sin(time * 8) * 2;
    ctx.font = '900 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = alerted ? PALETTE.danger : PALETTE.gold;
    ctx.fillText(alerted ? '!' : '?', guard.x, guard.y - 24 + bob);
  }
}

function drawCamera(ctx, camera, frozen) {
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.rotate(camera.angle);
  ctx.fillStyle = frozen ? '#3a4a5a' : '#20242e';
  ctx.fillRect(-4, -7, 16, 14);
  ctx.fillStyle = frozen ? '#7fe7ff' : '#ff5a5a';
  ctx.beginPath();
  ctx.arc(12, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = frozen ? 'rgba(127, 231, 255, 0.9)' : 'rgba(255, 90, 90, 0.9)';
  ctx.font = '700 9px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(frozen ? 'FROZEN' : 'CAM', camera.x, camera.y - 12);
}

function drawThief(ctx, player, time) {
  const p = player;
  const bob = p.moving ? Math.sin(time * 11) * 1.5 : 0;
  // A soft gold halo, so the eye finds the thief at a glance in the dark.
  const halo = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 36);
  halo.addColorStop(0, 'rgba(242, 193, 78, 0.22)');
  halo.addColorStop(1, 'rgba(242, 193, 78, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(p.x, p.y + bob * 0.4);
  ctx.rotate(p.facing);
  // Cloak.
  ctx.fillStyle = PALETTE.thiefCoat;
  ctx.beginPath();
  ctx.moveTo(-PLAYER.radius, -9);
  ctx.lineTo(PLAYER.radius + 4, 0);
  ctx.lineTo(-PLAYER.radius, 9);
  ctx.closePath();
  ctx.fill();
  // Body.
  ctx.fillStyle = PALETTE.thief;
  ctx.beginPath();
  ctx.arc(0, 0, PLAYER.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Hood point and mask glint.
  ctx.fillStyle = '#2a2140';
  ctx.beginPath();
  ctx.moveTo(4, -7);
  ctx.lineTo(PLAYER.radius + 6, 0);
  ctx.lineTo(4, 7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(6, -3, 1.8, 0, Math.PI * 2);
  ctx.arc(6, 3, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (p.sneaking) {
    ctx.font = '600 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(245, 239, 224, 0.75)';
    ctx.fillText('SNEAKING', p.x, p.y - 22);
  }
}

function drawFloor(ctx, world) {
  ctx.fillStyle = PALETTE.floor;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  // Checker tiles, faint enough to read as marble in the dark.
  ctx.fillStyle = PALETTE.floorAlt;
  const tile = 80;
  for (let y = 0; y < WORLD.height / tile; y += 1) {
    for (let x = 0; x < WORLD.width / tile; x += 1) {
      if ((x + y) % 2 === 0) ctx.fillRect(x * tile, y * tile, tile, tile);
    }
  }
  // Velvet carpet runners down the middle of each room.
  ctx.fillStyle = PALETTE.carpet;
  ctx.fillRect(120, 470, 1360, 60);
  ctx.fillRect(120, 120, 1360, 60);
  ctx.strokeStyle = PALETTE.carpetEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(120.5, 470.5, 1360, 60);
  ctx.strokeRect(120.5, 120.5, 1360, 60);
  // Gold rope dots along the carpets.
  ctx.fillStyle = PALETTE.gold;
  for (let x = 160; x < 1480; x += 80) {
    ctx.beginPath();
    ctx.arc(x, 470, 3, 0, Math.PI * 2);
    ctx.arc(x, 530, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // The exit: a green-lit door with its label.
  const exit = world.floor.exit;
  const open = world.exitOpen;
  const glow = ctx.createRadialGradient(exit.x, exit.y, 4, exit.x, exit.y, 70);
  glow.addColorStop(0, open ? 'rgba(88, 214, 141, 0.5)' : 'rgba(154, 143, 181, 0.25)');
  glow.addColorStop(1, 'rgba(88, 214, 141, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(exit.x, exit.y, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = open ? '#123524' : '#1a1626';
  ctx.fillRect(exit.x - 26, exit.y - 26, 52, 52);
  ctx.strokeStyle = open ? PALETTE.safe : PALETTE.hudDim;
  ctx.lineWidth = 3;
  ctx.strokeRect(exit.x - 26, exit.y - 26, 52, 52);
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = open ? PALETTE.safe : PALETTE.hudDim;
  ctx.fillText(exit.label, exit.x, exit.y + 44);
  if (!open) {
    ctx.fillStyle = 'rgba(245, 239, 224, 0.7)';
    ctx.fillText('LOCKED — TAKE ALL LOOT', exit.x, exit.y + 58);
  }
  // The vault door, when this floor has one: drawn after the walls, so its
  // label is never buried under one. The label sits to the door's left.
  const door = world.floor.vaultDoor;
  if (door) {
    ctx.fillStyle = door.open ? '#1a2b22' : '#39445c';
    ctx.fillRect(door.x, door.y, door.w, door.h);
    ctx.strokeStyle = door.open ? PALETTE.safe : '#c9d4e8';
    ctx.lineWidth = 2;
    ctx.strokeRect(door.x + 1, door.y + 1, door.w - 2, door.h - 2);
    ctx.fillStyle = '#c9d4e8';
    ctx.beginPath();
    ctx.arc(door.x + door.w / 2, door.y + door.h / 2, 5, 0, Math.PI * 2);
    ctx.fill();
    if (!door.open) {
      ctx.font = '700 10px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(245, 239, 224, 0.9)';
      ctx.fillText('VAULT — HOLD E TO PICK', door.x - 10, door.y + door.h / 2 + 4);
      ctx.textAlign = 'center';
      if (door.progress > 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(door.x - 84, door.y + door.h / 2 - 4, 84, 8);
        ctx.fillStyle = '#7fe7ff';
        ctx.fillRect(door.x - 84, door.y + door.h / 2 - 4, 84 * door.progress, 8);
      }
    }
  }
  for (const wall of world.floor.walls) drawWall(ctx, wall);
}

/** The darkness: a black veil with a pool of light around the thief. */
function drawDarkness(ctx, world, camX, camY) {
  const p = world.player;
  const lx = lightCtx;
  lx.clearRect(0, 0, VIEW.width, VIEW.height);
  lx.fillStyle = 'rgba(4, 3, 10, 0.60)';
  lx.fillRect(0, 0, VIEW.width, VIEW.height);
  lx.globalCompositeOperation = 'destination-out';
  const px = p.x - camX;
  const py = p.y - camY;
  const radius = p.sneaking ? 210 : 250;
  const grad = lx.createRadialGradient(px, py, 10, px, py, radius);
  grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
  grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.9)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  lx.fillStyle = grad;
  lx.beginPath();
  lx.arc(px, py, radius, 0, Math.PI * 2);
  lx.fill();
  // Loot glints pierce the dark a little, so the prize is findable.
  for (const item of world.floorLoot) {
    if (item.taken) continue;
    const ix = item.x - camX;
    const iy = item.y - camY;
    const g2 = lx.createRadialGradient(ix, iy, 2, ix, iy, 60);
    g2.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
    g2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    lx.fillStyle = g2;
    lx.beginPath();
    lx.arc(ix, iy, 60, 0, Math.PI * 2);
    lx.fill();
  }
  lx.globalCompositeOperation = 'source-over';
  ctx.drawImage(lightCanvas, 0, 0);
}

function drawHud(ctx, world) {
  const w = VIEW.width;
  // Top bar.
  ctx.fillStyle = 'rgba(7, 6, 13, 0.78)';
  ctx.fillRect(0, 0, w, 64);
  ctx.strokeStyle = 'rgba(242, 193, 78, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 64.5);
  ctx.lineTo(w, 64.5);
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.hud;
  ctx.font = '800 20px system-ui, sans-serif';
  ctx.fillText('VELVET MIDNIGHT', 18, 27);
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.fillText(world.floor.name, 18, 46);
  // Alarm meter: the big one, centre-top, impossible to miss.
  const alarmW = 320;
  const alarmX = w / 2 - alarmW / 2;
  const alarmY = 14;
  ctx.font = '800 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = world.alarm >= 55 ? PALETTE.danger : PALETTE.hud;
  ctx.fillText(`ALARM  ${Math.round(world.alarm)}%`, w / 2, alarmY + 11);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.fillRect(alarmX, alarmY + 16, alarmW, 14);
  const alarmColor = world.alarm >= 55 ? PALETTE.danger : world.alarm >= 25 ? '#ff9f2e' : PALETTE.gold;
  ctx.fillStyle = alarmColor;
  ctx.fillRect(alarmX, alarmY + 16, alarmW * (world.alarm / 100), 14);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.strokeRect(alarmX + 0.5, alarmY + 16.5, alarmW, 14);
  if (world.alarm >= 55) {
    ctx.fillStyle = PALETTE.danger;
    ctx.font = '800 11px system-ui, sans-serif';
    ctx.fillText('SPOTTED — BREAK LINE OF SIGHT', w / 2, alarmY + 44);
  }
  // Loot and tools, right side.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.goldBright;
  ctx.font = '800 18px system-ui, sans-serif';
  ctx.fillText(`$${world.lootValue.toLocaleString('en-US')}`, w - 18, 26);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillText(`LOOT ${world.lootTaken}/${world.lootTotal}`, w - 18, 45);
  ctx.textAlign = 'left';
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.fillStyle = world.tools.emp > 0 ? '#7fe7ff' : PALETTE.hudDim;
  ctx.fillText(`[Q] EMP ×${world.tools.emp}${world.empTimer > 0 ? ` — ${Math.ceil(world.empTimer)}s` : ''}`, 18, 82);
  ctx.fillStyle = world.tools.noise > 0 ? PALETTE.gold : PALETTE.hudDim;
  ctx.fillText(`[F] NOISE ×${world.tools.noise}`, 180, 82);
  // Objective line, bottom.
  ctx.fillStyle = 'rgba(7, 6, 13, 0.72)';
  ctx.fillRect(0, VIEW.height - 34, w, 34);
  ctx.fillStyle = PALETTE.hud;
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const objective = world.exitOpen
    ? 'All loot taken — reach the green exit!'
    : `Steal ${world.lootTotal - world.lootTaken} more piece${world.lootTotal - world.lootTaken === 1 ? '' : 's'} of loot, then reach the exit.`;
  ctx.fillText(objective, w / 2, VIEW.height - 12);
  // A message line above the controls, when the game has news.
  if (world.messageTimer > 0 && world.message) {
    ctx.font = '700 14px system-ui, sans-serif';
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(world.message, w / 2, VIEW.height - 58);
  }
  // Controls reminder, bottom-left, small.
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(245, 239, 224, 0.55)';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText('WASD move · SHIFT sneak · E grab / pick · Q EMP · F noise · R retry', 14, VIEW.height - 44);
}

function drawTitle(ctx, world, time) {
  ctx.fillStyle = 'rgba(7, 6, 13, 0.86)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // A gold frame.
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2;
  ctx.strokeRect(90.5, 90.5, VIEW.width - 181, VIEW.height - 181);
  ctx.strokeStyle = 'rgba(242, 193, 78, 0.4)';
  ctx.strokeRect(102.5, 102.5, VIEW.width - 205, VIEW.height - 205);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = '800 15px system-ui, sans-serif';
  ctx.fillText('THE AURELIA MUSEUM  ·  2:47 AM  ·  ONE THIEF, THREE FLOORS', VIEW.width / 2, 190);
  ctx.fillStyle = PALETTE.hud;
  ctx.font = '900 72px Georgia, serif';
  ctx.fillText('VELVET MIDNIGHT', VIEW.width / 2, 280);
  ctx.fillStyle = PALETTE.goldBright;
  ctx.font = 'italic 600 26px Georgia, serif';
  ctx.fillText('— The Aurelia Heist —', VIEW.width / 2, 326);
  ctx.fillStyle = PALETTE.hud;
  ctx.font = '400 17px system-ui, sans-serif';
  ctx.fillText('Sneak past the guards and their sweeping cones, freeze the cameras,', VIEW.width / 2, 396);
  ctx.fillText('steal every piece of loot, and slip out to the getaway van.', VIEW.width / 2, 422);
  ctx.fillText('The Diamond waits behind the vault door on Floor 3.', VIEW.width / 2, 448);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillText('WASD / ARROWS — move      SHIFT — sneak      E — grab loot / pick the vault lock', VIEW.width / 2, 506);
  ctx.fillText('Q — EMP burst (freezes cameras)      F — noise-maker (lures a guard)      R — retry', VIEW.width / 2, 532);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = '800 22px system-ui, sans-serif';
  const blink = 0.65 + Math.sin(time * 3) * 0.35;
  ctx.globalAlpha = blink;
  ctx.fillText('PRESS ENTER TO BEGIN THE HEIST', VIEW.width / 2, 606);
  ctx.globalAlpha = 1;
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillText('If a guard or a camera spots you, the alarm climbs. At 100% the museum locks down.', VIEW.width / 2, 660);
}

function drawCaught(ctx, world) {
  ctx.fillStyle = 'rgba(40, 4, 8, 0.82)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.danger;
  ctx.font = '900 64px Georgia, serif';
  ctx.fillText('CAUGHT', VIEW.width / 2, 330);
  ctx.fillStyle = PALETTE.hud;
  ctx.font = '400 19px system-ui, sans-serif';
  ctx.fillText(world.caughtBy || 'The museum locks down around you.', VIEW.width / 2, 386);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillText(`Loot kept: $${world.lootValue.toLocaleString('en-US')}  ·  Floor ${world.floorIndex + 1} of 3`, VIEW.width / 2, 430);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = '800 20px system-ui, sans-serif';
  ctx.fillText('PRESS R TO TRY AGAIN', VIEW.width / 2, 500);
}

function drawWin(ctx, world) {
  ctx.fillStyle = 'rgba(6, 20, 12, 0.86)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.safe;
  ctx.font = '900 60px Georgia, serif';
  ctx.fillText('THE GETAWAY', VIEW.width / 2, 300);
  ctx.fillStyle = PALETTE.goldBright;
  ctx.font = 'italic 600 26px Georgia, serif';
  ctx.fillText('The Aurelia Diamond is yours. The van is already moving.', VIEW.width / 2, 352);
  ctx.fillStyle = PALETTE.hud;
  ctx.font = '800 30px system-ui, sans-serif';
  ctx.fillText(`TOTAL HAUL  $${world.lootValue.toLocaleString('en-US')}`, VIEW.width / 2, 430);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillText('Three floors. No alarms left ringing. A clean job.', VIEW.width / 2, 474);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = '800 20px system-ui, sans-serif';
  ctx.fillText('PRESS R TO RUN IT AGAIN', VIEW.width / 2, 540);
}

/** Draw one frame. `time` is the wall clock in seconds, for pulsing. */
export function render(ctx, world, time) {
  const canvas = ctx.canvas;
  const scale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
  const offsetX = (canvas.width - VIEW.width * scale) / 2;
  const offsetY = (canvas.height - VIEW.height * scale) / 2;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#07060d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
  // Camera follows the thief, clamped inside the museum.
  const shakeX = world.shake > 0 ? (Math.random() - 0.5) * world.shake : 0;
  const shakeY = world.shake > 0 ? (Math.random() - 0.5) * world.shake : 0;
  const camX = clamp(world.player.x - VIEW.width / 2, 0, WORLD.width - VIEW.width) + shakeX;
  const camY = clamp(world.player.y - VIEW.height / 2, 0, WORLD.height - VIEW.height) + shakeY;
  ctx.save();
  ctx.translate(-camX, -camY);
  drawFloor(ctx, world);
  for (const item of world.floorLoot) {
    if (!item.taken) drawLoot(ctx, item, time, camX);
  }
  for (const guard of world.floor.guards) drawGuard(ctx, guard, time);
  for (const camera of world.floor.cameras) drawCamera(ctx, camera, world.empTimer > 0);
  drawThief(ctx, world.player, time);
  // Particles.
  for (const particle of world.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.max);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  drawDarkness(ctx, world, camX, camY);
  // Vision cones glow over the darkness, so danger reads at a glance.
  ctx.globalCompositeOperation = 'lighter';
  for (const guard of world.floor.guards) {
    const alerted = guard.mode === 'hunt';
    drawCone(ctx, guard.x, guard.y, guard.facing, GUARD.viewRange, 0.62, alerted ? PALETTE.coneAlert : PALETTE.cone);
  }
  for (const camera of world.floor.cameras) {
    if (world.empTimer > 0) continue;
    drawCone(ctx, camera.x, camera.y, camera.angle, CAMERA.viewRange, CAMERA.viewHalfAngle, PALETTE.coneCamera);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
  // Red flash when caught.
  if (world.flash > 0) {
    ctx.fillStyle = `rgba(255, 59, 78, ${world.flash * 0.35})`;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
  if (world.screen === SCREEN_PLAY || world.screen === SCREEN_CAUGHT) drawHud(ctx, world);
  if (world.screen === SCREEN_TITLE) drawTitle(ctx, world, time);
  if (world.screen === SCREEN_CAUGHT) drawCaught(ctx, world);
  if (world.screen === SCREEN_WIN) drawWin(ctx, world);
}

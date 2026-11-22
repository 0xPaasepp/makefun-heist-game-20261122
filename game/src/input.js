// Keyboard input: WASD or arrows to move, Shift to sneak, E to interact,
// Q for the EMP, F for the noise-maker, R to retry, Enter to start.
// Keys are read as a held set each frame, with edge-triggered presses for
// the actions that fire once per press.

const KEYMAP = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'sneak',
  ShiftRight: 'sneak',
  KeyE: 'interact',
  Space: 'interact',
  KeyQ: 'emp',
  KeyF: 'noise',
  KeyR: 'retry',
  Enter: 'start',
};

export class Input {
  constructor() {
    this.held = {
      up: false,
      down: false,
      left: false,
      right: false,
      sneak: false,
      interact: false,
    };
    this.pressed = new Set();
    this.sprint = false;
    window.addEventListener('keydown', (event) => {
      const action = KEYMAP[event.code];
      if (!action) return;
      if (['up', 'down', 'left', 'right'].includes(action)) event.preventDefault();
      if (!event.repeat) this.pressed.add(action);
      if (action in this.held) this.held[action] = true;
    });
    window.addEventListener('keyup', (event) => {
      const action = KEYMAP[event.code];
      if (!action) return;
      if (action in this.held) this.held[action] = false;
    });
    window.addEventListener('blur', () => {
      for (const key of Object.keys(this.held)) this.held[key] = false;
    });
  }

  /** The held set the world reads each frame. */
  state() {
    return {
      up: this.held.up,
      down: this.held.down,
      left: this.held.left,
      right: this.held.right,
      sneak: this.held.sneak,
      // Shift is sneak; there is no separate sprint key — running is the
      // default walk, and sneaking is the quiet choice. Sprint is unused.
      sprint: false,
      interact: this.held.interact,
    };
  }

  /** True once for a key pressed since the last frame, then cleared. */
  wasPressed(action) {
    return this.pressed.has(action);
  }

  endFrame() {
    this.pressed.clear();
  }
}

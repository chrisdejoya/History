// --- Core Gameplay Configuration ---
export const AXIS_DEADZONE = 0.7;
export const ENABLE_MOTION_INPUTS = false; // Set to true to recognize quarter-circles, etc.

// --- Display Configuration ---
export const MAX_DISPLAY_LINES = 20; // The maximum number of input lines to show on screen.
export const SIMULTANEOUS_INPUT_SEPARATOR = '+'; // Character to display between simultaneous inputs.

// --- Timing Configuration ---
export const TARGET_FPS = 60; // The target frames per second for the game loop.
export const FRAME_INTERVAL = 1000 / TARGET_FPS;
export const CONJUNCTION_WINDOW_MS = 50; // How long to wait for subsequent inputs to group them together (in ms)
export const DASH_WINDOW_MS = 300; // Max time in ms between taps for a dash
export const MOTION_WINDOW_MS = 400; // Max time for a motion
export const MAX_DIRECTION_HISTORY = 8; // We need a longer history for motions

// --- Mappings ---

export const NEUTRAL_DIRECTION_NUM = 5; // The numpad number representing a neutral direction.

// Mapping from button index to Xbox button names
export const BUTTON_MAP = {
    0: 'A', 1: 'B', 2: 'X', 3: 'Y',
    4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT',
    8: 'Back', 9: 'Start',
    10: 'LS', 11: 'RS',
    12: 'Up', 13: 'Down', 14: 'Left', 15: 'Right'
};

// Mapping from direction vector to numpad notation and symbol
export const DIRECTION_MAP = {
    '0,-1': { num: 8, sym: '↑' },
    '1,-1': { num: 9, sym: '↗' },
    '1,0':  { num: 6, sym: '→' },
    '1,1':  { num: 3, sym: '↘' },
    '0,1':  { num: 2, sym: '↓' },
    '-1,1': { num: 1, sym: '↙' },
    '-1,0': { num: 4, sym: '←' },
    '-1,-1':{ num: 7, sym: '↖' },
    '0,0':  { num: 5, sym: '⭐' }
};

// --- SVG Icons for 2XKO Style ---
export const ICONS = {
    // Directions
    '↑': '<svg viewBox="0 0 32 32"><path d="M 16 4 L 4 16 L 10 16 L 10 28 L 22 28 L 22 16 L 28 16 Z"></path></svg>',
    '↗': '<svg viewBox="0 0 32 32" style="transform: rotate(45deg);"><path d="M 16 4 L 4 16 L 10 16 L 10 28 L 22 28 L 22 16 L 28 16 Z"></path></svg>',
    '→': '<svg viewBox="0 0 32 32" style="transform: rotate(90deg);"><path d="M 16 4 L 4 16 L 10 16 L 10 28 L 22 28 L 22 16 L 28 16 Z"></path></svg>',
    '↘': '<svg viewBox="0 0 32 32" style="transform: rotate(135deg);"><path d="M 16 4 L 4 16 L 10 16 L 10 28 L 22 28 L 22 16 L 28 16 Z"></path></svg>',
    '↓': '<svg viewBox="0 0 32 32" style="transform: rotate(180deg);"><path d="M 16 4 L 4 16 L 10 16 L 10 28 L 22 28 L 22 16 L 28 16 Z"></path></svg>',
    '↙': '<svg viewBox="0 0 32 32" style="transform: rotate(225deg);"><path d="M 16 4 L 4 16 L 10 16 L 10 28 L 22 28 L 22 16 L 28 16 Z"></path></svg>',
    '←': '<svg viewBox="0 0 32 32" style="transform: rotate(270deg);"><path d="M 16 4 L 4 16 L 10 16 L 10 28 L 22 28 L 22 16 L 28 16 Z"></path></svg>',
    '↖': '<svg viewBox="0 0 32 32" style="transform: rotate(315deg);"><path d="M 16 4 L 4 16 L 10 16 L 10 28 L 22 28 L 22 16 L 28 16 Z"></path></svg>',
    '⭐': '<svg viewBox="0 0 32 32"><path d="M16 23l-8 5 2-9-7-6h9l3-8 3 8h9l-7 6 2 9z"></path></svg>',
    // Dashes & Motions
    '→→': '<svg viewBox="0 0 32 32"><path d="M8 8l8 8-8 8V8zm8 0l8 8-8 8V8z"></path></svg>',
    '←←': '<svg viewBox="0 0 32 32"><path d="M24 8l-8 8 8 8V8zm-8 0l-8 8 8 8V8z"></path></svg>',
    '⬊': '<svg viewBox="0 0 32 32"><path d="M 5 5 C 5 18 14 27 27 27 L 27 21 C 17 21 11 15 11 5 Z"></path><path d="M 21 21 L 27 27 L 21 33 Z" style="transform: translate(0, -4px)"></path></svg>',
    '⬋': '<svg viewBox="0 0 32 32" style="transform: scaleX(-1);"><path d="M 5 5 C 5 18 14 27 27 27 L 27 21 C 17 21 11 15 11 5 Z"></path><path d="M 21 21 L 27 27 L 21 33 Z" style="transform: translate(0, -4px)"></path></svg>',
    // Buttons
    'A': '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#32CD32"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="20" font-weight="bold" fill="black">A</text></svg>',
    'B': '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#DC143C"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="20" font-weight="bold" fill="black">B</text></svg>',
    'X': '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#4169E1"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="20" font-weight="bold" fill="black">X</text></svg>',
    'Y': '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#FFD700"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="20" font-weight="bold" fill="black">Y</text></svg>',
    'LB': '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#808080"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="18" font-weight="bold" fill="black">LB</text></svg>',
    'RB': '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#808080"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="18" font-weight="bold" fill="black">RB</text></svg>',
    'LT': '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#696969"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="18" font-weight="bold" fill="black">LT</text></svg>',
    'RT': '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#696969"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="18" font-weight="bold" fill="black">RT</text></svg>',
    'LS': '<svg viewBox="0 0 32 32"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="18" font-weight="bold">LS</text></svg>',
    'RS': '<svg viewBox="0 0 32 32"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="18" font-weight="bold">RS</text></svg>',
    'N': '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="lightgray"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="20" font-weight="bold" fill="black">N</text></svg>',
};

// --- Dash & Motion Logic ---
export const DASH_MAP = {
    4: '←←', // Left Dash
    6: '→→'  // Right Dash
};

export const MOTION_MAP = {
    '236': { name: 'QCF', sym: '⬊' }, // Quarter-Circle Forward
    '214': { name: 'QCB', sym: '⬋' }, // Quarter-Circle Back
};

// The core sequences for motions. Allows for skipping the diagonal.
export const MOTION_SEQUENCES = {
    'QCF': [[2, 3, 6], [2, 6]],
    'QCB': [[2, 1, 4], [2, 4]],
};

// --- Derived Configuration ---

// Helper set to quickly check if an input is a direction-type
export const DIRECTIONAL_INPUTS = new Set(
    Object.values(DIRECTION_MAP).map(d => d.sym).concat(Object.values(DASH_MAP), Object.values(MOTION_MAP).map(m => m.sym))
);
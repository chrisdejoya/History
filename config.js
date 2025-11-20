// --- Core Gameplay Configuration ---
export const AXIS_DEADZONE = 0.7;
export const ENABLE_MOTION_INPUTS = false; // Set to true to recognize quarter-circles, etc.

// --- Display Configuration ---
export const MAX_DISPLAY_LINES = 20; // The maximum number of input lines to show on screen.
export const SIMULTANEOUS_INPUT_SEPARATOR = '+'; // Character to display between simultaneous inputs.

// --- Timing Configuration ---
export const TARGET_FPS = 60; // The target frames per second for the game loop.
export const FRAME_INTERVAL = 1000 / TARGET_FPS;
export const CONJUNCTION_WINDOW_MS = 60; // How long to wait for subsequent inputs to group them together (in ms). ~2 frames.
export const DASH_WINDOW_MS = 150; // Max time in ms between taps for a dash
export const MOTION_WINDOW_MS = 400; // Max time for a motion
export const MAX_DIRECTION_HISTORY = 8; // We need a longer history for motions
export const TRIGGER_DEADZONE = 0.5; // Analog trigger press threshold
export const RGB_SCROLL_STEP = 10; // How much to inc/decrement RGB values when scrolling



// --- Mappings ---

export const NEUTRAL_DIRECTION_NUM = 5; // The numpad number representing a neutral direction.

// --- Controller Mappings ---

// "standard" mapping is the most common, used by XInput and modern browsers for PS/Nintendo controllers.
const STANDARD_MAPPING = {
    BUTTON_MAP: {
        0: 'A', 1: 'B', 2: 'X', 3: 'Y',
        4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT',
        8: 'Back', 9: 'Start',
        10: 'LS', 11: 'RS',
        12: 'Up', 13: 'Down', 14: 'Left', 15: 'Right'
    },
    DPAD_ON_AXES: false // D-pad is on buttons 12-15
};

// Fallback for some non-standard/DirectInput controllers where D-pad is on an axis.
const DIRECTINPUT_FALLBACK_MAPPING = {
    BUTTON_MAP: {
        0: 'A', 1: 'B', 2: 'X', 3: 'Y',
        4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT',
        8: 'Back', 9: 'Start',
        10: 'LS', 11: 'RS'
        // No D-pad buttons defined here
    },
    DPAD_ON_AXES: true,
    DPAD_AXIS_INDEX: 9 // Commonly axis 9 for D-pad on these controllers
};


export const CONTROLLER_MAPPINGS = {
    'standard': STANDARD_MAPPING,
    'directinput_fallback': DIRECTINPUT_FALLBACK_MAPPING
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
    '↑': '<svg viewBox="0 0 32 32"><path d="M16 6 L6 16 L11 16 L11 26 L21 26 L21 16 L26 16 Z"></path></svg>',
    '↗': '<svg viewBox="0 0 32 32" style="transform: rotate(45deg);"><path d="M16 6 L6 16 L11 16 L11 26 L21 26 L21 16 L26 16 Z"></path></svg>',
    '→': '<svg viewBox="0 0 32 32" style="transform: rotate(90deg);"><path d="M16 6 L6 16 L11 16 L11 26 L21 26 L21 16 L26 16 Z"></path></svg>',
    '↘': '<svg viewBox="0 0 32 32" style="transform: rotate(135deg);"><path d="M16 6 L6 16 L11 16 L11 26 L21 26 L21 16 L26 16 Z"></path></svg>',
    '↓': '<svg viewBox="0 0 32 32" style="transform: rotate(180deg);"><path d="M16 6 L6 16 L11 16 L11 26 L21 26 L21 16 L26 16 Z"></path></svg>',
    '↙': '<svg viewBox="0 0 32 32" style="transform: rotate(225deg);"><path d="M16 6 L6 16 L11 16 L11 26 L21 26 L21 16 L26 16 Z"></path></svg>',
    '←': '<svg viewBox="0 0 32 32" style="transform: rotate(270deg);"><path d="M16 6 L6 16 L11 16 L11 26 L21 26 L21 16 L26 16 Z"></path></svg>',
    '↖': '<svg viewBox="0 0 32 32" style="transform: rotate(315deg);"><path d="M16 6 L6 16 L11 16 L11 26 L21 26 L21 16 L26 16 Z"></path></svg>',
    '⭐': '<svg viewBox="0 0 32 32"><path style="transform-origin: center; transform: scale(0.7);" d="M16 0 L20.5 11.5 L32 12.5 L23 20.5 L26.5 32 L16 25 L5.5 32 L9 20.5 L0 12.5 L11.5 11.5 Z"></path></svg>',
    // Dashes & Motions
    '→→': '<svg viewBox="0 0 32 32"><path d="M8 8l8 8-8 8V8zm8 0l8 8-8 8V8z"></path></svg>',
    '←←': '<svg viewBox="0 0 32 32"><path d="M24 8l-8 8 8 8V8zm-8 0l-8 8 8 8V8z"></path></svg>',
    '⬊': '<svg viewBox="0 0 32 32"><path d="M 5 5 C 5 18 14 27 27 27 L 27 21 C 17 21 11 15 11 5 Z"></path><path d="M 21 21 L 27 27 L 21 33 Z" style="transform: translate(0, -4px)"></path></svg>',
    '⬋': '<svg viewBox="0 0 32 32" style="transform: scaleX(-1);"><path d="M 5 5 C 5 18 14 27 27 27 L 27 21 C 17 21 11 15 11 5 Z"></path><path d="M 21 21 L 27 27 L 21 33 Z" style="transform: translate(0, -4px)"></path></svg>',
    // Buttons
    // Button icons are now generated dynamically. See BUTTON_DEFAULTS.
    'N': '<svg viewBox="0 0 32 32"><path style="transform-origin: center; transform: scale(0.7);" d="M16 0 L20.5 11.5 L32 12.5 L23 20.5 L26.5 32 L16 25 L5.5 32 L9 20.5 L0 12.5 L11.5 11.5 Z" fill="gray"></path></svg>'
};

// Default settings for customizable buttons. These will be used if no user settings are stored.
export const BUTTON_DEFAULTS = {
    'A':  { label: 'A',  color: '#ff4350', textColor: 'black' },
    'B':  { label: 'B',  color: '#ffc842', textColor: 'black' },
    'X':  { label: 'X',  color: '#36d5ff', textColor: 'black' },
    'Y':  { label: 'Y',  color: '#ff6eff', textColor: 'black' },
    'LB': { label: 'LB', color: '#298aff', textColor: 'black' }, // Left Bumper
    'RB': { label: 'RB', color: '#ff28ac', textColor: 'black' }, // Right Bumper
    'LT': { label: 'LT', color: '#a6dd43', textColor: 'black' }, // Left Trigger
    'RT': { label: 'RT', color: '#a6dd43', textColor: 'black' }, // Right Trigger
    'LS': { label: 'LS', color: '#808080', textColor: 'black' },
    'RS': { label: 'RS', color: '#808080', textColor: 'black' },
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

// --- UI Generation Constants ---
export const SVG_DEFAULTS = {
    VIEW_BOX: '0 0 32 32',
    CIRCLE_CX: 16,
    CIRCLE_CY: 16,
    CIRCLE_R: 14,
    FONT_FAMILY: `'Swiss 721 Bold Extended BT', 'Inter', 'Segoe UI', sans-serif`,
    FONT_SIZE_SHORT: 20,
    FONT_SIZE_LONG: 16,
    TEXT_X: '50%',
    TEXT_Y: '51%' // Slight vertical offset for better centering
};

DIRECTIONAL_INPUTS.add('N'); // Explicitly add 'N' as a directional input
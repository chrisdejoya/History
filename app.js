import {
    AXIS_DEADZONE,
    ENABLE_MOTION_INPUTS,
    MAX_DISPLAY_LINES,
    SIMULTANEOUS_INPUT_SEPARATOR,
    TARGET_FPS,
    FRAME_INTERVAL,
    CONJUNCTION_WINDOW_MS,
    NEUTRAL_DIRECTION_NUM,
    CONTROLLER_MAPPINGS,
    ICONS,
    DASH_WINDOW_MS,
    DASH_MAP,
    MOTION_MAP,
    MOTION_SEQUENCES,
    DIRECTIONAL_INPUTS,
    DIRECTION_MAP
} from './config.js';
import { initializeSettings, appSettings } from './settings.js';

const statusDiv = document.getElementById('status');
const inputContainer = document.getElementById('input-container');
const gamepads = {};
const gamepadMappings = {}; // Store the detected mapping for each gamepad
const previousState = {};
const directionHistory = {}; // Store direction history per gamepad
let inputBuffer = []; // Will store strings (single inputs) or string arrays (simultaneous inputs)
let bufferTimeout = null; 

function handleGamepadConnected(event) {
    console.log('Gamepad connected:', event.gamepad.id);
    statusDiv.style.display = 'none';
    const gamepad = event.gamepad;
    gamepads[gamepad.index] = gamepad;
    gamepadMappings[gamepad.index] = getMappingForGamepad(gamepad);
    previousState[gamepad.index] = {
        buttons: new Array(gamepad.buttons.length).fill(false),
        axes: new Array(gamepad.axes.length).fill(0)
    };
    directionHistory[gamepad.index] = []; // Initialize direction history
}

function handleGamepadDisconnected(event) {
    console.log('Gamepad disconnected:', event.gamepad.id);
    delete gamepads[event.gamepad.index];
    delete gamepadMappings[event.gamepad.index];
    delete previousState[event.gamepad.index];
    delete directionHistory[event.gamepad.index];
    if (Object.keys(gamepads).length === 0) {
        statusDiv.style.display = 'block';
    }
}

function getMappingForGamepad(gamepad) {
    // The "standard" mapping is the default and covers XInput and modern DInput devices.
    if (gamepad.mapping === 'standard') {
        console.log(`Gamepad ${gamepad.index} using "standard" mapping.`);
        return CONTROLLER_MAPPINGS.standard;
    }

    // Fallback for non-standard controllers, especially older DirectInput ones
    // where the D-pad might be on an axis. This is a heuristic.
    if (gamepad.axes.length > 8) { // A common sign of a D-pad axis
        console.log(`Gamepad ${gamepad.index} using "DirectInput Fallback" mapping.`);
        return CONTROLLER_MAPPINGS.directinput_fallback;
    }

    console.log(`Gamepad ${gamepad.index} using "standard" mapping as default.`);
    return CONTROLLER_MAPPINGS.standard; // Default to standard
}

let frameCounter = 0; // Initialize frame counter
// --- Input Display ---
function flushInputBuffer() {
    if (inputBuffer.length === 0) return;

    const inputElement = document.createElement('div');
    inputElement.className = 'input-item'; // This is the flex container with gap: 8px

    // Store the frame count when this input line was created
    inputElement.dataset.startFrame = frameCounter;
    const frameCountElement = document.createElement('span');
    frameCountElement.className = 'frame-count';
    frameCountElement.textContent = `0`; // Start at 0
    inputElement.prepend(frameCountElement);
    inputElement.frameCountElementRef = frameCountElement; // Store reference for dynamic updates

    inputBuffer.forEach((item, index) => {
        // Create a sub-container for each 'item' (either single or simultaneous group)
        const itemGroupContainer = document.createElement('span'); // Use span to allow inline display
        itemGroupContainer.style.display = 'flex'; // Make it a flex container itself
        itemGroupContainer.style.alignItems = 'center'; // Align glyphs and separators vertically
        // No gap here, we'll manage spacing manually for simultaneous

        // Handle single input (string)
        if (typeof item === 'string') {
            const glyphWrapper = document.createElement('div');
            glyphWrapper.className = 'input-glyph';
            glyphWrapper.innerHTML = ICONS[item] || '';
            itemGroupContainer.appendChild(glyphWrapper);
        }
        // Handle simultaneous inputs (array of strings)
        else if (Array.isArray(item)) {
            item.forEach((subItem, subIndex) => {
                const glyphWrapper = document.createElement('div');
                glyphWrapper.className = 'input-glyph';
                glyphWrapper.innerHTML = ICONS[subItem] || '';
                itemGroupContainer.appendChild(glyphWrapper);

                // Add a tight separator between simultaneous inputs
                if (subIndex < item.length - 1) {
                    const separator = document.createElement('span');
                    separator.className = 'input-separator';
                    separator.textContent = SIMULTANEOUS_INPUT_SEPARATOR;
                    itemGroupContainer.appendChild(separator);
                }
            });
        }

        inputElement.appendChild(itemGroupContainer); // Append the sub-container to the main inputElement

        // Add a wide separator between different itemGroupContainers (sequential groups)
        if (index < inputBuffer.length - 1) {
            const separator = document.createElement('span');
            separator.className = 'input-separator'; // Existing class for styling
            separator.textContent = SIMULTANEOUS_INPUT_SEPARATOR;
            inputElement.appendChild(separator);
        }
    });

    inputContainer.prepend(inputElement);
    while (inputContainer.children.length > MAX_DISPLAY_LINES) {
        inputContainer.removeChild(inputContainer.lastChild);
    }
    inputBuffer = []; // Clear the buffers
}


function addInputToDisplay(inputs) {
    const hasNewDirection = inputs.some(input => DIRECTIONAL_INPUTS.has(input));
    const bufferHasDirection = inputBuffer.some(item =>
        (typeof item === 'string' && DIRECTIONAL_INPUTS.has(item)) ||
        (Array.isArray(item) && item.some(subItem => DIRECTIONAL_INPUTS.has(subItem)))
    );
    const bufferHasNeutral = inputBuffer.some(item =>
        (typeof item === 'string' && item === 'N') ||
        (Array.isArray(item) && item.includes('N'))
    );

    clearTimeout(bufferTimeout); // Clear any pending timeout
    
    // If the new input is a dash, always flush the buffer first.
    // This is to clear out the initial direction that started the dash.
    const isDash = inputs.some(input => Object.values(DASH_MAP).includes(input));
    if (isDash) {
        flushInputBuffer();
    }

    // If the new input has a direction and the buffer already has a direction OR a neutral input,
    // flush the old buffer first. This prevents N+→ or →+→ on the same line.
    if (!isDash && hasNewDirection && (bufferHasDirection || bufferHasNeutral)) {
        flushInputBuffer();
    }

    // Check if a directional input or neutral input is already in the buffer
   const hasExistingDirectional = inputBuffer.some(item =>
        (typeof item === 'string' && DIRECTIONAL_INPUTS.has(item)) ||
        (Array.isArray(item) && item.some(subItem => DIRECTIONAL_INPUTS.has(subItem)))
    );

    // Add new inputs to the buffer
    if (inputs.length > 0) {
        const uniqueInputs = [...new Set(inputs)]; // Ensure uniqueness within the current frame's inputs
        if (uniqueInputs.length === 1 && !(hasExistingDirectional && DIRECTIONAL_INPUTS.has(uniqueInputs[0]))) {
            inputBuffer.push(uniqueInputs[0]); // Add as a single string
        } else {
            inputBuffer.push(uniqueInputs); // Add as an array for simultaneous inputs
        }
    }

    // Set a new timeout to process the buffer
    bufferTimeout = setTimeout(() => {
        flushInputBuffer();
    }, CONJUNCTION_WINDOW_MS);
}
// --- Input Processing ---

/**
 * Sorts an array of inputs to prioritize directional inputs and neutrals.
 * @param {string[]} inputs The array of input strings.
 * @returns {string[]} The sorted array.
 */
function sortInputs(inputs) {
    const directional = inputs.filter(input => DIRECTIONAL_INPUTS.has(input));
    const nonDirectional = inputs.filter(input => !DIRECTIONAL_INPUTS.has(input));
    return [...directional, ...nonDirectional];
}



/**
 * Calculates the direction vector from D-pad inputs.
 * @param {boolean[]} buttons - The array of button states.
 * @returns {{dx: number, dy: number}} The direction vector.
 */
function getDpadVector(gamepadIndex, state) {
    const mapping = gamepadMappings[gamepadIndex];
    if (!mapping) return { dx: 0, dy: 0 };

    if (mapping.DPAD_ON_AXES) {
        const dpadAxis = state.axes[mapping.DPAD_AXIS_INDEX];
        // This axis behaves like a hat switch. Values are discrete.
        // -1.0 is up, and it goes clockwise. 0.14 is up-right, etc.
        // This is a simplified check for cardinal directions.
        if (dpadAxis === -1.0 || dpadAxis === -0.7142857314355373 || dpadAxis === 1.0) return { dx: 0, dy: -1 }; // Up
        if (dpadAxis === -0.4285714030265808) return { dx: 1, dy: 0 }; // Right
        if (dpadAxis === 0.14285719394683838) return { dx: 0, dy: 1 }; // Down
        if (dpadAxis === 0.7142857314355373) return { dx: -1, dy: 0 }; // Left
        return { dx: 0, dy: 0 };
    } else {
        // Standard button-based D-pad
        const buttons = state.buttons;
        const dx = (buttons[15] ? 1 : 0) - (buttons[14] ? 1 : 0); // Right - Left
        const dy = (buttons[13] ? 1 : 0) - (buttons[12] ? 1 : 0); // Down - Up
        return { dx, dy };
    }
}

/**
 * Calculates the direction vector from analog stick inputs.
 * @param {number[]} axes - The array of axis states.
 * @returns {{dx: number, dy: number}} The direction vector.
 */
function getStickVector(axes) {
    const dx = Math.abs(axes[0]) > AXIS_DEADZONE ? Math.sign(axes[0]) : 0;
    const dy = Math.abs(axes[1]) > AXIS_DEADZONE ? Math.sign(axes[1]) : 0;
    return { dx, dy };
}

function getDirection(gamepadIndex, state) {
    const { dx: dpad_dx, dy: dpad_dy } = getDpadVector(gamepadIndex, state);
    // D-pad takes priority. If it's not neutral, use its direction.
    if (dpad_dx !== 0 || dpad_dy !== 0) return DIRECTION_MAP[`${dpad_dx},${dpad_dy}`];
    // Otherwise, use the analog stick's direction.
    const { dx: stick_dx, dy: stick_dy } = getStickVector(state.axes);
    return DIRECTION_MAP[`${stick_dx},${stick_dy}`];
}

function checkForDash(gamepadIndex, currentDirection) {
    const history = directionHistory[gamepadIndex];
    const now = performance.now();

    // Add current direction and time to history
    history.push({ dir: currentDirection, time: now });

    // Keep history short
    if (history.length > 3) {
        history.shift();
    }

    // Check for dash pattern: DIR -> NEUTRAL -> DIR
    if (history.length === 3) {
        const [first, middle, last] = history;
        const isDashPattern = last.dir.num === first.dir.num && // Same direction
                              middle.dir.num === NEUTRAL_DIRECTION_NUM &&             // Neutral in the middle
                              DASH_MAP[last.dir.num];             // It's a dashable direction (left/right)
        const isWithinTime = (last.time - first.time) <= DASH_WINDOW_MS;

        if (isDashPattern && isWithinTime) {
            directionHistory[gamepadIndex] = []; // Clear history to prevent pre-input
            return DASH_MAP[last.dir.num]; // Return dash symbol e.g., "→→"
        }
    }
    return null; // No dash detected
}

/**
 * Compares two arrays for equality.
 * @param {Array} arr1 The first array.
 * @param {Array} arr2 The second array.
 * @returns {boolean} True if the arrays are equal, false otherwise.
 */
function areArraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
    }
    return true;
}

function checkForMotion(gamepadIndex) {
    const history = directionHistory[gamepadIndex];
    if (history.length < 2) return null;

    const now = performance.now();

    // Create a clean sequence of unique directions from recent history
    const uniqueSequence = [];
    // The motion window is implicitly handled by the direction history length now.
    if (history.length < 2) return null;

    // Create a sequence of unique numpad directions, e.g., [2, 2, 3, 6, 6] -> [2, 3, 6]
    let lastNum = -1;
    for(const item of history) {
        if (item.dir.num !== lastNum && item.dir.num !== 5) { // Ignore neutral and duplicates
            uniqueSequence.push(item.dir.num);
            lastNum = item.dir.num;
        }
    }

    if (uniqueSequence.length < 2) return null;

    // Check this unique sequence against our defined motions
    for (const motionName in MOTION_SEQUENCES) {
        const patterns = MOTION_SEQUENCES[motionName];
        for (const pattern of patterns) {
            // Check if the end of our input sequence matches the pattern
            if (uniqueSequence.length >= pattern.length) {
                const sequenceSlice = uniqueSequence.slice(-pattern.length);
                if (areArraysEqual(sequenceSlice, pattern)) {
                     // Motion found!
                    return {
                        name: motionName,
                        sym: MOTION_MAP[pattern.join('')]?.sym || motionName,
                        pattern: pattern
                    };
                }
            }
        }
    }

    return null; // No motion detected
}

// --- Main Game Loop ---
function update() {
    if (Object.keys(gamepads).length === 0) return;

    // Always poll for new gamepads
    const allGamepads = navigator.getGamepads();

    for (const gamepad of allGamepads) {
        if (!gamepad || !gamepads[gamepad.index]) continue;

        const mapping = gamepadMappings[gamepad.index];
        const currentState = {
            buttons: gamepad.buttons.map(b => b.pressed),
            axes: gamepad.axes.slice()
        };
        const prevState = previousState[gamepad.index];
        
        if (!prevState) continue;

        let frameInputs = [];
        let hasNewButtonPress = false;
        let primaryInputSymbol = null;

        // 1. Check for direction change
        const currentDirection = getDirection(gamepad.index, currentState);
        const prevDirection = getDirection(gamepad.index, prevState);

        const directionChanged = currentDirection && prevDirection && currentDirection.num !== prevDirection.num;
        let detectedMotion = null; // Will store the detected motion object if any
        let detectedDash = null;

        // Update direction history and check for motions/dashes on each direction change
        if (directionChanged) {
            // Prioritize checking for complex motions first
            if (ENABLE_MOTION_INPUTS) {
                detectedMotion = checkForMotion(gamepad.index);
            }
            // Only check for a dash if a motion wasn't just completed
            if (!detectedMotion) {
                detectedDash = checkForDash(gamepad.index, currentDirection);
            }
        }

        // 2. Check for new button presses and releases
        for (let i = 0; i < currentState.buttons.length; i++) {
            if (currentState.buttons[i] && !prevState.buttons[i]) {
                hasNewButtonPress = true;
            }
        }

        // Check for button releases, but only if no new buttons were pressed in the same frame.
        // This prevents showing 'N' when rolling from one button to another.
        let hasNewButtonRelease = false;
        if (!hasNewButtonPress) {
            for (let i = 0; i < currentState.buttons.length; i++) {
                // We only care about non-directional buttons for this logic
                const buttonName = mapping.BUTTON_MAP[i];
                if (buttonName && !['Up', 'Down', 'Left', 'Right'].includes(buttonName)) {
                    if (!currentState.buttons[i] && prevState.buttons[i]) {
                        hasNewButtonRelease = true;
                        break;
                    }
                }
            }
        }

        const hasNewInput = hasNewButtonPress || directionChanged || detectedDash || detectedMotion || hasNewButtonRelease;

        // 3. Construct the full input string
        if (hasNewInput) {
            const newlyPressedButtons = [];
            // Get all newly pressed buttons that have an icon mapping
            for (let i = 0; i < currentState.buttons.length; i++) {
                if (currentState.buttons[i] && !prevState.buttons[i]) { // Check for a NEW press
                    const buttonName = mapping.BUTTON_MAP[i];
                    if (buttonName && !['Up', 'Down', 'Left', 'Right'].includes(buttonName)) {
                        newlyPressedButtons.push(buttonName);
                    }
                }
            }

            if (ENABLE_MOTION_INPUTS && detectedMotion) {
                // The actual display depends on whether a button was pressed with it.
                primaryInputSymbol = detectedMotion.sym;
                directionHistory[gamepad.index] = []; // Clear history to prevent re-triggering
            } else if (detectedDash) {
                primaryInputSymbol = detectedDash;
                directionHistory[gamepad.index] = [];
            } else if (directionChanged) {
                if (currentDirection.num !== NEUTRAL_DIRECTION_NUM) {
                    // If direction changed and it's not neutral, and no motion/dash was detected
                    primaryInputSymbol = currentDirection.sym;
                } else if (appSettings.showNeutrals && !hasNewButtonPress) {
                    // Direction changed to neutral, and no buttons were pressed in the same frame
                    primaryInputSymbol = 'N';
                }
            } else if (hasNewButtonRelease && !directionChanged && !hasNewButtonPress) {
                if (appSettings.showNeutrals) {
                    primaryInputSymbol = 'N';
                }
            }

            // If a button was pressed while a direction was held (but not changed),
            // add the held direction to the output.
            if (hasNewButtonPress && !primaryInputSymbol && currentDirection.num !== NEUTRAL_DIRECTION_NUM) {
                primaryInputSymbol = currentDirection.sym;
            }

            // Always add the directional input first, if it exists
            if (primaryInputSymbol) {
                frameInputs.push(primaryInputSymbol);
            }
            
            frameInputs.push(...newlyPressedButtons);
        }

        // If buttons were pressed without a new direction, dash, or motion, prepend Neutral.
        if (appSettings.showNeutrals && hasNewButtonPress && !primaryInputSymbol) {
             frameInputs.unshift('N');
        }


        // 4. Display inputs
        if (frameInputs.length > 0) {
            // Sort the inputs to prioritize directions and neutrals
            frameInputs = sortInputs(frameInputs);

            addInputToDisplay(frameInputs);
        }

        // 5. Save current state for the next frame
        previousState[gamepad.index] = currentState;
    }
}

let lastFrameTime = 0;

function gameLoop() {
  const now = performance.now();
  const elapsed = now - lastFrameTime;

  if (elapsed > FRAME_INTERVAL) {
    update();
    lastFrameTime = now - (elapsed % FRAME_INTERVAL);
  }

  requestAnimationFrame(gameLoop);
    frameCounter++; // Increment the frame counter each frame

  // Update the frame count for the most recent input line
  if (inputContainer.firstChild && inputContainer.firstChild.dataset.startFrame && inputContainer.firstChild.frameCountElementRef) {
      const mostRecentInput = inputContainer.firstChild;
      const startFrame = parseInt(mostRecentInput.dataset.startFrame, 10);
      const currentCount = frameCounter - startFrame;
      mostRecentInput.frameCountElementRef.textContent = currentCount;
  }

}



// Initial check for already connected gamepads
window.addEventListener("load", () => {
    initializeSettings(flushInputBuffer);

    for (const gamepad of navigator.getGamepads()) {
        if (gamepad) {
            handleGamepadConnected({ gamepad: gamepad });
        }
    }
    gameLoop();
});


window.addEventListener("gamepadconnected", handleGamepadConnected);
window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);
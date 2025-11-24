import {
    AXIS_DEADZONE,
    ENABLE_MOTION_INPUTS,
    SIMULTANEOUS_INPUT_SEPARATOR,
    TARGET_FPS,
    CONJUNCTION_WINDOW_MS,
    NEUTRAL_DIRECTION_NUM,
    CONTROLLER_MAPPINGS,
    ICONS,
    DASH_WINDOW_MS,
    DASH_MAP,
    MOTION_MAP,
    MOTION_SEQUENCES,
    DIRECTIONAL_INPUTS,
    DIRECTION_MAP,
    TRIGGER_DEADZONE
} from './config.js';
import { initializeSettings, appSettings } from './settings.js';

const statusDiv = document.getElementById('status');
const inputContainer = document.getElementById('input-container');
let lastFlushTime = 0; // Timestamp of the last time the buffer was flushed
let inputBuffer = []; // Will store strings (single inputs) or string arrays (simultaneous inputs)
let lastFlushedBuffer = []; // Stores the content of the last flushed buffer for conjunction
let bufferTimeout = null; 

function handleGamepadConnected(event) {
    console.log('Gamepad connected:', event.gamepad.id);
    statusDiv.style.display = 'none';
    const gamepad = event.gamepad;
    gamepads[gamepad.index] = new GamepadHandler(gamepad);
}

function handleGamepadDisconnected(event) {
    console.log('Gamepad disconnected:', event.gamepad.id);
    delete gamepads[event.gamepad.index];
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

// This object will now store GamepadHandler instances instead of raw gamepad objects.
const gamepads = {};

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
    while (inputContainer.children.length > appSettings.maxDisplayLines) {
        inputContainer.removeChild(inputContainer.lastChild);
    }
    lastFlushedBuffer = [...inputBuffer]; // Save a copy of what was just flushed
    inputBuffer = []; // Clear the buffers
    lastFlushTime = performance.now(); // Record the time of this flush
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

    // --- Smart Conjunction Logic ---
    // If the buffer is currently empty, but the last flush was very recent,
    // it means an input was just displayed. We can "retract" it to conjoin the new input.
    const timeSinceLastFlush = performance.now() - lastFlushTime;
    if (inputBuffer.length === 0 && timeSinceLastFlush < CONJUNCTION_WINDOW_MS) {
        const lastDisplayedItem = inputContainer.firstChild;
        if (lastDisplayedItem) {
            inputContainer.removeChild(lastDisplayedItem);
            inputBuffer = [...lastFlushedBuffer]; // Restore the buffer to conjoin with the new input
        }
    }

    // If the new input is a dash, always flush the buffer first.
    // This is to clear out the initial direction that started the dash.
    const isDash = inputs.some(input => Object.values(DASH_MAP).includes(input));
    if (isDash) {
        flushInputBuffer();
    }

    clearTimeout(bufferTimeout); // Clear any pending timeout

    // If the new input has a direction and the buffer is not empty, flush the old buffer first.
    // This ensures that any directional input always starts a new line.
    if (!isDash && hasNewDirection && inputBuffer.length > 0) {
        flushInputBuffer();
    } else if (!isDash && hasNewDirection && (bufferHasDirection || bufferHasNeutral)) {
        // This handles the case where a retracted buffer might contain a direction.
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
function getDpadVector(mapping, state) {
    if (!mapping) return { dx: 0, dy: 0 };

    if (mapping.DPAD_ON_AXES) {
        const dpadAxis = state.axes[mapping.DPAD_AXIS_INDEX] ?? 0;
        // This axis behaves like a hat switch. Values are discrete.
        // Values are often around -1.0 (Up), -0.714 (Up-Right), -0.428 (Right), etc.
        // Using ranges is more robust than checking for exact, magic floating point values.
        const isInRange = (val, target) => Math.abs(val - target) < 0.1;

        if (isInRange(dpadAxis, -1.0)) return { dx: 0, dy: -1 }; // Up
        if (isInRange(dpadAxis, -0.714)) return { dx: 1, dy: -1 }; // Up-Right
        if (isInRange(dpadAxis, -0.428)) return { dx: 1, dy: 0 }; // Right
        if (isInRange(dpadAxis, -0.142)) return { dx: 1, dy: 1 }; // Down-Right
        if (isInRange(dpadAxis, 0.142)) return { dx: 0, dy: 1 }; // Down
        if (isInRange(dpadAxis, 0.428)) return { dx: -1, dy: 1 }; // Down-Left
        if (isInRange(dpadAxis, 0.714)) return { dx: -1, dy: 0 }; // Left
        if (isInRange(dpadAxis, 1.0)) return { dx: -1, dy: -1 }; // Up-Left

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

// --- Main Game Loop ---
function update() {
    if (Object.keys(gamepads).length === 0) return;

    // Always poll for new gamepads
    const allGamepads = navigator.getGamepads();

    for (const gamepad of allGamepads) {
        if (!gamepad) continue;

        // If a gamepad is connected that we don't have a handler for, create one.
        if (gamepad && !gamepads[gamepad.index]) {
            handleGamepadConnected({ gamepad });
        }

        const handler = gamepads[gamepad.index];
        if (handler) {
            const frameInputs = handler.processInputs(gamepad);
            if (frameInputs.length > 0) {
                addInputToDisplay(sortInputs(frameInputs));
            }
        }
    }
}

class GamepadHandler {
    constructor(gamepad) {
        this.gamepad = gamepad;
        this.mapping = getMappingForGamepad(gamepad);
        this.previousState = {
            buttons: new Array(gamepad.buttons.length).fill(false),
            axes: new Array(gamepad.axes.length).fill(0)
        };
        this.directionHistory = [];
    }

    _getCurrentState(gamepad) {
        return {
            buttons: gamepad.buttons.map((b, i) => {
                const buttonName = this.mapping.BUTTON_MAP[i];
                if (buttonName === 'LT' || buttonName === 'RT') {
                    return b.value > TRIGGER_DEADZONE;
                }
                return b.pressed;
            }),
            axes: gamepad.axes.slice()
        };
    }

    _getDirection(state) {
        const { dx: dpad_dx, dy: dpad_dy } = getDpadVector(this.mapping, state);
        if (dpad_dx !== 0 || dpad_dy !== 0) return DIRECTION_MAP[`${dpad_dx},${dpad_dy}`];
        const { dx: stick_dx, dy: stick_dy } = getStickVector(state.axes);
        return DIRECTION_MAP[`${stick_dx},${stick_dy}`];
    }

    _checkForDash(currentDirection) {
        const now = performance.now();
        this.directionHistory.push({ dir: currentDirection, time: now });
        if (this.directionHistory.length > 3) this.directionHistory.shift();

        if (this.directionHistory.length === 3) {
            const [first, middle, last] = this.directionHistory;
            const isDashPattern = last.dir.num === first.dir.num &&
                                  middle.dir.num === NEUTRAL_DIRECTION_NUM &&
                                  DASH_MAP[last.dir.num];
            const isWithinTime = (last.time - first.time) <= DASH_WINDOW_MS;

            if (isDashPattern && isWithinTime) {
                this.directionHistory = [];
                return DASH_MAP[last.dir.num];
            }
        }
        return null;
    }

    _areArraysEqual(arr1, arr2) {
        if (arr1.length !== arr2.length) return false;
        for (let i = 0; i < arr1.length; i++) {
            if (arr1[i] !== arr2[i]) return false;
        }
        return true;
    }

    _checkForMotion() {
        if (this.directionHistory.length < 2) return null;

        let uniqueSequence = [];
        let lastNum = -1;
        for (const item of this.directionHistory) {
            if (item.dir.num !== lastNum && item.dir.num !== 5) {
                uniqueSequence.push(item.dir.num);
                lastNum = item.dir.num;
            }
        }

        if (uniqueSequence.length < 2) return null;

        for (const motionName in MOTION_SEQUENCES) {
            const patterns = MOTION_SEQUENCES[motionName];
            for (const pattern of patterns) {
                if (uniqueSequence.length >= pattern.length) {
                    const sequenceSlice = uniqueSequence.slice(-pattern.length);
                    if (this._areArraysEqual(sequenceSlice, pattern)) {
                        return {
                            name: motionName,
                            sym: MOTION_MAP[pattern.join('')]?.sym || motionName,
                            pattern: pattern
                        };
                    }
                }
            }
        }
        return null;
    }

    processInputs(gamepad) {
        const currentState = this._getCurrentState(gamepad);
        const prevState = this.previousState;

        let frameInputs = [];
        let hasNewButtonPress = false;
        let primaryInputSymbol = null;

        // 1. Check for direction change
        const currentDirection = this._getDirection(currentState);
        const prevDirection = this._getDirection(prevState);

        const directionChanged = currentDirection && prevDirection && currentDirection.num !== prevDirection.num;
        let detectedMotion = null; // Will store the detected motion object if any
        let detectedDash = null;

        // Update direction history and check for motions/dashes on each direction change
        if (directionChanged) {
            // Prioritize checking for complex motions first
            if (ENABLE_MOTION_INPUTS) {
                detectedMotion = this._checkForMotion();
            }
            // Only check for a dash if a motion wasn't just completed
            if (!detectedMotion) {
                detectedDash = this._checkForDash(currentDirection);
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
                // This is safer than a hardcoded list of D-pad names
                const buttonName = this.mapping.BUTTON_MAP[i];
                if (buttonName && !DIRECTIONAL_INPUTS.has(buttonName)) {
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
                    const buttonName = this.mapping.BUTTON_MAP[i];
                    if (buttonName && ICONS[buttonName] && !DIRECTIONAL_INPUTS.has(buttonName)) {
                        newlyPressedButtons.push(buttonName);
                    }
                }
            }

            if (ENABLE_MOTION_INPUTS && detectedMotion) {
                // The actual display depends on whether a button was pressed with it.
                primaryInputSymbol = detectedMotion.sym;
                this.directionHistory = []; // Clear history to prevent re-triggering
            } else if (detectedDash) {
                primaryInputSymbol = detectedDash;
                this.directionHistory = [];
            } else if (directionChanged) {
                if (currentDirection.num !== NEUTRAL_DIRECTION_NUM) {
                    // If direction changed and it's not neutral, and no motion/dash was detected
                    primaryInputSymbol = currentDirection.sym;
                } else if (appSettings.showNeutrals && !hasNewButtonPress) {
                    // Direction changed to neutral, and no buttons were pressed in the same frame
                    primaryInputSymbol = 'N';
                }
            } else if (hasNewButtonRelease && !directionChanged && !hasNewButtonPress && currentDirection.num === NEUTRAL_DIRECTION_NUM) {
                // A button was released, no new buttons were pressed, the direction didn't change,
                // AND the current direction is neutral. This is a true return to neutral.
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

        // Save current state for the next frame
        this.previousState = currentState;

        return frameInputs;
    }
}

let lastFrameTime = 0;

function gameLoop() {
    const now = performance.now();
    const elapsed = now - lastFrameTime;

    const currentFrameInterval = appSettings.targetFps > 0 ? 1000 / appSettings.targetFps : 0;

    if (currentFrameInterval === 0 || elapsed > currentFrameInterval) {
        update();
        lastFrameTime = (currentFrameInterval > 0) ? now - (elapsed % currentFrameInterval) : now;
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
    document.documentElement.style.setProperty('--glyph-size', `${appSettings.glyphSize}px`);

    for (const gamepad of navigator.getGamepads()) {
        if (gamepad) {
            handleGamepadConnected({ gamepad: gamepad });
        }
    }
    gameLoop();
});


window.addEventListener("gamepadconnected", handleGamepadConnected);
window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);
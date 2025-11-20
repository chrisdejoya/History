import {
    AXIS_DEADZONE,
    MAX_INPUT_HISTORY,
    ENABLE_MOTION_INPUTS,
    CONJUNCTION_WINDOW_MS,
    BUTTON_MAP,
    DIRECTION_MAP,
    ICONS,
    DASH_WINDOW_MS,
    DASH_MAP,
    MOTION_WINDOW_MS,
    MOTION_MAP,
    MOTION_SEQUENCES,
    DIRECTIONAL_INPUTS
} from './config.js';

const statusDiv = document.getElementById('status');
const inputContainer = document.getElementById('input-container');
const gamepads = {};
const previousState = {};
const directionHistory = {}; // Store direction history per gamepad
let inputBuffer = [];
let bufferTimeout = null; 

function handleGamepadConnected(event) {
    console.log('Gamepad connected:', event.gamepad.id);
    statusDiv.style.display = 'none';
    const gamepad = event.gamepad;
    gamepads[gamepad.index] = gamepad;
    previousState[gamepad.index] = {
        buttons: new Array(gamepad.buttons.length).fill(false),
        axes: new Array(gamepad.axes.length).fill(0)
    };
    directionHistory[gamepad.index] = []; // Initialize direction history
}

function handleGamepadDisconnected(event) {
    console.log('Gamepad disconnected:', event.gamepad.id);
    delete gamepads[event.gamepad.index];
    delete previousState[event.gamepad.index];
    delete directionHistory[event.gamepad.index];
    if (Object.keys(gamepads).length === 0) {
        statusDiv.style.display = 'block';
    }
}

// --- Input Display ---
function flushInputBuffer() {
    if (inputBuffer.length === 0) return;

    const inputElement = document.createElement('div');
    inputElement.className = 'input-item';

    inputBuffer.forEach((input, index) => {
        const glyphWrapper = document.createElement('div');
        glyphWrapper.className = 'input-glyph';
        glyphWrapper.innerHTML = ICONS[input] || '';
        inputElement.appendChild(glyphWrapper);

        if (index < inputBuffer.length - 1) {
            const separator = document.createElement('span');
            separator.className = 'input-separator';
            separator.textContent = '+';
            inputElement.appendChild(separator);
        }
    });

    inputContainer.prepend(inputElement);
    if (inputContainer.children.length > MAX_INPUT_HISTORY) {
        inputContainer.removeChild(inputContainer.lastChild);
    }
    inputBuffer = []; // Clear the buffer
}

function addInputToDisplay(inputs) { // Expects an array of input names/symbols
    const hasNewDirection = inputs.some(input => DIRECTIONAL_INPUTS.has(input));
    const bufferHasDirection = inputBuffer.some(input => DIRECTIONAL_INPUTS.has(input));

    // If the new input has a direction and the buffer already has one, flush the old buffer first.
    if (hasNewDirection && bufferHasDirection) {
        clearTimeout(bufferTimeout);
        flushInputBuffer();
    }

    clearTimeout(bufferTimeout); // Clear any pending timeout
    inputBuffer = [...new Set([...inputBuffer, ...inputs])]; // Merge new inputs

    // Set a new timeout to process the buffer
    bufferTimeout = setTimeout(() => {
        flushInputBuffer();
    }, CONJUNCTION_WINDOW_MS);
}

// --- Input Processing ---
/**
 * Calculates the direction vector from D-pad inputs.
 * @param {boolean[]} buttons - The array of button states.
 * @returns {{dx: number, dy: number}} The direction vector.
 */
function getDpadVector(buttons) {
    const dx = (buttons[15] ? 1 : 0) - (buttons[14] ? 1 : 0); // Right - Left
    const dy = (buttons[13] ? 1 : 0) - (buttons[12] ? 1 : 0); // Down - Up
    return { dx, dy };
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

function getDirection(state) {
    const { dx: dpad_dx, dy: dpad_dy } = getDpadVector(state.buttons);
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
                              middle.dir.num === 5 &&             // Neutral in the middle
                              DASH_MAP[last.dir.num];             // It's a dashable direction (left/right)
        const isWithinTime = (last.time - first.time) <= DASH_WINDOW_MS;

        if (isDashPattern && isWithinTime) {
            return DASH_MAP[last.dir.num]; // Return dash symbol e.g., "→→"
        }
    }
    return null; // No dash detected
}

function checkForMotion(gamepadIndex) {
    const history = directionHistory[gamepadIndex];
    if (history.length < 2) return null;

    const now = performance.now();

    // Create a clean sequence of unique directions from recent history
    const uniqueSequence = [];
    const timeFilteredHistory = history.filter(item => (now - item.time) <= MOTION_WINDOW_MS);

    if (timeFilteredHistory.length < 2) return null;

    // Create a sequence of unique numpad directions, e.g., [2, 2, 3, 6, 6] -> [2, 3, 6]
    let lastNum = -1;
    for(const item of timeFilteredHistory) {
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
                if (JSON.stringify(sequenceSlice) === JSON.stringify(pattern)) {
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

        const currentState = {
            buttons: gamepad.buttons.map(b => b.pressed),
            axes: gamepad.axes.slice()
        };
        const prevState = previousState[gamepad.index];

        if (!prevState) continue;

        let frameInputs = [];
        let hasNewButtonPress = false;

        // 1. Check for direction change
        const currentDirection = getDirection(currentState);
        const prevDirection = getDirection(prevState);

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

        // 2. Check for new button presses
        for (let i = 0; i < currentState.buttons.length; i++) {
            if (currentState.buttons[i] && !prevState.buttons[i]) {
                hasNewButtonPress = true;
                break;
            }
        }

        // A dash counts as a new input event
        const hasNewInput = hasNewButtonPress || (directionChanged && currentDirection.num !== 5) || detectedDash || detectedMotion;

        // 3. Construct the full input string
        if (hasNewInput) {
            const newlyPressedButtons = [];
            // Get all newly pressed buttons that have an icon mapping
            for (let i = 0; i < currentState.buttons.length; i++) {
                if (currentState.buttons[i] && !prevState.buttons[i]) { // Check for a NEW press
                    const buttonName = BUTTON_MAP[i];
                    if (buttonName && !['Up', 'Down', 'Left', 'Right'].includes(buttonName)) {
                        newlyPressedButtons.push(buttonName);
                    }
                }
            }

            let primaryInputSymbol = null;

            if (ENABLE_MOTION_INPUTS && detectedMotion) {
                // The actual display depends on whether a button was pressed with it.
                primaryInputSymbol = detectedMotion.sym;
                directionHistory[gamepad.index] = []; // Clear history to prevent re-triggering
            } else if (detectedDash) {
                primaryInputSymbol = detectedDash;
                directionHistory[gamepad.index] = [];
            } else if (directionChanged && currentDirection.num !== 5) {
                // If direction changed and it's not neutral, and no motion/dash was detected
                primaryInputSymbol = currentDirection.sym;
            }

            // If a button was pressed while a direction was held (but not changed),
            // add the held direction to the output.
            if (hasNewButtonPress && !primaryInputSymbol && currentDirection.num !== 5) {
                primaryInputSymbol = currentDirection.sym;
            }

            if (primaryInputSymbol) {
                // Only add motion symbol if a button was pressed (to complete the special move)
                if (!(ENABLE_MOTION_INPUTS && detectedMotion && !hasNewButtonPress)) {
                    frameInputs.push(primaryInputSymbol);
                }
            }

            frameInputs.push(...newlyPressedButtons);
        }

        // 4. Display inputs
        if (frameInputs.length > 0) {
            addInputToDisplay(frameInputs);
        }

        // 5. Save current state for the next frame
        previousState[gamepad.index] = currentState;
    }
}


function gameLoop() {
    update();
    requestAnimationFrame(gameLoop);
}

// Initial check for already connected gamepads
window.addEventListener("load", () => {
    for (const gamepad of navigator.getGamepads()) {
        if (gamepad) {
            handleGamepadConnected({ gamepad: gamepad });
        }
    }
    gameLoop();
});

window.addEventListener("gamepadconnected", handleGamepadConnected);
window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);
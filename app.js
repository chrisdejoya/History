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
    DIRECTION_MAP,
    ICONS,
    DASH_WINDOW_MS,
    DASH_MAP,
    BUTTON_DEFAULTS,
    MOTION_MAP,
    MOTION_SEQUENCES,
    DIRECTIONAL_INPUTS
} from './config.js';

const statusDiv = document.getElementById('status');
const settingsPanel = document.getElementById('settings-panel');
const settingsForm = document.getElementById('settings-form');
const resetButton = document.getElementById('reset-settings-btn');

const inputContainer = document.getElementById('input-container');
const gamepads = {};
const gamepadMappings = {}; // Store the detected mapping for each gamepad
const previousState = {};
const directionHistory = {}; // Store direction history per gamepad
let inputBuffer = []; // Will store strings (single inputs) or string arrays (simultaneous inputs)
let bufferTimeout = null; 
let buttonSettings = {};
let appSettings = {};
const DEFAULT_APP_SETTINGS = {
    showNeutrals: true
};

// --- Settings Panel Logic ---

function toggleSettingsPanel() {
    settingsPanel.classList.toggle('hidden');
}

function generateButtonIconSVG(label, color, textColor) {
    const fontSize = label.length > 1 ? 16 : 20;
    const font = `'Swiss 721 Bold Extended BT', 'Inter', 'Segoe UI', sans-serif`;
    return `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="${color}"/><text x="50%" y="51%" dominant-baseline="middle" text-anchor="middle" font-family="${font}" font-size="${fontSize}" font-weight="bold" fill="${textColor}">${label}</text></svg>`;
}

function getContrastYIQ(hexcolor){
    hexcolor = hexcolor.replace("#", "");
    const r = parseInt(hexcolor.substr(0,2),16);
    const g = parseInt(hexcolor.substr(2,2),16);
    const b = parseInt(hexcolor.substr(4,2),16);
    const yiq = ((r*299)+(g*587)+(b*114))/1000;
    return (yiq >= 128) ? 'black' : 'white';
}

function updateIconsFromSettings() {
    for (const key in buttonSettings) {
        const setting = buttonSettings[key];
        ICONS[key] = generateButtonIconSVG(setting.label, setting.color, setting.textColor);
    }
}

function saveSettings() {
    localStorage.setItem('buttonSettings', JSON.stringify(buttonSettings));
    localStorage.setItem('appSettings', JSON.stringify(appSettings));
}

function populateSettingsPanel() {
    settingsForm.innerHTML = ''; // Clear existing
    const grid = document.createElement('div');
    grid.className = 'settings-grid';

    // --- General Settings ---
    const showNeutralsLabel = document.createElement('label');
    showNeutralsLabel.textContent = 'Show Neutrals';
    showNeutralsLabel.htmlFor = 'show-neutrals-toggle';

    const showNeutralsToggle = document.createElement('input');
    showNeutralsToggle.type = 'checkbox';
    showNeutralsToggle.id = 'show-neutrals-toggle';
    showNeutralsToggle.checked = appSettings.showNeutrals;
    showNeutralsToggle.addEventListener('change', (e) => {
        appSettings.showNeutrals = e.target.checked;
        // Force a redraw
        flushInputBuffer();

        saveSettings();
    });

    const generalSettingsHeader = document.createElement('h3');
    generalSettingsHeader.textContent = 'General';
    generalSettingsHeader.style.gridColumn = '1 / -1'; // Span all columns
    generalSettingsHeader.style.marginTop = '0px';

    const showNeutralsContainer = document.createElement('div');
    showNeutralsContainer.style.display = 'flex';
    showNeutralsContainer.style.alignItems = 'center';
    // Create a styled header row
    grid.innerHTML = `
        <div class="grid-header">Preview</div>
        <div class="grid-header">Btn</div>
        <div class="grid-header">Label</div>
        <div class="grid-header">Color</div>
        <div class="grid-header">Font</div>
    `;

    showNeutralsContainer.append(showNeutralsLabel, showNeutralsToggle);
    settingsForm.appendChild(generalSettingsHeader);
    settingsForm.appendChild(showNeutralsContainer);
    settingsForm.appendChild(document.createElement('hr'));

    const buttonSettingsHeader = document.createElement('h3');
    buttonSettingsHeader.textContent = 'Buttons';
    buttonSettingsHeader.style.gridColumn = '1 / -1';

    for (const key in buttonSettings) {
        const setting = buttonSettings[key];

        const nameLabel = document.createElement('label');
        nameLabel.textContent = key

        const buttonPreview = document.createElement('div');
        buttonPreview.className = 'button-preview';
        buttonPreview.innerHTML = generateButtonIconSVG(setting.label, setting.color, setting.textColor);

        // Store a reference to the preview for live updates
        setting.previewRef = buttonPreview;
        
        const labelInput = document.createElement('input');
        labelInput.type = 'text';
        labelInput.value = setting.label;
        labelInput.dataset.key = key;
        labelInput.dataset.prop = 'label';

        const colorWrapper = document.createElement('div');
        colorWrapper.className = 'color-input-wrapper';

        const colorInput = document.createElement('input');
        colorInput.type = 'text';
        colorInput.value = setting.color;
        colorInput.dataset.key = key;
        colorInput.dataset.prop = 'color';
        // Basic pattern for a 3 or 6 digit hex code
        colorInput.pattern = '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$';

        const colorSwatch = document.createElement('div');
        colorSwatch.className = 'color-input-swatch';
        colorSwatch.style.backgroundColor = setting.color;

        // Link swatch to its input for easy updating
        colorInput.swatchRef = colorSwatch;

        const textColorSelect = document.createElement('select');
        textColorSelect.dataset.key = key;
        textColorSelect.dataset.prop = 'textColor';
        textColorSelect.innerHTML = '<option value="black">Black</option><option value="white">White</option>';
        textColorSelect.value = setting.textColor || 'black'; // Default to black


        colorWrapper.append(colorInput, colorSwatch);

        grid.append(buttonPreview, nameLabel, labelInput, colorWrapper, textColorSelect);
    }
    settingsForm.appendChild(buttonSettingsHeader);
    settingsForm.appendChild(grid);
}
        
function loadSettings() {
    const savedSettings = localStorage.getItem('buttonSettings');
    if (savedSettings) {
        buttonSettings = JSON.parse(savedSettings);
    } else { // No saved button settings, so load defaults
        buttonSettings = JSON.parse(JSON.stringify(BUTTON_DEFAULTS));
        for (const key in buttonSettings) buttonSettings[key].textColor = 'black'; // Default
    }
    const savedAppSettings = localStorage.getItem('appSettings');
    if (savedAppSettings) {
        appSettings = { ...DEFAULT_APP_SETTINGS, ...JSON.parse(savedAppSettings) }; // Merge saved with defaults
    } else {
        // Use a fresh copy of the defaults if no app settings are saved
        appSettings = JSON.parse(JSON.stringify(DEFAULT_APP_SETTINGS));
    }
    updateIconsFromSettings();
    populateSettingsPanel();
}

function resetSettings() {
    if (confirm('Are you sure you want to reset all button customizations to their defaults?')) {
        localStorage.removeItem('buttonSettings');
        localStorage.removeItem('appSettings');
        loadSettings(); // Reload the default settings
    }
}

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

        // 2. Check for new button presses
        for (let i = 0; i < currentState.buttons.length; i++) {
            if (currentState.buttons[i] && !prevState.buttons[i]) {
                hasNewButtonPress = true;
                break;
            }
        }

        // A dash counts as a new input event
        const hasNewInput = hasNewButtonPress || (directionChanged && currentDirection.num !== NEUTRAL_DIRECTION_NUM) || detectedDash || detectedMotion;

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
            } else if (directionChanged && currentDirection.num !== NEUTRAL_DIRECTION_NUM) {
                // If direction changed and it's not neutral, and no motion/dash was detected
                primaryInputSymbol = currentDirection.sym;
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
    loadSettings(); // Load user settings or defaults

    // --- Event Listeners ---
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            toggleSettingsPanel();
        }
    });

    settingsForm.addEventListener('input', (e) => {
        const { key, prop } = e.target.dataset;
        if (key && prop) {
            const value = e.target.value;
            buttonSettings[key][prop] = value;

            // If a color was changed, update the swatch and check if it's a valid hex
            if (prop === 'color') {
                const value = e.target.value;
                if (e.target.swatchRef) {
                    e.target.swatchRef.style.backgroundColor = value;
                }
                // Only regenerate icons and save if the color is valid
                if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)) {
                    updateIconsFromSettings();
                    saveSettings();
                    buttonSettings[key].previewRef.innerHTML = generateButtonIconSVG(buttonSettings[key].label, buttonSettings[key].color, buttonSettings[key].textColor);
                }
            } else { // For label and textColor changes
                buttonSettings[key][prop] = value;
                updateIconsFromSettings();
                saveSettings();
                buttonSettings[key].previewRef.innerHTML = generateButtonIconSVG(buttonSettings[key].label, buttonSettings[key].color, buttonSettings[key].textColor);
            }
        }
    });

    resetButton.addEventListener('click', resetSettings);

    for (const gamepad of navigator.getGamepads()) {
        if (gamepad) {
            handleGamepadConnected({ gamepad: gamepad });
        }
    }
    gameLoop();
});


window.addEventListener("gamepadconnected", handleGamepadConnected);
window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);
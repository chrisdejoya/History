import { ICONS, SVG_DEFAULTS } from './config.js';
import { hexToRgb, rgbToHex } from './colors.js';

export function generateButtonIconSVG(label, color, textColor) {
    const fontSize = label.length > 1 ? SVG_DEFAULTS.FONT_SIZE_LONG : SVG_DEFAULTS.FONT_SIZE_SHORT;
    const font = SVG_DEFAULTS.FONT_FAMILY;
    return `<svg viewBox="${SVG_DEFAULTS.VIEW_BOX}"><circle cx="${SVG_DEFAULTS.CIRCLE_CX}" cy="${SVG_DEFAULTS.CIRCLE_CY}" r="${SVG_DEFAULTS.CIRCLE_R}" fill="${color}"/><text x="${SVG_DEFAULTS.TEXT_X}" y="${SVG_DEFAULTS.TEXT_Y}" dominant-baseline="middle" text-anchor="middle" font-family="${font}" font-size="${fontSize}" font-weight="bold" fill="${textColor}">${label}</text></svg>`;
}

export function updateIconsFromSettings(buttonSettings) {
    for (const key in buttonSettings) {
        const setting = buttonSettings[key];
        ICONS[key] = generateButtonIconSVG(setting.label, setting.color, setting.textColor);
    }
}

export function populateSettingsPanel(settingsForm, appSettings, buttonSettings, flushInputBuffer, saveSettings) {
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
    showNeutralsToggle.className = 'text-color-toggle'; // Reuse the existing toggle style
    showNeutralsToggle.addEventListener('change', (e) => {
        appSettings.showNeutrals = e.target.checked;
        flushInputBuffer();
        saveSettings();
    });

    const generalSettingsHeader = document.createElement('h3');
    generalSettingsHeader.textContent = 'General';

    const showNeutralsContainer = document.createElement('div');
    showNeutralsContainer.className = 'settings-toggle-container';
    showNeutralsContainer.append(showNeutralsLabel, showNeutralsToggle);

    // --- FPS Setting ---
    const fpsLabel = document.createElement('label');
    fpsLabel.textContent = 'Target FPS (0 for uncapped)';
    fpsLabel.htmlFor = 'target-fps-input';

    const fpsInput = document.createElement('input');
    fpsInput.type = 'number';
    fpsInput.id = 'target-fps-input';
    fpsInput.min = 0;
    fpsInput.value = appSettings.targetFps;
    fpsInput.dataset.appSetting = 'targetFps';

    const fpsContainer = document.createElement('div');
    fpsContainer.className = 'settings-input-container'; // A generic container
    fpsContainer.append(fpsLabel, fpsInput);

    // Create a styled header row
    grid.innerHTML = `
        <div class="grid-header">Preview</div>
        <div class="grid-header">Btn</div>
        <div class="grid-header" style="grid-column: 3;">Label</div>
        <div class="grid-header" style="grid-column: 4;">Color</div>
        <div class="grid-header" style="grid-column: 6;">Font</div>
    `;

    settingsForm.appendChild(generalSettingsHeader);
    settingsForm.appendChild(showNeutralsContainer);
    settingsForm.appendChild(fpsContainer);
    settingsForm.appendChild(document.createElement('hr'));

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

        const colorContainer = document.createElement('div');
        colorContainer.className = 'color-input-container';

        const rgbContainer = document.createElement('div');
        rgbContainer.className = 'rgb-input-group';

        const initialRgb = hexToRgb(setting.color) || { r: 0, g: 0, b: 0 };

        ['r', 'g', 'b'].forEach(comp => {
            const numInput = document.createElement('input');
            numInput.type = 'number';
            numInput.min = 0;
            numInput.max = 255;
            numInput.value = initialRgb[comp];
            numInput.dataset.key = key;
            numInput.dataset.prop = 'color-rgb';
            numInput.dataset.comp = comp;
            numInput.className = 'rgb-input';
            rgbContainer.appendChild(numInput);
        });

        const hexInput = document.createElement('input');
        hexInput.type = 'text';
        hexInput.value = setting.color;
        hexInput.dataset.key = key;
        hexInput.dataset.prop = 'color-hex';
        hexInput.className = 'hex-input';
        hexInput.pattern = '^#([A-Fa-f0-9]{6})$';

        const colorSwatch = document.createElement('div');
        colorSwatch.className = 'color-input-swatch';
        colorSwatch.style.backgroundColor = setting.color;

        // Store references for easy access
        setting.rgbInputRefs = {
            r: rgbContainer.children[0],
            g: rgbContainer.children[1],
            b: rgbContainer.children[2]
        };
        setting.hexInputRef = hexInput;
        setting.swatchRef = colorSwatch;

        colorContainer.append(rgbContainer, hexInput);

        const textColorToggle = document.createElement('input');
        textColorToggle.type = 'checkbox';
        textColorToggle.id = `text-color-toggle-${key}`;
        textColorToggle.className = 'text-color-toggle';
        textColorToggle.dataset.key = key;
        textColorToggle.dataset.prop = 'textColor';
        textColorToggle.checked = setting.textColor === 'white'; // White is "on"

        const textColorLabel = document.createElement('label');
        textColorLabel.htmlFor = `text-color-toggle-${key}`;
        textColorLabel.className = 'text-color-label';

        // Initial label based on setting
        textColorLabel.textContent = setting.textColor === 'white' ? 'White' : 'Black';

        const textColorContainer = document.createElement('div');
        textColorContainer.className = 'text-color-container';
        textColorContainer.append(textColorLabel, textColorToggle);

        setting.textColorToggleRef = textColorToggle; // Save ref for updates
        setting.textColorLabelRef = textColorLabel;

        grid.append(buttonPreview, nameLabel, labelInput, colorContainer, colorSwatch, textColorContainer);
    }
    settingsForm.appendChild(grid);
}
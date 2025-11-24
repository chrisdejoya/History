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

function createLabeledInput(labelText, inputElement) {
    const container = document.createElement('div');
    container.className = 'labeled-input';
    const label = document.createElement('label');
    label.textContent = labelText;
    container.append(label, inputElement);
    return container;
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
        saveSettings();
    });

    const generalSettingsHeader = document.createElement('h3');
    generalSettingsHeader.textContent = 'General';

    const generalSettingsContainer = document.createElement('div');
    generalSettingsContainer.className = 'general-settings-container';

    const showNeutralsItem = document.createElement('div');
    showNeutralsItem.className = 'general-setting-item';
    showNeutralsItem.append(showNeutralsLabel, showNeutralsToggle);

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

    const fpsItem = document.createElement('div');
    fpsItem.className = 'general-setting-item';
    fpsItem.append(fpsLabel, fpsInput);
    
    // --- Max Lines Setting ---
    const maxLinesLabel = document.createElement('label');
    maxLinesLabel.textContent = 'History Lines';
    maxLinesLabel.htmlFor = 'max-lines-input';

    const maxLinesInput = document.createElement('input');
    maxLinesInput.type = 'number';
    maxLinesInput.id = 'max-lines-input';
    maxLinesInput.min = 1;
    maxLinesInput.value = appSettings.maxDisplayLines;
    maxLinesInput.dataset.appSetting = 'maxDisplayLines';

    const maxLinesItem = document.createElement('div');
    maxLinesItem.className = 'general-setting-item';
    maxLinesItem.append(maxLinesLabel, maxLinesInput);

    // --- Glyph Size Setting ---
    const glyphSizeLabel = document.createElement('label');
    glyphSizeLabel.textContent = 'Glyph Size';
    glyphSizeLabel.htmlFor = 'glyph-size-input';

    const glyphSizeInput = document.createElement('input');
    glyphSizeInput.type = 'number';
    glyphSizeInput.id = 'glyph-size-input';
    glyphSizeInput.min = 10;
    glyphSizeInput.max = 100;
    glyphSizeInput.value = appSettings.glyphSize;
    glyphSizeInput.dataset.appSetting = 'glyphSize';

    const glyphSizeItem = document.createElement('div');
    glyphSizeItem.className = 'general-setting-item';
    glyphSizeItem.append(glyphSizeLabel, glyphSizeInput);
    
    // --- Glyph Spacing Setting ---
    const glyphSpacingLabel = document.createElement('label');
    glyphSpacingLabel.textContent = 'Glyph Spacing';
    glyphSpacingLabel.htmlFor = 'glyph-spacing-input';

    const glyphSpacingInput = document.createElement('input');
    glyphSpacingInput.type = 'number';
    glyphSpacingInput.id = 'glyph-spacing-input';
    glyphSpacingInput.min = 0;
    glyphSpacingInput.max = 20;
    glyphSpacingInput.value = appSettings.glyphSpacing;
    glyphSpacingInput.dataset.appSetting = 'glyphSpacing';

    const glyphSpacingItem = document.createElement('div');
    glyphSpacingItem.className = 'general-setting-item';
    glyphSpacingItem.append(glyphSpacingLabel, glyphSpacingInput);

    const buttonSettingsHeader = document.createElement('h3');
    buttonSettingsHeader.textContent = 'Button Customization';


    // Create a styled header row
    grid.innerHTML = `
        <div class="grid-header">Preview</div>
        <div class="grid-header">Btn</div>
        <div class="grid-header">Label</div>
        <div class="grid-header">Color (R, G, B, Hex)</div>
        <div class="grid-header">Font</div>
    `;

    generalSettingsContainer.append(showNeutralsItem, fpsItem, maxLinesItem, glyphSizeItem, glyphSpacingItem);
    settingsForm.appendChild(generalSettingsHeader);
    settingsForm.appendChild(generalSettingsContainer);
    settingsForm.appendChild(document.createElement('hr'));

    settingsForm.appendChild(buttonSettingsHeader);

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
        colorContainer.className = 'color-controls-container';

        const rgbContainer = document.createElement('div');
        rgbContainer.className = 'rgb-input-group';

        const swatchAndHexContainer = document.createElement('div');
        swatchAndHexContainer.className = 'swatch-hex-container';

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

            const labeledInput = createLabeledInput(comp, numInput);
            rgbContainer.appendChild(labeledInput);
        });

        const hexInput = document.createElement('input');
        hexInput.type = 'text';
        hexInput.value = setting.color;
        hexInput.dataset.key = key;
        hexInput.dataset.prop = 'color-hex';
        hexInput.className = 'hex-input';
        hexInput.pattern = '^#([A-Fa-f0-9]{6})$';

        const hexField = createLabeledInput('Hex', hexInput);
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

        swatchAndHexContainer.append(colorSwatch, hexField);
        colorContainer.append(rgbContainer, swatchAndHexContainer);

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

        grid.append(buttonPreview, nameLabel, labelInput, colorContainer, textColorContainer);
    }
    settingsForm.appendChild(grid);
}
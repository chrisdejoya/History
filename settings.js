import { BUTTON_DEFAULTS, RGB_SCROLL_STEP } from './config.js';
import { populateSettingsPanel, updateIconsFromSettings, generateButtonIconSVG } from './ui.js';
import { hexToRgb, rgbToHex } from './colors.js';

const settingsPanel = document.getElementById('settings-panel');
const settingsForm = document.getElementById('settings-form');
const resetButton = document.getElementById('reset-settings-btn');

export let buttonSettings = {};
export const DEFAULT_APP_SETTINGS = {
    showNeutrals: true,
    targetFps: 60
};
export let appSettings = {};

function saveSettings() {
    localStorage.setItem('buttonSettings', JSON.stringify(buttonSettings));
    localStorage.setItem('appSettings', JSON.stringify(appSettings));
}

function loadSettings(flushInputBuffer) {
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
    updateIconsFromSettings(buttonSettings);
    populateSettingsPanel(settingsForm, appSettings, buttonSettings, flushInputBuffer, saveSettings);
}

function resetSettings(flushInputBuffer) {
    if (confirm('Are you sure you want to reset all button customizations to their defaults?')) {
        localStorage.removeItem('buttonSettings');
        localStorage.removeItem('appSettings');
        loadSettings(flushInputBuffer); // Reload the default settings
    }
}

function toggleSettingsPanel() {
    settingsPanel.classList.toggle('hidden');
}

export function initializeSettings(flushInputBuffer) {
    loadSettings(flushInputBuffer);

    // --- Event Listeners ---
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            toggleSettingsPanel();
        }
    });

    settingsForm.addEventListener('wheel', (e) => {
        const { key, prop } = e.target.dataset;
        if (key && prop === 'color-rgb') {
            e.preventDefault();
            const input = e.target;
            let value = parseInt(input.value, 10);

            if (e.deltaY < 0) { // Scrolling up
                value = Math.min(255, value + RGB_SCROLL_STEP);
            } else { // Scrolling down
                value = Math.max(0, value - RGB_SCROLL_STEP);
            }
            input.value = value;

            // Manually trigger an input event to update everything
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }, { passive: false });

    settingsForm.addEventListener('input', (e) => {
        const { key, prop } = e.target.dataset;
        if (key && prop) {
            const setting = buttonSettings[key];

            if (prop === 'color-rgb') {
                // Ensure value is within bounds when typing
                let val = parseInt(e.target.value, 10);
                if (isNaN(val)) val = 0; // Handle empty input
                val = Math.max(0, Math.min(255, val));
                // Only update if the parsed value is different, prevents cursor jumping on blur
                if (e.target.value !== String(val)) e.target.value = val;

                const r = parseInt(setting.rgbInputRefs.r.querySelector('input').value, 10);
                const g = parseInt(setting.rgbInputRefs.g.querySelector('input').value, 10);
                const b = parseInt(setting.rgbInputRefs.b.querySelector('input').value, 10);

                if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                    const newHex = rgbToHex(r, g, b);
                    setting.color = newHex;
                    setting.hexInputRef.value = newHex; // Update hex input
                    setting.swatchRef.style.backgroundColor = newHex;
                    setting.previewRef.innerHTML = generateButtonIconSVG(setting.label, newHex, setting.textColor);
                    updateIconsFromSettings(buttonSettings);
                    saveSettings();
                }
            } else if (prop === 'color-hex') {
                const hexValue = e.target.value;
                if (/^#([A-Fa-f0-9]{6})$/.test(hexValue)) {
                    const rgb = hexToRgb(hexValue);
                    if (rgb) {
                        setting.color = hexValue;
                        // Update RGB inputs
                        setting.rgbInputRefs.r.querySelector('input').value = rgb.r;
                        setting.rgbInputRefs.g.querySelector('input').value = rgb.g;
                        setting.rgbInputRefs.b.querySelector('input').value = rgb.b;
                        // Update swatch and preview
                        setting.swatchRef.style.backgroundColor = hexValue;
                        setting.previewRef.innerHTML = generateButtonIconSVG(setting.label, hexValue, setting.textColor);
                        updateIconsFromSettings(buttonSettings);
                        saveSettings();
                    }
                }
            } else { // For label and textColor changes
                const value = e.target.type === 'checkbox' ? (e.target.checked ? 'white' : 'black') : e.target.value;
                setting[prop] = value;


                updateIconsFromSettings(buttonSettings);
                saveSettings();
                setting.previewRef.innerHTML = generateButtonIconSVG(setting.label, setting.color, setting.textColor);
                if (prop === 'textColor' && setting.textColorLabelRef) {
                    setting.textColorLabelRef.textContent = value === 'white' ? 'White' : 'Black';
                }
            }
        } else if (e.target.dataset.appSetting) {
            const settingName = e.target.dataset.appSetting;
            if (settingName === 'targetFps') {
                let value = parseInt(e.target.value, 10);
                if (isNaN(value) || value < 0) value = 0;
                appSettings[settingName] = value;
                saveSettings();
            }
        }
    });

    resetButton.addEventListener('click', () => resetSettings(flushInputBuffer));
}
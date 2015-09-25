/**
 * This file contains functions for saving and loading application settings
 * via HTML5 localStorage. Setting values are automatically converted to and
 * from JSON when possible, so serializable objects can be stored.
 */

(function() {
    // Default values for all settings. Only settings which have
    // an entry in this object will be saved in localStorage.
    var defaultSettings = {
        HideImagesInChat: true,
        HideVideoChat: true,
        HideVideoComments: true
    };

    var $menu;

    /**
     * Applies the settings selected in the settings menu by saving them to localStorage.
     */
    function applySettings() {
        var $inputElements = $menu.find("input");
        var settings = {};

        $.each($inputElements, function(index, element) {
            var $element = $(element);
            var inputType = $element.prop("type").toLowerCase();
            var settingsName = $element.data("settings-name");
            var settingsValue;

            switch (inputType) {
                case "checkbox":
                    settingsValue = $element.prop("checked");
                    break;
                default:
                    settingsValue = $element.val();
                    break;
            }

            settings[settingsName] = settingsValue;
        });

        saveSettingsToLocalStorage(settings);
        $menu.hide();

        alert("You may need to refresh dubtrack to see changes take effect.");
    };

    /**
     * Cancels the settings dialog and restores input elements to their last applied values.
     */
    function cancelSettings() {
        var storedSettings = loadSettingsFromLocalStorage();
        var $inputElements = $menu.find("input");

        $inputElements.each(function(index, element) {
            var $element = $(element);
            var inputType = $element.prop("type").toLowerCase();

            var settingsName = $element.data("settings-name");
            var settingsValue = storedSettings[settingsName];

            switch (inputType) {
                case "checkbox":
                    $element.prop("checked", !!settingsValue);
                    break;
                default:
                    console.log("Didn't know how to handle input of type " + inputType);
                    break;
            }
        });

        $menu.hide();
    }

    /**
     * Creates the settings menu and applies event handlers to its elements.
     */
    window.createSettingsMenu = function() {
        var $menuTitle = $("<div style='cursor: pointer; position: absolute; top: 0.9em; right: 13em; z-index: 9999'>dubover settings</div>");

        var menuCss = GM_getResourceText("SettingsMenuCss");
        var menuHtml = GM_getResourceText("SettingsMenuTemplate");

        injectCssInHead(menuCss);
        $menu = $(menuHtml);

        var $applyButton = $menu.find("#duboverSettingsMenuApplyButton");
        var $cancelButton = $menu.find("#duboverSettingsMenuCancelButton");

        $menuTitle.click(function() {
            $menu.toggle();
        });

        $applyButton.click(applySettings);
        $cancelButton.click(cancelSettings);

        $(document.body).append($menu);
        $(document.body).append($menuTitle);
        cancelSettings(); // applies settings from localstorage
    };

    /**
     * Loads the user's settings from localStorage. Settings are interpreted
     * as JSON first and deserialized; if this fails, they are just treated as strings.
     */
    window.loadSettingsFromLocalStorage = function() {
        var settings = {};

        for (var key in defaultSettings) {
            var value = localStorage.getItem(key);

            if (value !== null) {
                try {
                    value = JSON.parse(value);
                }
                catch (e) {
                }
            }
            else {
                value = defaultSettings[key];
            }

            settings[key] = value;
        }

        return settings;
    };

    /**
     * Saves the user's settings to localStorage. Setting values are serialized as JSON.
     */
    window.saveSettingsToLocalStorage = function(settings) {
        for (var key in defaultSettings) {
            var value = settings[key];

            if (typeof value === "undefined") {
                continue;
            }

            localStorage.setItem(key, JSON.stringify(value));
        }
    };
})();
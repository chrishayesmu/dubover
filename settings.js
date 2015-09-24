/**
 * This file contains functions for saving and loading application settings
 * via HTML5 localStorage. Setting values are automatically converted to and
 * from JSON when possible, so serializable objects can be stored.
 */
 
(function() {
	var defaultSettings = {
		HideImagesInChat: true,
		HideVideoChat: false
	};

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
	
	window.saveSettingsToLocalStorage = function(settings) {
		for (var key in defaultSettings) {
			var key = settingsKeys[i];
			var value = settings[key];
			
			if (typeof value === "undefined") {
				continue;
			}
			
			localStorage.setItem(key, JSON.stringify(value));
		}
	};
})();
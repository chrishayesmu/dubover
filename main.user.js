// ==UserScript==
// @name       dubover
// @namespace  https://github.com/zencal/dubover
// @version    0.1.3
// @description Provides UI enhancements for dubtrack.fm
// @match      https://www.dubtrack.fm/*
// @copyright  2015+, Chris Hayes
// @run-at     document-end
// @require https://code.jquery.com/jquery-2.1.4.min.js
// @require https://rawgit.com/zencal/dubover/master/settings.js
// @downloadURL https://rawgit.com/zencal/dubover/master/main.user.js
// ==/UserScript==

var settings = loadSettingsFromLocalStorage();
initialize();

/**
 * Main entry point of the userscript.
 */
function initialize() {
	observeForImagesInChat();
	removeVideoChat();
}

function observeForImagesInChat() {
    var imagesInChatObserver = new MutationObserver(function(mutations) {
        if (settings.HideImagesInChat) {
            mutations.forEach(function(mutation) {
                if (mutation.target && mutation.target.classList.contains("chat-main") && mutation.addedNodes.length > 0) {
                    for (var i = 0; i < mutation.addedNodes.length; i++) {
                        var $node = $(mutation.addedNodes[i]);

                        // Find the added images (but only under a node with class autolink, or else
                        // we'll accidentally replace the user's avatar as well)
                        var $imgTags = $node.find("a.autolink > img");

                        $imgTags.each(function(index, item) {
                            var $item = $(item);
                            var src = $item.attr("src");
                            $item.replaceWith(src);
                        });
                    }
                }
            });
        }
    });

    var chatDiv = document.getElementById("chat");
    imagesInChatObserver.observe(chatDiv, { childList: true, subtree: true });
}

function removeVideoChat() {
	if(settings.HideVideoChat) {
		var toggleVideoElements = document.getElementsByClassName("toggle_videos");
		$.each(toggleVideoElements, function(index, element) {
			element.remove();
		});
	}
}
// ==UserScript==
// @name       dubover zencal
// @namespace  https://github.com/zencal/dubover
// @version    0.2
// @description Provides UI enhancements for dubtrack.fm
// @match      https://www.dubtrack.fm/*
// @copyright  2015+, Chris Hayes
// @run-at     document-end
// @require https://code.jquery.com/jquery-2.1.4.min.js
// @require js/settings.js
// @require js/plugJSONImporter.js
// @resource SettingsMenuCss css/settingsMenu.css
// @resource SettingsMenuTemplate html/settingsMenu.html
// @downloadURL https://rawgit.com/zencal/dubover/master/main.user.js
// ==/UserScript==

(function() {
    // Cached jQuery elements
    var $toggleVideoChatElement;
    var $videoCommentsElement;

    var imagesInChatObserver;
    var settings;

    /**************************************************
     * Functions which are exported to global namespace
     **************************************************/

    /**
     * Injects a CSS style element at the head of the document.
     *
     * @param {string} css - A valid CSS stylesheet to insert.
     */
    window.injectCssInHead = function(css) {
        $("<style type='text/css'></style>").html(css).appendTo(document.head);
    }

    /**************************************************
     * Functions which are confined to this IIFE
     **************************************************/

    /**
     * Main entry point of the userscript.
     */
    function initialize() {
        console.log("Initializing dubover.");

        settings = loadSettingsFromLocalStorage();
        console.log("User's settings: ", settings);

        $toggleVideoChatElement = $("#dubtrack-video-realtime .toggle_videos");
        $videoCommentsElement = $("#room-comments");

        createSettingsMenu();
        observeForImagesInChat();
        setDisplayOfVideoChat();
        setDisplayOfVideoComments();
        createPopOutChatButton();
        createPlugJSONImporterButton();

        console.log("dubover initialization is complete.");
    }

    /**
     * Injects a button to trigger the plug JSON importer
     */
    function createPlugJSONImporterButton() {
        var $importerButton = $("<div style='cursor: pointer; position: absolute; top: 0.9em; left: 25em; z-index: 9999'>Import JSON</div>");
        $importerButton.click(importFromPlugJSON);
        $(document.body).append($importerButton);
    }

    /**
     * Injects a button to trigger pop out chat
     */
    function createPopOutChatButton() {
        var $popOutButton = $("<div style='cursor: pointer; position: absolute; top: 0.9em; right: 30em; z-index: 9999'>Pop Out</div>");

        $popOutButton.click(function() {
            var chatWindow = window.open("","ExpandedWindow","height=800,width=400,status=no,toolbar=no,menubar=no,location=no", false);
            //var $chat = $("#chat");
            var $chat = $(".right_section");
            //$("link, style, script").each(function() {
            //   $(chatWindow.document.head).append($(this).clone());
            //});

            $(chatWindow.document.body).append($chat);
            $(chatWindow).unload(function() {
                //$(".right_section").append($chat);
                $("#main-room").append($chat);
            });
        });

        $(document.body).append($popOutButton);
    }

    /**
     * Toggles visibility of the video chat element.
     */
    function setDisplayOfVideoChat() {
        $toggleVideoChatElement.toggle(!settings.HideVideoChat);
    }

    /**
     * Toggles visibility of the video comments element.
     */
    function setDisplayOfVideoComments() {
        $videoCommentsElement.toggle(!settings.HideVideoComments);
    }

    /**
     * Sets up an observer which watches chat for incoming images,
     * and replaces them with plain links if configured to do so.
     */
    function observeForImagesInChat() {
        if (imagesInChatObserver != null) {
            // We're already watching the chat
            return;
        }

        imagesInChatObserver = new MutationObserver(function(mutations) {
            if (settings.HideImagesInChat) {
                mutations.forEach(function(mutation) {
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
                });
            }
        });

        var chatDiv = document.getElementById("chat");
        imagesInChatObserver.observe(chatDiv, { childList: true, subtree: true });
    }

    /**************************************************
     * Code which is executing immediately in the IIFE
     **************************************************/

    initialize();
})();
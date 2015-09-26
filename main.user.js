// ==UserScript==
// @name        dubover
// @namespace   https://github.com/chrishayesmu/dubover
// @version     0.6.2
// @description Provides UI enhancements for dubtrack.fm
// @match       https://www.dubtrack.fm/*
// @copyright   2015+, Chris Hayes
// @run-at      document-end
// @require     https://code.jquery.com/jquery-2.1.4.min.js
// @require     js/settings.js
// @require     js/plugJSONImporter.js
// @resource    ChatPopOutCss css/chatPopOut.css
// @resource    SettingsMenuCss css/settingsMenu.css
// @resource    SettingsMenuTemplate html/settingsMenu.html
// @grant       GM_getResourceText
// @grant       GM_xmlhttpRequest
// @downloadURL https://rawgit.com/chrishayesmu/dubover/master/main.user.js
// ==/UserScript==

(function() {
    // Cached jQuery elements
    var $toggleVideoChatElement;
    var $videoCommentsElement;

    var chatTimestampObserver;
    var imagesInChatObserver;
    var settings;

    /**************************************************
     * Functions which are exported to global namespace
     **************************************************/

    /**
     * Injects a CSS style element at the head of the document.
     *
     * @param {string} css - A valid CSS stylesheet to insert.
     * @param {DOMNode} _document - Optional. The window document to insert into.
     */
    window.injectCssInHead = function(css, _document) {
        _document = _document || window.document;
        
        $("<style type='text/css'></style>").html(css).appendTo(_document.head);
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

        createPopOutChatButton();
        createSettingsMenu();
        improveChatTimestampOpacity();
        moveUserList();
        observeForImagesInChat();
        observeForTimestampsInChat();
        replaceDubsWithUsernames();
        setDisplayModeOfChatTimestamps();
        setDisplayOfVideoChat();
        setDisplayOfVideoComments();
        createPlugJSONImporterButton();

        console.log("dubover initialization is complete.");
    }

    /**
     * Injects a button to trigger the plug JSON importer
     */
    function createPlugJSONImporterButton() {
        executeWhenSelectorMatched(".main-menu", function($mainMenu) {
            var $importerButton = $("<li><span>Import JSON</span></li>");
            $importerButton.css({
                height: "",
                marginTop: "0.85em",
                maxHeight: "18em",
                paddingLeft: "0.4em",
                overflowY: "auto"
            });

            $importerButton.click(importFromPlugJSON);
            $mainMenu.append($importerButton);
        });
    }

    /**
     * Creates a button that pops out chat into a separate window when clicked.
     */
    function createPopOutChatButton() {
        executeWhenSelectorMatched(".chat_tools", function($chatTools) {
            var $popOutButton = $("<div id='duboverPopOutChatButton'>Pop out</div>");
            var popOutCss = GM_getResourceText("ChatPopOutCss");
            injectCssInHead(popOutCss);

            $popOutButton.click(function() {
                $popOutButton.hide();
                
                // Open the new window and copy things from the original window
                var chatWindow = window.open("","ExpandedWindow","height=800,width=400,status=no,toolbar=no,menubar=no,location=no", false);
                chatWindow.document.title = document.title;
                console.log(chatWindow);
                
                // Inject this as its own CSS to avoid the complexity of undoing it later
                injectCssInHead("#chat {\
                display: block;\
                position: static;\
                }", chatWindow.document);
                
                var $chat = $("#chat");
                var $chatMessages = $chat.find(".chat-messages");
                var originalChatHeight = $chatMessages.css("height");

                // dubtrack has a resize handler that styles the chat div via manual height calculation.
                // We run our own handler after theirs and remove their changes.            
                var resizeHandler = function() {
                    $chatMessages.css("height", "calc(100% - 6.6em)");
                };
                
                $(window).resize(resizeHandler);
                
                // Copy all of the CSS from the original window to the new one
                $("link, style").each(function() {
                    var $copy = $(this).clone();
                    
                    // Some links use the // protocol indicator, which tells the page to load the
                    // resource using the same protocol the page was loaded with. Since our new window
                    // wasn't loaded with anything, these links will break. Referencing the attribute in
                    // code automatically attached the protocol, so we set the value to itself in order to
                    // get this explicit protocol into the node itself, which lets it load properly.
                    $copy.prop("href", $copy.prop("href"));
                    
                    $(chatWindow.document.head).append($copy);
                });

                // Apply special styling to handle the new display conditions
                $chat.css("display", "block");
                $chat.find(".room-user-counter").css("display", "block");
                $chatMessages.css("height", "calc(100% - 6.6em)");
                
                // Recreate the main-room element because of CSS rules that rely on it being there
                var $mainRoom = $("<section id='main-room' style='display: block; margin: 0; max-width: 100%'></section>");
                $mainRoom.append($chat);
                $(chatWindow.document.body).append($mainRoom);
                
                // Restore everything to its original state when the window is closed
                $(chatWindow).unload(function() {
                    $(window).off("resize", resizeHandler);
                    $(".right_section").append($chat);
                    $chat.css("display", "");
                    $chat.find(".room-user-counter").css("display", "");
                    $chatMessages.css("height", originalChatHeight);
                    $popOutButton.show();
                });
                
                // If the user closes dubtrack, close this window as well
                $(window).unload(function() {
                    chatWindow.close();
                });
            });
            
            $chatTools.append($popOutButton);
        });
    }
    
    /**
     * Executes the given callback the first time a DOM element is found matching
     * the selector given. Elements are checked for periodically. Once found, the
     * callback will be executed only once.
     *
     * @param {string} selector - A valid jQuery selector.
     * @param {function} callback - A function to call when an element is found.
     * @param {integer} timerIntervalInMs - Optional. How often to check for the element, in milliseconds.
     * @param {object} context - Optional. If provided, the callback function will be invoked in this context.
     */
    function executeWhenSelectorMatched(selector, callback, timerIntervalInMs, context) {
        timerIntervalInMs = timerIntervalInMs || 250;

        var $elements = $(selector);
        if ($elements.length > 0) {
            callback.call(context, $elements);
        }
        else {
            var timeoutCallback = function() {
                executeWhenSelectorMatched(selector, callback, context);
            };

            setTimeout(timeoutCallback, timerIntervalInMs);
        }
    }

    /**
     * Formats a date object according to a format string.
     *
     * @param {date} date - A date which needs formatting.
     * @param {string} format - A format string to apply during formatting.
     * @returns {string} The date in the format given.
     */
    function formatDate(date, format) {
        var dateAsString = date.toDateString();
        
        var day = date.getDay();
        var month = date.getMonth();
        var year = 1900 + date.getYear(); // JS dates start with year 0 at 1900
        
        var abbrevDay = dateAsString.substring(0, 3);
        var abbrevMonth = dateAsString.substring(4, 7);
        var abbrevYear = dateAsString.substring(dateAsString.length - 2, dateAsString.length);
        
        var hoursIn24HourClock = date.getHours();
        var hoursIn12HourClock = hoursIn24HourClock > 12 ? hoursIn24HourClock - 12 : hoursIn24HourClock;
        if (hoursIn12HourClock === 0) {
            hoursIn12HourClock = 12;
        }

        var minutes = date.getMinutes();
        var seconds = date.getSeconds();
        
        var amPmDesignator = hoursIn24HourClock < 12 ? "AM" : "PM";
        
        // Replace all possible placeholders in such an order that the longest subsequence is replaced first always
        return format.replace("ddd", abbrevDay)
                     .replace("dd", padLeft(day, 0, 2))
                     .replace("d", day)
                     .replace("MMM", abbrevMonth)
                     .replace("MM", padLeft(month, 0, 2))
                     .replace("M", month)
                     .replace("yyyy", year)
                     .replace("yy", abbrevYear)
                     .replace("hh", padLeft(hoursIn12HourClock, 0, 2))
                     .replace("h", hoursIn12HourClock)
                     .replace("HH", padLeft(hoursIn24HourClock, 0, 2))
                     .replace("H", hoursIn24HourClock)
                     .replace("mm", padLeft(minutes, 0, 2))
                     .replace("m", minutes)
                     .replace("ss", padLeft(seconds, 0, 2))
                     .replace("s", seconds)
                     .replace("tt", amPmDesignator);
    }
    
    /**
     * Changes the opacity of chat timestamps to make them much easier to read.
     */
    function improveChatTimestampOpacity() {
        injectCssInHead("\
            #chat .chat-container ul.chat-main li .activity-row .meta-info {\
                opacity: 0.7\
            }\
        ");
    }
    
    /**
     * Moves the list of users in the room to be underneath the active video.
     */
    function moveUserList() {
        if (settings.MoveUsersSectionUnderVideo) {
            executeWhenSelectorMatched("#main-user-list-room", function($userList) {
                var $leftSection = $("section.left_section");
                var $userSection = $("<section></section>");
                $userList.appendTo($userSection);
                $userSection.appendTo($leftSection);

                $userList.css({
                    height: "",
                    marginTop: "1.5em",
                    maxHeight: "18em",
                    paddingLeft: "0.4em",
                    overflowY: "auto"
                });
            });
        }
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
    
    /**
     * Watches the chat for incoming messages and overwrites the default timestamp
     * with a user-configured version. Also prevents dubtrack's automatic relative-time-update
     * process from rewriting the timestamp in the relatve time format.
     */
    function observeForTimestampsInChat() {
        if (chatTimestampObserver != null) {
            return;
        }
        
        chatTimestampObserver = new MutationObserver(function(mutations) {
            if (settings.DateFormatString) {
                mutations.forEach(function(mutation) {
                    if (mutation.target.classList.contains("timeago")) {
                        var $item = $(mutation.target);
                        var date = new Date($item.attr("datetime"));
                        var formattedDate = formatDate(date, settings.DateFormatString);

                        if ($item.text() !== formattedDate) {
                            $item.text(formattedDate);
                        }
                    }
                });
            }
        });

        var chatDiv = document.getElementById("chat");
        chatTimestampObserver.observe(chatDiv, { childList: true, subtree: true });
    }
    
    /**
     * Pads the provided string on the left using the given padding string to the specified length.
     *
     * @param {string} str - The string that needs to be padded.
     * @param {string} paddingStr - The string to pad with.
     * @param {integer} length - How long the output string should be. If the paddingStr is more
     *                           than 1 character long, the output string may be longer than this.
     * @returns {string} A string padded on the left as specified.
     */
    function padLeft(str, paddingStr, length) {
        if (paddingStr.length === 0) {
            throw new Error("paddingStr must be at least 1 character long");
        }
    
        str = String(str);
        var numCharsToAdd = length - str.length;
        var ret = "";
        
        for (var i = 0; i < numCharsToAdd; i++) {
            ret = paddingStr + ret;
        }
        
        return ret + str;
    }
    
    /**
     * Swaps the dub count which is normally under a user's avatar with their username.
     */
    function replaceDubsWithUsernames() {
        if (settings.ReplaceDubsWithUsernames) {
            injectCssInHead("\
            ul.avatar-list li p.username {\
                display: block;\
            }\
            ul.avatar-list li p.dubs {\
                display: none\
            }\
            ");
        }
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
     * Toggles visibility of chat timestamps when chat isn't being hovered over.
     */
    function setDisplayModeOfChatTimestamps() {
        if (settings.AlwaysShowChatTimestamps) {
            injectCssInHead("\
            #chat .chat-container ul.chat-main li .activity-row .meta-info {\
                display: block\
            }\
            ");
        }
    }

    /**************************************************
     * Code which is executing immediately in the IIFE
     **************************************************/

    initialize();
})();

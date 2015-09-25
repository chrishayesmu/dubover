(function() {
    window.importFromPlugJSON = function() {
        var json = JSON.parse(prompt("Open your JSON file and paste contents here"));
        var playlists = Object.keys(json.playlists);

        $.each(playlists, function(index, title) {
            // Create dubtrack playlist
            var playlistDetails = {
                "name": title
            };

            GM_xmlhttpRequest({
                method: "POST",
                url: "https://api.dubtrack.fm/playlist",
                data: JSON.stringify(playlistDetails),
                headers:    {
                    "Content-Type": "application/json"
                },
                onload: function(data) {
                    // Add all the items to the playlist
                    var dubtrackPlaylistId = data.data._id;
                    var counter = 0;
                    var playlist = json.playlists[title];
                    console.log("Created dubtrack playlist for playlist: " + title);

                    $.each(playlist, function(index, value) {
                        counter++;

                        var type = (value.type == 1) ? "youtube" : "soundcloud";

                        var videoDetails = {
                            "fkid": value.id,
                            "type": type
                        };

                        GM_xmlhttpRequest({
                            method: "POST",
                            url: "https://api.dubtrack.fm/playlist/" + dubtrackPlaylistId + "/songs",
                            data: JSON.stringify(videoDetails),
                            headers:    {
                                "Content-Type": "application/json"
                            },
                            onload: function( data ) {
                                console.log("Added " + counter + " song(s) to dubtrack playlist " + title);
                            },
                            onerror: function( error ) {
                                alert("Something went wrong while adding an item to the new playlist: " + error);
                            }
                        });
                    });
                },
                onerror: function( error ) {
                    alert("Something went wrong while creating the playlist: " + error);
                }
            });

            console.log("Added playlist " + title);
        });
    }
})();
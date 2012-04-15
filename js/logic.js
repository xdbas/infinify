"use strict";

var sp = getSpotifyApi(1);
    
var models = sp.require('sp://import/scripts/api/models'),
    views = sp.require('sp://import/scripts/api/views'),
    player = models.player;

var tabController = {
	initialize: function() {
		this.argChanged();
	},
	argChanged: function() {
		var args = models.application.arguments,
			currentTab = args[0];

		$('div[rel="tab"]').hide();
		$('#' + currentTab).show();

		switch(currentTab) {
			case 'index':
            index.preload();
				index.initialize();
				break;
			case 'tabs':
                pics.preload();
				pics.gather();
				break;
            case 'nowplaying':
                nowplaying.preload();
                nowplaying.init();
                nowplaying.setupButtons();
                break;
		}
	},
    getTab: function() {
        var args = models.application.arguments;

        return args[0];
    }
},
uplayer = {
	eventChanged: function(e) {
		if(e.data.curtrack == true) {
			uinterface.updateHeader();

            if(tabController.getTab() == 'index') {
                index.preload();
                index.initialize();
            }
            if(tabController.getTab() == 'tabs') {
                pics.preload();
                pics.gather();
            }
            if(tabController.getTab() == 'nowplaying') {
                nowplaying.preload();
                nowplaying.init();
                nowplaying.setupButtons();
            }
		}
	}
},
index = {
    preload: function() {
        $('#similar').empty().append('<div style="width: 100%; height: 25px;"><img style="margin: 0 auto;" src="images/loader.gif" width="25px" height="25px" /></div>');
    },
    initialize: function() {
        var playerTrackInfo = player.track;

        if(playerTrackInfo !== null) {
            var track = playerTrackInfo.data;

            lastFM.makeRequest(
                "artist.getSimilar",
                {
                    artist: track.artists[0].name,
                    limit: 10,
                    autocorrect: 1
                },
                function(data) {
                    uinterface.updateSimilar(
                        data.similarartists.artist
                    );
                }
            );
        }
        else {
            $('#similar').html('<div>No music playing.</div>');
        }
    }
},
nowplaying = {
    preload: function() {
        //$('#npcontainer').empty().append('<div style="width: 100%; height: 25px;"><img style="margin: 0 auto;" src="images/loader.gif" width="25px" height="25px" /></div>');
    },
    init: function() {
        var playerTrackInfo = player.track;

        if(playerTrackInfo !== null) {
            var track = playerTrackInfo.data;

            var artist = track.artists[0].name,
                song = track.name,
                album = track.album.name;

            $('#np-title').empty().append('Listening to: ' + song.decodeForHTML());
            $('#np-image-title').empty().append(artist.decodeForHTML());

            nowplaying.loadAlbums(artist);

            lastFM.makeRequest(
                "artist.getImages",
                {
                    artist: track.artists[0].name,
                    limit: 2,
                    autocorrect: 1
                },
                function(data) {
                    if(data.images.image != undefined) {
                        $('#np-image').attr("src", data.images.image[0].sizes.size[5]["#text"]);
                    }
                }
            );
        }
    },
    loadAlbums: function(artist) {

        var $npalbum = $('#np-albums').empty().hide();

        var search                  = new models.Search('artist:"'+ artist +'"');
            search.localResults     = models.LOCALSEARCHRESULTS.IGNORE;
            search.searchPlaylists  = false;
            search.searchAlbums     = true;
            search.pageSize         = 9;

            search.observe(models.EVENT.CHANGE, function(result) {

                var i = 0;

                $.each(result.albums, function(index, album) {

                    var playlist = new models.Playlist();

                    models.Album.fromURI(album.uri, function(album) {
                        $.each(album.tracks, function(index, track) {
                            playlist.add(track);
                        });

                        $npalbum.append('<div id="player_' + i +  '" class="np-mini"></div>');
                        if(i % 3 == 2) {
                            $npalbum.append('<div style="clear: both;"></div>');
                        }
                        uinterface.buildPlayer($('#player_' + i), playlist);
                        i++;
                    });
                });

                $npalbum.fadeIn(1500);
            });

            search.appendNext();
    },
    setupButtons: function() {
        $('#next').off().on('click', function(e) {
            player.next();
        });

        $('#previous').off().on('click', function(e) {
            player.previous();
        });
    }
},
pics = {
    preload: function() {
        $('#container').empty().append('<div style="width: 100%; height: 25px;"><img style="margin: 0 auto;" src="images/loader.gif" width="25px" height="25px" /></div>');
    },
    gather: function() {
        var playerTrackInfo = player.track;

        if(playerTrackInfo !== null) {
            var track = playerTrackInfo.data;

            lastFM.makeRequest(
                "artist.getImages",
                {
                    artist: track.artists[0].name,
                    limit: 10,
                    autocorrect: 1
                },
                function(data) {
                    pics.handleData(data);
                }
            );
        }
        else {
            $('#container').empty().html('<div>No music playing.</div>');
        } 
    },
    handleData: function(data) {
        var $container = $('#container').empty(),
            cache = '';

        if(data.images.image != undefined) {
            $.each(data.images.image, function(index, image) {
                cache = cache + '<div class="item"><img src="' + image.sizes.size[5]["#text"] + '" alt=""></div>'
            });

            var $cache = $(cache);
            $container.hide().append($cache).imagesLoaded(function(){
                $container.masonry({
                    itemSelector : '.item',
                    columnWidth : 252,
                    isAnimated: !Modernizr.csstransitions, //true,
                    isResizable: false
                });
            });

            $container.masonry('reload');
            $container.fadeIn();
        }
    }
},
uinterface = {
    updateSimilar: function(artists) {
        var element = $('#similar'),
            i = 0;

        $.each(artists, function(index, artist) {
            var name = artist.name;

            var search                  = new models.Search('artist:"'+ name +'"');
                search.localResults     = models.LOCALSEARCHRESULTS.IGNORE;
                search.searchPlaylists  = false;
                search.searchAlbums     = false;
                search.pageSize         = 10;

                search.observe(models.EVENT.CHANGE, function(result) {
                    var playlist = new models.Playlist(),
                        tracks = [],
                        a = 0;    

                    result.tracks.forEach(function(track) {
                        playlist.add(track);
                        tracks[a] = track;
                        a++;
                    });
                    if(playlist.data.length != 0 && i < 5) {
                        if(i == 0) {
                            element.empty().hide();
                        }
                        uinterface.buildArtistWrapper(element, result._artists[0], tracks, i);
                        uinterface.buildPlayer(element, playlist);
                        uinterface.buildList(element, playlist);
                        element.fadeIn(1500);
                        i++;
                    }
                });

                search.appendNext();
        });
    },
    buildArtistWrapper: function(element, artist, tracks, i) {

        var html = '<div class="similar-artist-wrapper">'
                 + '<div class="similar-artist-cover"><div class="sp-image image sp-image-loaded" style="background-image: url(../images/loader.gif); "></div></div>'
                 + '<h1 id="similar-title" class="sp-text-truncate">'+ artist.data.name.decodeForHTML() +'</h1>'
                 + '<button style="display: hide;" id="subscribe_' + i + '" class="sp-button sp-icon"><span class="sp-plus"></span>Subscribe</button>'
                 + '</div>';

        element.append(html);

        $('#subscribe_' + i).on('click', function() {
            var playlist = new models.Playlist(artist.name);
                playlist.subscribed = true;

                $.each(tracks, function(index, track){
                    playlist.add(track);
                });
        });

        var simCover = $('.similar-artist-wrapper:last-child .similar-artist-cover');
        var cover = artist.data.portrait || 'sp://import/img/placeholders/300-album.png';

        lastFM.makeRequest(
            "artist.getImages", 
            {
                artist: artist.data.name,
                limit: 1,
                autocorrect: 1
            },
            function(data) {
                if(data.images.image != undefined) {
                    cover = data.images.image.sizes.size[2]["#text"];
                }
                var coverImage = new views.Image(cover);
                    coverImage.node.classList.add('image');

                simCover.empty().append(coverImage.node);
            }
        );
        

        /*
        var cov = artist.data.portrait || 'sp://import/img/placeholders/300-album.png';
        var coverImage = new views.Image(cov);
            coverImage.node.classList.add('image');

        simCover.empty().append(coverImage.node);
        */
    },
	updateHeader: function() {
		var playerTrackInfo = player.track,
            cover = 'sp://import/img/placeholders/300-album.png';

		var metaTitle 	 = $('#meta-title'),
			metaDetails  = $('#meta-details'),
			buttonShare  = $('#button-share'),
			metaCover    = $('#cover'),
			metaHeader	 = $('#header');

        if(playerTrackInfo !== null) {
        	var track = playerTrackInfo.data;

        	if(track.album.cover != "") {
        		cover = track.album.cover;
        	}

        	var _metaTitleData   = '<a href="' + track.album.uri + '">' + track.album.name.decodeForHTML() + '</a>'
        						 + '<span>(' + track.album.year + ')</span>',
        		_metaDetailsData = 'van <a href="' + track.artists[0].uri +  '">' + track.artists[0].name.decodeForHTML() + '</a>',
        		_buttonShareData = '<span class="sp-share"></span>Share';

        	metaTitle.empty().append(_metaTitleData);
        	metaDetails.empty().append(_metaDetailsData);

            if(track.album.uri !== '') {
        	   buttonShare.empty().append(_buttonShareData).show().off().on(
        		  'click', 
        		  function(e) {
        		  	   events.buttonShare(e, track.album.uri);
        		  }
        	   );
            }
        }
        else {
        	var _metaTitleData = 'Nothing Playing',
        		_metaDetailsData = 'Listen to music to get started';

        	metaTitle.empty().append(_metaTitleData);
        	metaDetails.empty().append(_metaDetailsData);
        	buttonShare.empty().hide().off();
        }

        var coverImage = new views.Image(cover);
        	coverImage.node.classList.add('image');

        metaCover.empty().append(coverImage.node);
        metaHeader.show();
    },
    buildPlayer: function(element, playlist) {
    	var playerView = new views.Player();
    		playerView.track = null;
    		playerView.context = playlist;

    	element.append(playerView.node);

    },
    buildList: function(element, playlist) {
    	var listView = new views.List(playlist, function (track) {
    		return new views.Track(
    			track, 
    			views.Track.FIELD.STAR |
                views.Track.FIELD.SHARE |
                views.Track.FIELD.NAME |
                views.Track.FIELD.ARTIST |
                views.Track.FIELD.DURATION |
                views.Track.FIELD.ALBUM
            );
        });
        listView.node.classList.add('sp-light');

        element.append(listView.node);
        element.append('<div style="margin: 5px 0; display: block; clear: both;">&nbsp;</div>');
    }
},
share = {
	show: function(element, pos, albumUri) {
		sp.social.showSharePopup(
			Math.floor(pos.left + element.offsetWidth / 2), 
			Math.floor(pos.top + element.offsetHeight / 2), 
			albumUri
		);
	},
	findPosition: function(element) {
		var left = 0, 
            top = 0;

        while(element) {
            left += element.offsetLeft;
            top  += element.offsetTop;
            element = element.offsetParent;
        }

        return { 
            left : left, 
            top : top 
        };
	}
},
events = {
	buttonShare: function(e, albumUri) {
		var element = e.target,
			pos = share.findPosition(element);
		share.show(
			element, 
			pos,
			albumUri
		);
	}
},
lastFM = {
    makeRequest: function(method, args, callback) {
        args.api_key = "5b4fd72687988105290e967d5e193183";
        args.format = "json";
        args.method = method;
        
        //console.log("LASTFM: " + "http://ws.audioscrobbler.com/2.0/", args);
        $.ajax({
            dataType: "jsonp",
            cache: false,
            data: args,
            url: "http://ws.audioscrobbler.com/2.0/",
            success: function (data) {
                if (lastFM.checkResponse(data)) {
                    callback(data);
                } else {
                    console.error("LASTFM: makeRequest bailed");
                }
            },
            error: function (jqxhr, textStatus, errorThrown) {
                console.error("LASTFM: Problem making request", jqxhr); 
                console.error(textStatus);
                console.error(errorThrown);
            }       
        });
    },
    checkResponse: function(data) {
        if (data.error) {
            console.error("Error from Last.FM: (" + data.error + ") " + data.message);
            return false;
        } else {
            return true;
        }
    }
}


exports.init = function() {
	models.application.observe(
		models.EVENT.ARGUMENTSCHANGED, 
		tabController.argChanged
	);
	models.player.observe(
		models.EVENT.CHANGE, 
		uplayer.eventChanged
	);

	tabController.initialize();
	uinterface.updateHeader();
}
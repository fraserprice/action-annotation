var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var jQuery = require('jQuery');
var fs = require('fs');
var underscore = require('underscore');

(function(){
	angular
		.module('app', ['ngMaterial', 'ngAnimate', 'vjs.video', 'ui.bootstrap', 'ui.bootstrap.typeahead'])
		.controller('AppController', ['$scope', '$interval', 'logger', 'dialog', 'path', AppController]);


	class Video {
		constructor(fn) {
			var self = this;
			self.path = fn;
			self.name = path.basename(fn);
			self.complete = false;
		}
	}

	function AppController($scope, $interval, logger, dialog, path) {
		var app = this;
		app.videoIdx = 0;
		app.labels = [];
		app.labelText = '';
		app.data = {};
		app.videos = [];
		app.filename = undefined;
		// app.autosave = undefined;
		app.AUCVLfilters = [
			{name: 'AUC Video Labeling File (*.aucvl)', extensions: ['aucvl']}
		];

		app.currentVideo = undefined;
		app.classifyText = '';

		$scope.mediaToggle = { sources: [] };

		$scope.player = undefined;
		app.currentTime = undefined;

    //listen for when the vjs-media object changes
    $scope.$on('vjsVideoMediaChanged', function (e, data) {
      console.log('vjsVideoMediaChanged event was fired');
    });

		Mousetrap.bindGlobal(['ctrl+k', 'command+k'], function() {
			$scope.player.pause();
			jQuery("#classifyText").focus();
		});


		Mousetrap.bindGlobal(['ctrl+n', 'command+n'], function() {
			app.newVideos();
		});

		Mousetrap.bindGlobal(['ctrl+l', 'command+l'], function() {
			jQuery("#labelText").focus();
		});

		Mousetrap.bindGlobal(['ctrl+left', 'command+left', 'left'], function() {
			if ($scope.player) {
				$scope.player.currentTime(app.currentTime - 0.05);
                app.currentTime -= 0.05;
			}
		});

		Mousetrap.bindGlobal(['ctrl+right', 'command+right', 'right'], function() {
			if ($scope.player) {
				$scope.player.currentTime(app.currentTime + 0.05);
				app.currentTime += 0.05;
			}
		});

        Mousetrap.bindGlobal(['ctrl+down', 'command+down', 'down'], function() {
            if ($scope.player) {
                $scope.player.currentTime(app.currentTime + 0.2);
                app.currentTime += 0.2;
            }
        });

        Mousetrap.bindGlobal(['up', 'ctrl+up', 'command+up'], function() {
            if ($scope.player) {
                app.labelVideo();
            }
        });

        Mousetrap.bindGlobal(['n'], function() {
            if(app.videoIdx < app.videos.length - 1) {
            	app.toggleComplete();
            	app.selectVideo(app.videoIdx + 1);
			}
        });

        Mousetrap.bindGlobal(['b'], function() {
            if(app.videoIdx > 0) {
                app.selectVideo(app.videoIdx - 1);
                app.toggleComplete();
            }
        });

		Mousetrap.bindGlobal(['ctrl+p', 'command+p', 'space'], function() {
			if ($scope.player) {
				console.log($scope.player.paused());
				if ($scope.player.paused()) {
					$scope.player.play();
				} else {
					$scope.player.pause();
				}
			}
		});

		$scope.$on('vjsVideoReady', function (e, data) {
				$scope.player = data.player;
    });

		// Update Time Clock (top right side)
		$interval(function () {
			if ($scope.player != undefined && !$scope.player.paused()) {
				app.currentTime = $scope.player.currentTime();
			}
		}, 100);

		// Autosave
		$interval(function () {
			if (app.filename != undefined) {
				app.saveProject();
			}
		}, 5000);

		app.generateDataset = function() {

		};

		app.newProject = function() {
			var path = dialog.showSaveDialog({
				'defaultPath': 'Project.aucvl',
				filters: app.AUCVLfilters
			});
			app.filename = path;
		};

		app.existingProject = function() {
			var result = dialog.showOpenDialog({
				'defaultPath': 'Project.aucvl',
				filters: app.AUCVLfilters
			});
			if (result) {
				app.filename = result[0];
				app.loadProject();
			}
		};

		app.loadProject = function() {
			try {
				data = fs.readFileSync(app.filename);
				data = JSON.parse(data);

				app.labels = data['labels'];
				app.data = data['data'];
				app.videos = data['videos'];
				app.videoIdx = data['video_id'];
                if(app.labels.length > 0) {
                    app.classifyText = app.labels[0];
                }
				app.selectVideo(app.videoIdx);
			} catch (e) {
				app.filename = undefined;
				throw e;
			}
		};

		app.saveProject = function() {
			fs.writeFile(app.filename, JSON.stringify({
				'labels': app.labels,
				'data': app.data,
				'videos': app.videos,
				'video_id': app.videoIdx
			}), function(err) {
			    if(err) {
			        return console.log(err);
			    }

			    console.log("The file was saved!");
			});
		};

		app.newLabel = function() {
			if (app.labels.indexOf(app.labelText) < 0) {
				app.labels.push(app.labelText);
			}

            app.classifyText = app.labelText;
			app.labelText = '';
		};

		app.removeLabel = function(labelIdx) {
			app.labels.splice(labelIdx, 1);
		};

		app.toggleComplete = function() {
			app.currentVideo.complete = !app.currentVideo.complete;
		};

		app.deleteVideo = function() {
			var vidIdx = app.videos.indexOf(app.currentVideo);
			app.videos.splice(vidIdx, 1);
			app.currentVideo = undefined;
		};

		app.newVideos = function() {
			var videos = dialog.showOpenDialog({
				properties: ['openFile', 'multiSelections']
			});

			if (videos == undefined) {
				return;
			}

			for (var i = 0; i < videos.length; i++) {
				var vid = new Video(videos[i]);

				if (vid.name in app.data) {
					app.data[vid.name] = {};
				}
				app.videos.push(vid);
			}

			console.log(app.videos);
		};

		app.setVideo = function() {
			// var video = ;
			// var source = jQuery('<source>', {'src': "file://"+app.currentVideo.path});
			// console.log(jQuery);
			// console.log(source);
			// console.log(jQuery("#videoPlayer"));
			console.log("Setting Video ...");
			app.currentTime = 0;
			$scope.player = undefined;

			var mediaObj = { sources: [{ type: "video/mp4", src: "file://"+app.currentVideo.path }] };

			// if ($scope.mediaToggle['sources'].length > 0) {
			// 	$scope.mediaToggle['sources'].splice(0,1);
			// }
			// $scope.mediaToggle['sources'].push();

			$scope.mediaToggle = mediaObj;

			if (!(app.currentVideo.name in app.data)) {
				app.data[app.currentVideo.name] = [];
			}
		};

		app.selectVideo = function(idx) {
			app.currentVideo = app.videos[idx];
            app.videoIdx = idx;
			app.setVideo();
		};

		app.autoLabelVideo = function() {
            if(app.currentVideo == undefined) return;
		};

		app.labelVideo = function() {
			if(app.currentVideo == undefined) return;
			// Check if placeholder is not an array!
			if(!Array.isArray(app.data[app.currentVideo.name])) {
				app.data[app.currentVideo.name] = []
			}

			app.data[app.currentVideo.name].push({
				'time': app.currentTime,
				'label': app.classifyText
			});

			// Sort Values
			app.data[app.currentVideo.name].sort(function(a, b) {
			    return parseFloat(b['time']) - parseFloat(a['time']);
			});

			jQuery("#classifyText").blur();
			//app.classifyText = '';
			//$scope.player.play();
		};

		app.removeVideoLabel = function(idx) {
			app.data[app.currentVideo.name].splice(idx, 1);
		}
	}

})();

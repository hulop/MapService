/*******************************************************************************
 * Copyright (c) 2014, 2017 IBM Corporation, Carnegie Mellon University and
 * others
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 ******************************************************************************/
if (location.search.substr(1).split('&').indexOf('playback') != -1) {
	var args = {};
	location.search.substr(1).split('&').forEach(function(arg) {
		if (arg) {
			var kv = arg.split('=');
			args[kv[0]] = kv.length > 1 ? kv[1] : '';
		}
	});
	var fileText = null, lastContent = [];

	function map_page_init() {
		$('#playback_button').show();
		$hulop.util.isSpeaking = function(callback) {
			setTimeout(function() {
				callback(false);
			})
		};
	}

	function playback_init() {
		$('#file-chooser').on('change', function(e) {
			fileText = null;
			if (this.files.length > 0) {
				var file = this.files[0];
				if (file) {
					console.log(file);
					var fr = new FileReader();
					fr.addEventListener('load', function(e) {
						fileText = fr.result;
					});
					fr.readAsText(file);
				}
			}
		});
		$('#play_file').on('click', function(e) {
			$hulop.location && $hulop.location.clearWatch(); // Stop browser
			// location
			lastContent.length = 0;
			if (fileText) {
				playback(lastContent = fileText.split('\n').filter(function(line) {
					return !line.match(/ (Acc|Motion|Beacon),/)
				}));
			}
		});
	}

	function playback(content) {
		$hulop.map.setSync(true);
		$('body').pagecontainer && $('body').pagecontainer('change', '#map-page');
		console.log(content.length + ' lines');
		var baseTime = 0, lastCenter = 0, startTime = new Date().getTime();
		var toName;
		var naviStarted = false;
		var speed = args.speed || 1;
		console.log('Start of playback');
		function handler() {
			while (content.length > 0) {
				var line = content.shift();
				if (line.length > 23) {
					// var time = new Date(line.substr(0, 23)).getTime();
					var dt = line.substr(0, 23).split(/[- :.]/).map(Number);
					var time = new Date(dt[0], dt[1] - 1, dt[2], dt[3], dt[4], dt[5], dt[6] || 0).getTime();
					baseTime == 0 && (baseTime = time);
					function getArg(prefix, json) {
						var cmd = ' ' + prefix;
						prefix = ' ' + prefix + ',';
						var pos = line.indexOf(prefix);
						if (pos != -1) {
							var text = line.substr(pos + prefix.length);
							return json ? JSON.parse(text) : text;
						}
					}
					var target = getArg('initTarget', true);
					if (target) {
						console.log(target);
						$hulop.route.callService(target, function(data, gog) {
							$hulop.map.setTarget($hulop.util.newLatLng(target.lat, target.lng), target.dist);
							$hulop.map.initTarget(data, gog);
							handler();
						});
						return;
					}
					var fromTo = getArg('Route');
					if (fromTo) {
						console.log(fromTo);
						toName = fromTo.split(',')[1];
					}
					var route = getArg('showRoute', true);
					if (route) {
						console.log(route);
						$('#to').val(route.to);
						if ($('#to').val() != route.to && toName) {
							var options = $('#to option');
							for (var i = 0; i < options.length; i++) {
								var e = $(options[i]);
								if (e.text() == toName) {
									$('#to').val(route.to = e.val());
									break;
								}
							}
						}
						try {
							$('#to').selectmenu();
							$('#to').selectmenu('refresh', true);
						} catch (e) {
							console.error(e);
						}
						$hulop.route.callService(route, function(data, startInfo) {
							$hulop.map.showRoute(data, startInfo, true);
							// if (data.length > 0) {
							handler();
							// }
						});
						naviStarted = false;
						return;
					}
					var center = getArg('mapCenter');
					if (center) {
						console.log('(mapCenter: ' + center + ')');
						if ($('#end_navi').is(':visible')) {
							naviStarted = true;
						} else if (naviStarted) {
							continue;
						}
						var args = center.split(',');
						var wait = Math.min(naviStarted && lastCenter > 0 ? time - lastCenter : 0, 3 * 1000);
						var floor = Number(args[2]);
						if (floor > 0) {
							floor--;
						}
						setTimeout(function() {
							$hulop.location.showLocation({
								'provider' : 'logplay',
								'timestamp' : new Date().getTime(),
								'latitude' : Number(args[0]),
								'longitude' : Number(args[1]),
								'floor' : floor,
								'accuracy' : 5
							});
							handler();
						}, wait / speed);
						lastCenter = time;
						return;
					}
					var speak = getArg('speak');
					if (speak) {
						console.log('(speak: ' + speak + ')');
					}
				}
			}
			console.log('End of playback');
		}
		handler();
	}

	if ($('#map-page').length) {
		map_page_init();
	} else {
		$(document).on('pageinit', '#map-page', map_page_init);
	}

	if ($('#playback').length) {
		playback_init();
	} else {
		$(document).on('pageinit', '#playback', playback_init);
	}
}

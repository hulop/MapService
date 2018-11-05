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
window.$hulop || eval('var $hulop={};');

setTimeout(function() {
	$hulop.mobile_location = true;
}, 5 * 1000);

$hulop.mobile_ready = function(bridge) {
	$hulop.mobile = function() {
		/**
		 * Mobile javascript functions
		 * 
		 */

		var preferences = {};
		var lastXYZ = 0, lastOrientationXYZ = 0;
		var lastAnchor, lastRotate, loggingNavi;

		function speak(text, flush) {
			bridge.speak && bridge.speak(text, flush);
			logText('speak,' + text);
		}

		function isSpeaking(callback) {
			bridge.isSpeaking && bridge.isSpeaking(tempCallback(callback));
		}

		function startRecognizer(callback) {
			bridge.startRecognizer && bridge.startRecognizer(tempCallback(callback));
		}

		function tempCallback(callback) {
			for (var i = 0; i < 100; i++) {
				var id = 'temp' + i;
				if (!$hulop.mobile.callback[id]) {
					$hulop.mobile.callback[id] = function() {
						callback.apply(window, arguments);
						delete $hulop.mobile.callback[id];
					}
					return id;
				}
			}
		}

		function getPreference(key, defValue) {
			var value = preferences[key];
			return typeof (value) == 'undefined' ? defValue : value;
		}

		function mapCenter(latlng, floor, sync, mapLatlng) {
			var lat = latlng[1], lng = latlng[0];
			var mapLat = mapLatlng ? mapLatlng[1] : lat;
			var mapLng = mapLatlng ? mapLatlng[0] : lng;
			bridge.mapCenter && bridge.mapCenter(mapLat, mapLng, floor, sync);
			loggingNavi && logText('mapCenter,' + lat + ',' + lng + ',' + floor + ',' + sync);
		}

		function logText(text) {
			bridge.logText && bridge.logText(text);
			if (text == 'startNavigation') {
				loggingNavi = true;
			} else if (text == 'endNavigation') {
				loggingNavi = false;
			}
		}

		function vibrate(pattern) {
			if (!bridge.vibrate) {
				return;
			}
			if (typeof (pattern) == 'number') {
				bridge.vibrate();
			} else {
				for (var i = 0; i < 3; i++) {
					setTimeout(function() {
						bridge.vibrate();
					}, i * 1000);
				}
			}
		}

		/*
		 * Callback functions
		 */
		function onData(provider, dataList) {
			if (provider == 'XYZ') {
				lastAnchor = $hulop.util.newLatLng(dataList.anchor);
				lastRotate = dataList.rotate || 0;
				$hulop.location.updateLocation({
					'provider' : 'bleloc',
					'timestamp' : new Date().getTime(),
					'latitude' : dataList.lat,
					'longitude' : dataList.lng,
					'floor' : dataList.floor,
					'accuracy' : dataList.accuracy || 5
				});
				lastXYZ = new Date().getTime();
				if (dataList.orientation != 999) {
					var angle = isNaN(dataList.orientation) ? undefined : (lastRotate + 90) * Math.PI / 180 - dataList.orientation;
					$hulop.location.updateOrientation(angle);
					$hulop.map.updateCenterOrientation(angle);
					lastOrientationXYZ = lastXYZ;
				}
				showDebugInfo(dataList);
				initBiasButon();
				$hulop.mobile_location = true;
				return;
			}
			if (dataList.length > 0) {
				switch (provider) {
				case 'OS':
					if ($hulop.localize && $hulop.localize.getLocation()) {
						break;
					}
					if (new Date().getTime() < lastXYZ + 30 * 1000) {
						break;
					}
					dataList.sort(function(a, b) {
						return a.accuracy - b.accuracy;
					});
					$hulop.location.updateLocation(dataList[0]);
					break;
				case 'WiFi':
				case 'BLE':
					getPreference('developer_mode') && $hulop.localize && $hulop.localize.onData(provider, dataList);
					break;
				case 'Sensor':
					if (new Date().getTime() < lastOrientationXYZ + 30 * 1000) {
						break;
					}
					for (var i = 0; i < dataList.length; i++) {
						var data = dataList[i];
						if (data.type == 'ORIENTATION') {
							var angle = isNaN(data.z) ? undefined : -data.z;
							$hulop.location.updateOrientation(angle);
							$hulop.map.updateCenterOrientation(angle);
							break;
						}
					}
					break;
				}
			}
		}

		function onPreferences(prefs) {
			preferences = prefs;
			$hulop.util.onPrefChange();
		}

		var heatmap, pointArray;

		function showDebugInfo(dataList) {
		}

		function requestBias(latlng) {
			var floor = $hulop.indoor && $hulop.indoor.getCurrentFloor() || 0;
			if (floor > 0) {
				floor--;
			}
			logText('getRssiBias,' + JSON.stringify({
				'lat' : latlng[1],
				'lng' : latlng[0],
				'floor' : floor
			}));
		}

		var biasButton;
		function initBiasButon() {
			// deprecated
		}

		return {
			'speak' : speak,
			'isSpeaking' : isSpeaking,
			'startRecognizer' : startRecognizer,
			'getPreference' : getPreference,
			'mapCenter' : mapCenter,
			'logText' : logText,
			'vibrate' : vibrate,
			'callback' : {
				'onData' : onData,
				'onPreferences' : onPreferences
			}
		};

	}();
	bridge.setCallback && bridge.setCallback('$hulop.mobile.callback');
	$hulop.location && $hulop.location.clearWatch(); // Stop browser location
}

window.mobile_bridge && $hulop.mobile_ready(mobile_bridge);

$(document).on('pageinit', function(event) {
	var pageId = event.target.id;
	switch (pageId) {
	case 'map-page':
		console.log("hide header");
		if (location.search.substr(1).split('&').indexOf('noheader') != -1) {
			$('#map-page [data-role="button"]').css("position", "absolute").css("top", "-1000px");
			$('#map-page .ui-title').hide();
			$("#map-page").trigger("resize");
		}
		break;
	default:
		if (location.search.substr(1).split('&').indexOf('noclose') != -1) {
			console.log("hide close and back");
			$('#' + pageId + ' [data-rel="close"],[data-rel="back"]').css("position", "absolute").css("top", "-1000px");
		}
		break;
	}
});

(function() {
	var args, lastNavigate = {
		'time' : 0,
		'node' : ''
	};
	function hashChange() {
		args = {};
		location.hash.substr(1).split('&').forEach(function(arg) {
			if (arg) {
				var kv = arg.split('=');
				args[kv[0]] = kv.length > 1 ? kv[1] : '';
			}
		});
		navigate();
	}

	function navigate() {
		if (args.navigate) {
			var map = $hulop.map && $hulop.map.getMap();
			if (!map) {
				setTimeout(navigate, 1000);
				return;
			}
			if (!$hulop.mobile_location) {
				setTimeout(navigate, 100);
				return;
			}
			var now = new Date().getTime();
			if (args.navigate == lastNavigate.node && now < lastNavigate.time + 30 * 1000) {
				return;
			}
			lastNavigate.time = now;
			lastNavigate.node = args.navigate;
			var prefs = $hulop.util.getPreferences();
			for ( var key in args) {
				prefs[key] = args[key];
			}
			var center = $hulop.map.getCenter();
			var dist = prefs.dist || 250;
			var from = 'latlng:' + center[1] + ':' + center[0];
			var to = args.navigate;
			var floor = $hulop.indoor && $hulop.indoor.getCurrentFloor() || 0;
			if (floor != 0) {
				from += ':' + floor;
			}
			var target = {
				'action' : 'start',
				'lat' : center[1],
				'lng' : center[0],
				'dist' : dist
			};
			var route = {
				'action' : 'search',
				'preferences' : JSON.stringify(prefs),
				'from' : from,
				'to' : to
			};
			console.log(args);
			console.log(target);
			console.log(route);
			$hulop.route.callService(target, function(data) {
				$hulop.map.setTarget(center, dist);
				$hulop.map.initTarget(data);
				$hulop.route.callService(route, function(data, startInfo) {
					$('#to').val(to);
					try {
						$('#to').selectmenu();
						$('#to').selectmenu('refresh', true);
					} catch (e) {
						console.error(e);
					}
					$hulop.util.logText("Route," + $('#from option:selected').text() + "," + $('#to option:selected').text());
					$hulop.util.logText("initTarget," + JSON.stringify(target));
					$hulop.util.logText("showRoute," + JSON.stringify(route));
					$hulop.map.showRoute(data, startInfo, 5000);
					$("#map-page").trigger("resize");
				});
			});
		}
	}

	addEventListener('hashchange', hashChange, false);
	hashChange();
})();

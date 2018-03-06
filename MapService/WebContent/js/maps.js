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

$.ajaxSetup({
	'cache' : false,
	'timeout' : 60 * 1000
});

$hulop.config = {};

$hulop.map = function() {
	/**
	 * Map related functions TODO need further categorization
	 * 
	 */
	var APPROACH_DIST = [ 200, 100, 50, 30, 14 ], ARRIVE_DIST = 6, SNAP_DIST = [ 8, 3, 2, 1 ], REROUTE_DIST = 12;
	var SNAP_RATIO = 0, SNAP_BACK = 5 / 2;
	var POI_ANNOUNCE_DIST = 10, NEXT_ANNOUNCE_DIST = 10, NEXT_DETAIL_DIST = 10, NEXT_ELEVATOR_DIST = 25, NO_SOON_DIST = 10;
	var map, currentLatLng, currentDist, currentStep, suppressAnnounce = 0, supressError = 0, lastErrorPos, rerouting, lastAdjust, lastTo;
	var naviRoutes = [], routeReady, spokenDistance = Number.MAX_VALUE, minSpokenDistance = Number.MAX_VALUE, naviCondition = {};
	var sync = true, rotationMode = 1, lastShowResult = false, landmarks;
	var playback = location.search.substr(1).split('&').indexOf('playback') != -1;
	var listeners = {};
	var lastAnnounce, lastStep, lastSearchTo;

	var format = new ol.format.GeoJSON()

	var routeLayer = new ol.layer.Vector({
		'source' : new ol.source.Vector(),
		'style' : $hulop.route.getStyle,
		'zIndex' : 101
	});

	var labelLayer = new ol.layer.Vector({
		'source' : new ol.source.Vector(),
		'style' : function(feature) {
			var floor = $hulop.indoor && $hulop.indoor.getCurrentFloor() || 0;
			if (feature.get('floor') == floor) {
				return new ol.style.Style({
					'image' : new ol.style.Circle({
						'radius' : 10,
						'stroke' : new ol.style.Stroke({
							'color' : 'blue',
							'width' : 2
						})
					}),
					'text' : new ol.style.Text({
						'textAlign' : 'center',
						'textBaseline' : 'middle',
						'text' : feature.get('title'),
						'fill' : new ol.style.Fill({
							'color' : 'black'
						}),
						'stroke' : new ol.style.Stroke({
							'color' : 'white',
							'width' : 3
						})
					})
				});
			}
		},
		'zIndex' : 103
	});

	function init() {
		if (!$hulop.messages.ready()) {
			console.log('waiting messages ready')
			setTimeout(init);
			return;
		}
		console.log('init OpenLayers');
		$hulop.util.loadPreferences();
		console.log('map init')
		map = new ol.Map({
			'layers' : [ routeLayer, labelLayer ],
			'target' : 'map',
			'controls' : ol.control.defaults({
				'zoom' : false
			}),
			'interactions' : ol.interaction.defaults({
				'shiftDragZoom' : false
			}),
			'view' : new ol.View({
				'zoom' : 19.5
			})
		});

		$.ajax({
			'type' : 'get',
			'url' : 'api/config',
			'dataType' : 'json',
			'success' : function(data) {
				console.log(data);
				$hulop.config = data;
				initCenter();
				initTile();
				initRotationMode();
				map.on('moveend', saveCenter);
			},
			'error' : function(XMLHttpRequest, textStatus, errorThrown) {
				console.error(textStatus + ' (' + XMLHttpRequest.status + '): ' + errorThrown);
			}
		});
		initCenter();

		/* Event listeners */
		$('.ol-attribution').on('click', function() {
			if (naviRoutes.length > 0) {
				return false;
			}
		});
		$('#search').on('click', function(e) {
			e.preventDefault();
			doSearch();
		});

		$hulop.indoor && $hulop.indoor.loadOverlays();
		if ($hulop.util.isMobile()) {
			$hulop.location.watchLocation(function(latlng, floor) {
				if ($('.floorToggle').is(':visible') && typeof (floor) == 'number') {
					floor = Math.round(floor);
					if (floor >= 0) {
						floor++;
					}
					if ($hulop.indoor.getCurrentFloor() != floor) {
						$hulop.indoor.showFloor(floor);
					}
				}
				sync ? setCenter(latlng) : onLocationChanged();
			}, function(latlng) {
				return latlng;
			});
			map.on('moveend', onLocationChanged);
			map.on('pointerdrag', function() {
				setSync(false);
			});
			var myLocation = $('<div>', {
				'class' : 'my_location_button ol-unselectable ol-control RIGHT_CENTER',
				'css' : {
					'display' : 'none'
				}
			}).append($('<a>', {
				'text' : $m('MY_LOCATION'),
				'href' : '#',
				'class' : 'ui-btn ui-mini ui-shadow ui-corner-all ui-btn-icon-top ui-icon-my-location',
				'css' : {
					'margin' : '0px'
				},
				'on' : {
					'click' : function(e) {
						e.preventDefault();
						e.target.blur();
						restoreSync();
					}
				}
			}));
			map.addControl(new ol.control.Control({
				'element' : myLocation[0]
			}));
			var instruction = $('<div>', {
				'class' : 'instruction ol-unselectable ol-control LEFT_BOTTOM',
				'css' : {
					'display' : 'none'
				}
			}).append($('<a>', {
				'text' : $m('ROUTE'),
				'href' : '#',
				'class' : 'ui-btn ui-mini ui-shadow ui-corner-all ui-btn-icon-top ui-icon-bullets',
				'css' : {
					'margin' : '0px'
				},
				'on' : {
					'click' : function(e) {
						e.preventDefault();
						e.target.blur();
						$('#floor_instructions').html(getInstructions());
						showPage('#confirm_floor');
					}
				}
			}));
			map.addControl(new ol.control.Control({
				'element' : instruction[0]
			}));
			addRemainDist();
			var up = $('<div>', {
				'class' : 'ol-unselectable ol-control RIGHT_TOP'
			}).append($('<a>', {
				'href' : '#',
				'id' : 'rotate-up-button',
				'class' : 'ui-btn ui-mini ui-shadow ui-corner-all ui-btn-icon-top ui-icon-head-up',
				'css' : {
					'margin' : '0px',
					'width' : '44px',
					'height' : '44px',
					'padding' : '0.5625em'
				},
				'on' : {
					'click' : function(e) {
						e.preventDefault();
						e.target.blur();
						setRotationMode((rotationMode + 1) % 3);
					}
				}
			}));
			map.addControl(new ol.control.Control({
				'element' : up[0]
			}));
			$('.ol-rotate-reset').on('click', function() {
				setRotationMode(0);
			});
			function refreshFeature() {
				var center = getCenter();
				var dist = getDist();
				if (dist != currentDist || !currentLatLng || $hulop.util.computeDistanceBetween(center, currentLatLng) > dist * 0.9) {
					initFeatures(center);
				} else {
					sortLandmarks();
				}
			}

			$('a[href="#control"]').on('click', refreshFeature);
			$('#refresh_to').on('click', function(event) {
				event.preventDefault();
				event.target.blur();
				initFeatures(getCenter());
			});
			$('a[href="#map-page"]').on('click', function(event) {
				$hulop.util.getPreferences();
			});
			$('#end_navi').on('click', function(event) {
				event.preventDefault();
				$hulop.util.logText("endNavigation");
				$hulop.logging && $hulop.logging.onData({
					"event" : "navigation",
					"status" : "cancel",
					"timestamp" : new Date().getTime()
				});
				clearRoute();
			});
			$('#confirm_yes').on('click', function(event) {
				event.preventDefault();
				startNavigation();
			});
			$('#confirm_no').on('click', function(event) {
				clearRoute();
			});
			$('#wheelchair_mode').on('change', function(event) {
				event.preventDefault();
				try {
					$('#preset').val(this.checked ? '2' : '1').change().selectmenu('refresh', true);
				} catch (e) {
				}
				doSearch(false, lastSearchTo);
			});
			$(document).on('pagecontainershow', function(event, ui) {
				var pageId = $('body').pagecontainer('getActivePage').prop('id');
				switch (pageId) {
				case 'map-page':
					resizeMap();
					break;
				}
				stateChanged();
			});
			setTimeout(stateChanged, 1000);
			$(window).on('resize', function(event) {
				resizeMap();
			});
			resizeMap();
		} else if ($hulop.editor) {
			$hulop.editor.init(function(data) {
				clearRoute();
			})
		}
	}

	function initCenter() {
		var center = loadCenter() || $hulop.config.INITIAL_LOCATION || {
			'lat' : 35.68662700502585,
			'lng' : 139.77392703294754
		};
		setCenter([ center.lng, center.lat ]);
	}

	function initRotationMode() {
		isNaN($hulop.config.INITIAL_ROTATION_MODE) || setRotationMode($hulop.config.INITIAL_ROTATION_MODE);
	}

	function initTile() {
		var tileSource, tileServer = $hulop.config.TILE_SERVER, tileAttr = $hulop.config.TILE_ATTR;
		if (tileServer) {
			if (tileServer != 'NONE') {
				tileSource = new ol.source.XYZ({
					'wrapX' : false,
					'url' : tileServer
				});
				tileAttr && tileSource.setAttributions(tileAttr);
			}
		} else {
			tileSource = new ol.source.OSM({
				'wrapX' : false
			});
		}
		if (tileSource) {
			map.addLayer(new ol.layer.Tile({
				'source' : tileSource
			}));
		}
	}

	var iconClasses = 'ui-icon-navigation ui-icon-head-up ui-icon-route-up';
	var iconLabels = 'N H R';
	function setRotationMode(mode) {
		rotationMode = mode;
		var upButton = $('#rotate-up-button');
		upButton.removeClass(iconClasses);
		upButton.addClass(iconClasses.split(' ')[rotationMode]);
		resetRotation();
	}

	var nest = 0;
	function onLocationChanged(event) {
		reportCenter();
		if (!routeReady || naviRoutes.length == 0 || suppressAnnounce + 1000 > new Date().getTime()) {
			return;
		}

		function getPOIMsg(list) {
			var msg = '';
			list.forEach(function(poi) {
				if (msg) {
					msg += ', ';
				}
				msg += poi;
			});
			return $m('SUMMARY_POI', msg);
		}

		function checkPOIStep(step) {
			var route = naviRoutes[step];
			var distance = 0;
			route.links.forEach(function(link) {
				var info = link.info;
				distance += info.length;
				if (info.poi_end && info.poi_end.length > 0) {
					console.log(distance + 'm to ' + info.poi_end);
					if (distance > POI_ANNOUNCE_DIST) {
						info.poi_announce_dist = POI_ANNOUNCE_DIST;
					}
				}
			});
		}

		function checkPOIDistance(step, pos) {
			var route = naviRoutes[step];
			route.links.forEach(function(link) {
				var info = link.info;
				if (info.poi_end && info.poi_end.length > 0 && info.poi_announce_dist) {
					var distance = $hulop.util.computeDistanceBetween(pos, info.lastDir.end);
					if (distance < info.poi_announce_dist) {
						console.log(distance + 'm to ' + info.poi_end);
						$hulop.util.speak(lastAnnounce = getPOIMsg(info.poi_end), false);
						delete info.poi_announce_dist;
					}
				}
			});
		}

		function onError(pos) {
			if (suppressError + 5 * 1000 > new Date().getTime()) {
				return;
			}
			var route = naviRoutes[currentStep];
			if (route.polyline) {
				if (!playback && !isLocationOnStep(currentStep, pos, isFloorLink() ? REROUTE_DIST * 2 : REROUTE_DIST)) {
					$hulop.util.speak($m('REROUTING'), true);
					rerouting = true;
					setTimeout(function() {
						doSearch();
					}, 3 * 1000);
				} else {
					$hulop.util.speak($m('WRONG_ROUTE'), true);
				}
				$hulop.util.vibrate([ 400, 600, 400, 600, 400 ]);
				lastErrorPos = pos;
			}
		}

		function onSuccess(pos, floor, index) {
			var route = naviRoutes[index];
			var distance = index == 0 ? 0 : $hulop.util.computeDistanceBetween(route.latlng, pos);
			var nextLatlng = route.latlng;
			var arriveDist = ARRIVE_DIST;
			if (currentStep >= 0) {
				var currentRoute = naviRoutes[currentStep];
				/* sync && */adjustRotation(pos);
				!lastAdjust && distance < $hulop.util.computeDistanceBetween(currentRoute.latlng, currentRoute.nextLatlng) && showStep(index - 1, false, 1);
				var subtotal = currentRoute.subtotal || 0;
				if (subtotal == 0) {
					distance = 0;
				} else if (index == currentStep + 1) {
					var special = currentRoute.floor != route.floor || !route.nextLatlng;
					var ext = Math.max(special ? ARRIVE_DIST / 2 : 0, ARRIVE_DIST - subtotal / 2);
					if (currentRoute.type == 4 || route.type == 4) { // escalator
						ext = 0;
					}
					if (ext > 0) {
						ext *= fixRate(index, 10 * 1000, distance);
						var heading = $hulop.util.computeHeading(currentRoute.latlng, currentRoute.nextLatlng);
						var latlng = $hulop.util.computeOffset(currentRoute.nextLatlng, ext, heading);
						distance = $hulop.util.computeDistanceBetween(nextLatlng = latlng, pos);
					}
				}
				route.next_dist_span && route.next_dist_span.text(Math.floor(distance) + 'm');
				showRemainDist(route.resttotal + distance);
			}
			lastStep = {
				'route' : route,
				'distance' : distance
			};
			$hulop.location && $hulop.location.showNextCircle(nextLatlng, arriveDist);
			if (distance < arriveDist) {
				route.next_dist_span && route.next_dist_span.empty();
				showStep(index, false);
				if (index == naviRoutes.length - 1) {
					$hulop.util.speak($m(getArrivalToken(), route.title), true);
					$hulop.util.logText("endNavigation");
					$hulop.logging && $hulop.logging.onData({
						"event" : "navigation",
						"status" : "end",
						"timestamp" : new Date().getTime()
					});
					naviCondition.end = new Date().getTime();
					$hulop.util.logText('navigationFinished,' + JSON.stringify(naviCondition));
					var longDesc = getDestinationLong(true);
					longDesc && $hulop.util.speak(longDesc, false);
					setTimeout(function () {
						var nodes = routeLayer.getSource().getFeatures().filter(function(f) {
							return f.getProperties().node_id;
						});
						clearRoute();
						nodes.length && routeLayer.getSource().addFeature(nodes[0]);
					}, 2500);
					naviRoutes = []; // disable navigation
				} else {
					var nextRoute = naviRoutes[index + 1];
					var nextElevator = getLastLinkInfo(nextRoute, 'elevator');
					var msg = distAndTitle(nextElevator ? 0 : distance, route, true);
					route.links.forEach(function(link) {
						var accInfo = link.info && link.info.accInfo;
						if (accInfo) {
							msg += ', ' + accInfo;
						}
					});
					var dist = route.subtotal;
					switch (route.type) {
					case 103: // pedestrian crossing
					case 1: // moving walkway
					case 4: // escalator,
						route.links.forEach(function(link) {
							if (link.info.type == route.type) {
								dist -= link.info.length;
							}
						});
						break;
					}
					var nextTitle = dist < NEXT_DETAIL_DIST ? nextRoute.title : distAndTitle(dist, nextRoute);
					if (!nextElevator && route.subtotal > NEXT_ANNOUNCE_DIST) {
						if (route.dir.match(/^SLIGHT_(LEFT|RIGHT)$/) && nextRoute.dir.match(/^SLIGHT_(LEFT|RIGHT)$/)) {
							msg += $m('NEXT_ROUTE', $m(route.curved ? 'CURVE_MOVE' : 'NEXT_MOVE', Math.floor(route.subtotal)));
						} else {
							msg += $m('NEXT_ROUTE', nextTitle);
						}
					}
					var old = msg;
					var afterPrefix = getLastLinkInfo(route, 'afterPrefix');
					if (afterPrefix && getLastLinkInfo(route, 'elevator')) {
						if (route.subtotal < NEXT_ELEVATOR_DIST) {
							msg = $m(afterPrefix, nextTitle);
						}
					} else {
						var prevRoute = index > 0 && naviRoutes[index - 1];
						if (prevRoute && prevRoute.subtotal < 6 && getLastLinkInfo(prevRoute, 'elevator')) {
							msg = distAndTitle(route.subtotal, nextRoute);
						}
					}
					if (old != msg) {
						console.log(old + ' -> ' + msg);
					}
					$hulop.util.speak(lastAnnounce = msg, false);
					minSpokenDistance = route.subtotal - 5;
					checkPOIStep(index);
					listeners.step && listeners.step(index, naviRoutes);
				}
				$hulop.util.vibrate(400);
				spokenDistance = Number.MAX_VALUE;
				lastErrorPos = null;
				return;
			}
			checkPOIDistance(index - 1, pos);
			listeners.distance && listeners.distance(index - 1, distance);
			var announceDist = distance;
			function checkApproach(radiusList) {
				if (lastErrorPos && isLocationOnStep(currentStep, pos, SNAP_BACK)) {
					return $m('BACK_ROUTE');
				} else if (index > currentStep + 1) {
					console.log("skipping step " + currentStep + " to " + (index - 1));
					lastAdjust = false;
					return $m('SKIP_ROUTE');
				}
				for (var i = -1; i < radiusList.length; i++) {
					var radius = i >= 0 ? radiusList[i] : Number.MAX_VALUE;
					if (distance < radius && radius <= spokenDistance) {
						if (i >= 0) {
							announceDist = radius;
						}
						return '';
					}
				}
			}
			var prefix = checkApproach(APPROACH_DIST);
			if (prefix != null) {
				lastAdjust == false && showStep(index - 1, false, 1);
				if (prefix || spokenDistance != Number.MAX_VALUE) {
					$hulop.util.speak(lastAnnounce = prefix + distAndTitle(announceDist, route, false, 10), false, !prefix);
					lastErrorPos = null;
				}
				spokenDistance = Math.min(distance, minSpokenDistance);
				minSpokenDistance = Number.MAX_VALUE;
			}
		}

		function findNextStep(pos, radiusList) {
			var floor = $hulop.indoor && $hulop.indoor.getCurrentFloor() || 0;
			var begin = Math.max(currentStep, 0);
			for (var index = 0; index < radiusList.length; index++) {
				var radius = radiusList[index];
				var i = begin + index;
				if (i < naviRoutes.length && isLocationOnStep(i, pos, index == 0 && isFloorLink() ? radius * 2 : radius)) {
					var index = currentStep < 0 ? i : Math.min(i + 1, naviRoutes.length - 1);
					if (index > currentStep) {
						var route = naviRoutes[index];
						if (floor != 0) {
							var targetDiff = $hulop.route.levelDiff(floor, route.floor) > 0.5;
							if (targetDiff) {
								var source = naviRoutes[index - 1];
								console.log('Current floor=' + floor + ', source=' + source.floor + ', target=' + route.floor);
								if (isFloorLink() && Math.min(source.floor, route.floor) <= floor && floor <= Math.max(source.floor, route.floor)) {
									return;
								}
								break;
							}
						}
						onSuccess(pos, floor, index);
					}
					return;
				}
			}
			if (currentStep < 0 || rerouting) {
				return;
			}
			if (lastErrorPos && $hulop.util.computeDistanceBetween(lastErrorPos, pos) < 10) {
				return;
			}
			onError(pos);
		}

		if (nest > 0) {
			$hulop.util.logText('error,onLocationChanged,nest=' + nest);
			return;
		}
		try {
			nest++;
			findNextStep(getCenter(), SNAP_DIST);
		} finally {
			nest--;
		}
	}

	function getLastLinkInfo(route, key) {
		return route.lastLinkInfo && route.lastLinkInfo[key];
	}

	function isFloorLink() {
		if (currentStep >= 0 && currentStep < naviRoutes.length - 1) {
			return $hulop.route.levelDiff(naviRoutes[currentStep].floor, naviRoutes[currentStep + 1].floor) > 0.5;
		}
	}

	function saveCenter() {
		if (window.localStorage) {
			window.localStorage["map_center"] = JSON.stringify({
				lat : getCenter(true)[1],
				lng : getCenter(true)[0]
			});
		}
	}

	function loadCenter() {
		if ($hulop.config.DO_NOT_USE_SAVED_CENTER) {
			return null;
		}
		
		if (window.localStorage) {
			try {
				return JSON.parse(window.localStorage["map_center"]);
			} catch (e) {
			}
		}
		return null;
	}

	function reportCenter() {
		if ($hulop.mobile) {
			var floor = $hulop.indoor && $hulop.indoor.getCurrentFloor() || 0;
			$hulop.mobile.mapCenter(getCenter(), floor, sync, getCenter(true));
		}
	}

	function showRoute(data, startInfo, replay, noNavigation) {
		lastAnnounce = lastStep = null;
		clearRoute();
		if (data.error == 'zero-distance') {
			showAlert($m('ARRIVED', ''));
			rerouting = false;
			return;
		}
		if (!isNaN(data.error)) {
			showAlert('Error: ' + data.error);
			rerouting = false;
			currentLatLng = null;
			return;
		}
		if (data.length == 0) {
			showAlert($m('NO_ROUTE'));
			rerouting = false;
			return;
		}
		var _id = data[data.length - 1]._id;
		if (_id && _id != $('#to').val()) {
			$('#to').val(_id);
			refreshSelect();
		}
		var from = startCurrentLocation();
		if (from && !startInfo && !noNavigation) {
			var to = getLatLng(data[0].geometry.coordinates);
			var dist = $hulop.util.computeDistanceBetween(from, to);
			if (dist > 25) {
				showAlert($m('FAR_ROUTE', Math.floor(dist)));
				rerouting = false;
				return;
			}
		}

		try {
			$('#wheelchair_mode').prop('checked', $hulop.util.getPreferences().preset == '2').flipswitch('refresh');
		} catch (e) {
		}
		console.log('showRoute');
		console.log(data);
		data.shift(); // Ignore start point
		var naviItem = null, lastLinkInfo = {}, subtotal = 0, curved = false, path = [], links = [], pois = [];

		function appendLabel(title, latlng, floor, dir, type) {
			var display_title = title;
			if (typeof title.title == 'string') {
				display_title = title.display_title;
				title = title.title;
			}
			if (naviItem) {
				naviItem.subtotal = subtotal;
				naviItem.curved = curved;
				naviItem.nextLatlng = latlng;
				naviItem.polyline = new ol.geom.LineString(path);
				console.log(title + ": " + path.toString());
				subtotal = 0;
				curved = false;
				path = [];
				links = [];
				pois = [];
			}
			naviRoutes.push(naviItem = {
				'display_title' : display_title,
				'title' : title,
				'latlng' : latlng,
				'floor' : floor,
				'dir' : dir,
				'type' : type,
				'links' : links,
				'pois' : pois,
				'lastLinkInfo' : lastLinkInfo
			});
		}

		// Show hokoukukan route path
		var lastDir = null;
		var accumAngle = 0;
		var linkList = data.map(function(obj, index) {
			var coords = obj.geometry.coordinates;
			if (typeof coords[0] == 'number') {
				coords = [ coords ];
			}
			var info = $hulop.route.linkInfo(obj);
			if (info && !info.elevator && coords.length > 1) {
				info.backward && coords.reverse();
				info.firstDir = $hulop.util.getDirection(getLatLng(coords[0]), getLatLng(coords[1]));
				info.lastDir = $hulop.util.getDirection(getLatLng(coords[coords.length - 2]), getLatLng(coords[coords.length - 1]));
			}
			return {
				'obj' : obj,
				'coords' : coords,
				'info' : info
			};
		});
		linkList.forEach(function(link, index) {
			var obj = link.obj, coords = link.coords, linkInfo = link.info;
			if (linkInfo) {
				var newDir, label = '', angle = 0, dir = 'STRAIGHT', type = linkInfo.type;
				var restart = lastDir == null;
				if (linkInfo.firstDir) {
					newDir = linkInfo.firstDir;
					var nextLink = linkList[index + 1];
					var shortLink = nextLink && nextLink.info && nextLink.info.elevator ? 4 : 3;
					var calcAngle = restart || linkInfo.length > shortLink;
					if (!calcAngle && linkInfo.lastDir) {
						var nextDir = nextLink && nextLink.info && nextLink.info.firstDir;
						calcAngle = nextDir && Math.abs($hulop.util.getAngle(linkInfo.lastDir, nextDir)) <= 30;
					}
					if (index > 0) {
						var last = linkList[index - 1];
						if (last.info && last.info.lastDir) {
							accumAngle += $hulop.util.getAngle(last.info.lastDir, newDir);
						}
					}
					if (calcAngle) {
						angle = $hulop.util.getAngle(lastDir, newDir);
						var signFix = Math.sign(accumAngle);
						if (Math.sign(angle) != signFix) {
							angle += signFix * 360;
						}
						accumAngle = 0;
						lastDir = linkInfo.lastDir;
						if (naviRoutes.length == 1 && subtotal < 5 && Math.abs(angle) > 30) {
							console.log('Ignore turn at initial ' + subtotal + 'm');
							angle = 0;
						}
					}
				} else {
					accumAngle = 0;
					lastDir = null;
				}
				if (Math.abs(angle) > 30) {
					var nextElevator = subtotal < NEXT_ELEVATOR_DIST && naviItem && naviItem.lastLinkInfo && naviItem.lastLinkInfo.elevator;
					label = linkInfo.getTitle(angle, nextElevator);
					dir = linkInfo.getDir(angle);
				} else if (linkInfo.name != lastLinkInfo.name) {
					if (linkInfo.announce) {
						if (linkInfo.elevator && lastLinkInfo.elevator) {
							naviItem.display_title = naviItem.title = linkInfo.name;
						} else {
							label = linkInfo.name;
						}
					} else if (restart) {
						if (lastLinkInfo.elevator) {
							label = $m('GO_STRAIGHT');
						} else {
							label = $m('INITIAL_MOVE');
						}
					}
				}
				label && appendLabel(label, getLatLng(coords[0]), obj.properties.sourceHeight, dir, type);
				lastLinkInfo = linkInfo;
				subtotal += linkInfo.length;
				curved |= (coords.length > 2);

				links.push({
					'geo' : obj,
					'info' : linkInfo
				});
			}
			/* coords.length > 1 && */coords.forEach(function(coord) {
				path.push(getLatLng(coord));
			});
			var f = format.readFeature(obj, {
				featureProjection : 'EPSG:3857'
			});
			routeLayer.getSource().addFeature(f);
		});
		var obj = data[data.length - 1];
		appendLabel({
			'display_title' : getDestinationName(),
			'title' : getDestinationName(true)
		}, getLatLng(obj.geometry.coordinates), obj.properties['floor'] || 0, "STRAIGHT");

		var total = naviRoutes.reduce(function(subtotal, route) {
			return subtotal + (route.subtotal || 0);
		}, 0);
		naviRoutes.forEach(function(route) {
			route.resttotal = total; 
			total -= (route.subtotal || 0);
		});
		// Create step buttons
		var tbody = $('<tbody>');
		naviRoutes.forEach(function(item, index) {
			console.log([ index, item ]);
			var prev = index > 0 && $('<a>', {
				'text' : '<',
				'href' : '#',
				'class' : 'ui-btn ui-mini ui-shadow ui-corner-all _btn',
				'on' : {
					'click' : function(e) {
						e.preventDefault();
						e.target.blur();
						showStep(index - 1);
					}
				}
			});
			var label = $('<a>', {
				'text' : item.display_title,
				'href' : '#',
				'class' : 'ui-btn ui-mini ui-shadow ui-corner-all _label ' + item.dir + ' link_type_' + item.type,
				'on' : {
					'click' : function(e) {
						e.preventDefault();
						e.target.blur();
//						lastAnnounce && $hulop.util.speak(lastAnnounce, true);
						lastStep && $hulop.util.speak(distAndTitle(lastStep.distance, lastStep.route), true);
					}
				}
			});
			index && label.append(item.next_dist_span = $('<span>', {
				'class' : 'next_dist'
			}));
			label.append($('<span class="direction">')).append($('<span class="linktype">'));
			var tr = $('<tr>', {
				'id' : 'route_' + index,
				'class' : 'invisible'
			});
			index > 0 && tr.on('swiperight', function(event) {
				showStep(index - 1);
				lastAnnounce = lastStep = null;
			});
			index < naviRoutes.length - 1 && tr.on('swipeleft', function(event) {
				showStep(index + 1);
				lastAnnounce = lastStep = null;
			});
			tr.append($('<td>').append(label)).appendTo(tbody);
		});
		$('#route_result').append($('<table>', {
			'id' : 'route_table',
			'width' : '100%'
		}).append(tbody));
		noNavigation || showNeighbors();
		var timeout;
		if (typeof replay == 'number') {
			timeout = replay;
			replay = false;
		}
		if ($hulop.util.isMobile() && !replay && !rerouting) {
			var total = naviRoutes.reduce(function(subtotal, route) {
				return subtotal + (route.subtotal || 0);
			}, 0);
			showRemainDist(total);
			$('#route_summary').text(getSummary(linkList, total));
			$('#route_instructions').html(getInstructions(true));
			showPage('#confirm');
			$hulop.util.speak(getSummary(linkList, total, true), true);
			if (timeout) {
				$('#confirm_yes').hide();
				setTimeout(function() {
					$('#confirm_yes').show();
					$('#confirm_yes').click();
				}, timeout);
			}
		} else {
			if (!noNavigation) {
				startNavigation();
			}
		}
		rerouting = false;
	}

	function getDestinationName(pron) {
		var name = $('#to option:selected').text();
		if (pron) {
			var obj = targetNodes[$('#to option:selected').val()];
			if (obj) {
				return $hulop.route.getPoiName(obj, true) || name;
			}
		}
		return name;
	}

	function getDestinationLong(pron) {
		var obj = targetNodes[$('#to option:selected').val()];
		var lang = $hulop.messages.defaultLang;
		var longDesc = obj && obj.properties && (obj.properties['hulop_long_description_' + lang] || obj.properties['hulop_long_description']);
		if (longDesc) {
			return pron && lang == 'ja' && obj.properties['hulop_long_description_hira'] || longDesc;
		}
		return "";
	}

	function getPoiInfo(poiNode) {
		var info = {};
		var option = $('#to option[value="' + poiNode + '"]');
		var obj = targetNodes[option.val()];
		if (obj) {
			var name = option.text();
			var pron = $hulop.route.getPoiName(obj, true);
			name && (info.name = name);
			pron && (info.pron = pron);
		}
		return info;
	}

	// var naviFrom;
	function startNavigation() {
		$hulop.util.speak($m('INITIAL_WARN'), false);
		showResult(true);
		showPage('#map-page');
		naviCondition = $hulop.route.getNaviCondition();
		naviCondition.start = new Date().getTime();
		$hulop.util.logText("startNavigation");
		$hulop.logging && $hulop.logging.onData({
			"event" : "navigation",
			"status" : "start",
			"timestamp" : new Date().getTime()
		});
		console.log(naviRoutes);
		routeReady = true;
		showStep(-1, false);
		$('.instruction').show();
	}

	function showNeighbors() {
		var source = labelLayer.getSource();
		source.clear();
		var places = [];
		naviRoutes.forEach(function(route) {
			var landmark = findNearestLandmark(route, 50);
			if (landmark && places.indexOf(landmark) == -1) {
				source.addFeature(new ol.Feature({
					'geometry' : new ol.geom.Point(ol.proj.transform(landmark.geometry.coordinates, 'EPSG:4326', 'EPSG:3857')),
					'floor' : route.floor,
					'title' : landmark.name || $hulop.route.getPoiName(landmark)
				}));
				places.push(landmark);
			}
		});
		console.log(places);
	}

	function findNearestLandmark(route, min) {
		var result;
		landmarks.forEach(function(lm) {
			if (lm.geometry && lm.node && lm.node_height == route.floor) {
				var dist_poi = $hulop.util.computeDistanceBetween(lm.geometry.coordinates, lm.node_coordinates);
				if (dist_poi > 50) {
					return;
				}
				var dist = $hulop.util.computeDistanceBetween(route.latlng, lm.geometry.coordinates);
				if (dist < min) {
					min = dist;
					result = lm;
				}
			}
		});
		return result;
	}

	function getSummary(linkList, total, pron) {
		var poiList = {};
		linkList.forEach(function(link, index) {
			if (link.info) {
				link.info.poi_link.forEach(function(poi) {
					poiList[poi] = (poiList[poi] || 0) + 1;
				});
			}
		});
		var msg = '';
		for ( var poi in poiList) {
			if (msg) {
				msg += ', ';
			}
			msg += poi;
		}
		var summary = $m('SUMMARY_DIST', getDestinationName(pron), Math.round(total));
		if (msg) {
			summary += $m('SUMMARY_POI', msg);
		}
		return summary;
	}

	function getRouteItems(all, startIndex) {
		var nextIndex = 0;
		var instructions = [];
		var prevFloor;
		for (var index = all ? 0 : Math.max(startIndex, 0); index < naviRoutes.length; index++) {
			var item = naviRoutes[index];
			if (prevFloor && prevFloor != item.floor) {
				if (!all) {
					nextIndex = index;
					break;
				}
			}
			prevFloor != item.floor && instructions.push($('<span>', {
				'class' : 'floor',
				'text' : item.floor ? ((item.floor > 0 ? '' : 'B') + Math.abs(item.floor) + 'F') : $m('OUTDOOR')
			}));
			prevFloor = item.floor;
			var label = $('<span>', {
				'text' : item.display_title,
				'class' : 'title ' + item.dir + ' link_type_' + item.type
			});
			label.prepend($('<span class="direction">'));
			label.append($('<span class="linktype">'));
			if (all || !lastAdjust || index != currentStep) {
				instructions.push(label);
			}
			var distance = Math.floor(item.subtotal || 0);
			if (distance) {
				instructions.push($('<span>', {
					'class' : 'distance',
					'text' : distance + 'm'
				}));
			}
		}
		return {
			'instructions' : instructions,
			'nextIndex' : nextIndex
		};
	}

	function getInstructions(all) {
		var items = getRouteItems(all, currentStep);
		var instructions = $('<div>', {
			'class' : 'route_instructions'
		});
		instructions.append(items.instructions);
		var nextIndex = items.nextIndex;
		if (nextIndex) {
			var next = $('<a>', {
				'text' : $m('MORE'),
				'href' : '#',
				'class' : 'ui-btn ui-mini ui-shadow ui-corner-all _btn',
				'on' : {
					'click' : function(e) {
						e.preventDefault();
						e.target.blur();
						var nextItems = getRouteItems(all, nextIndex);
						next.before(nextItems.instructions);
						(nextIndex = nextItems.nextIndex) || next.remove();
					}
				}
			});
			instructions.append(next);
		}
		return instructions;
	}

	function showFeatures(data) {
		// deprecated
	}

	function showResult(fShow) {
		$('.search').show();
		if (fShow) {
			$('.mobile_search').hide();
			$('.result').show();
		} else {
			$('.mobile_search').show();
			$('.result').hide();
		}
		if ($hulop.util.isMobile()) {
			if (lastShowResult != fShow) {
				lastShowResult = fShow;
			}
			resizeMap();
		}
		stateChanged();
	}

	function clearRoute() {
		listeners.clear && listeners.clear();
		routeReady = false;
		naviRoutes = [];
		routeLayer.getSource().clear();
		labelLayer.getSource().clear();
		$('#route_result').empty();
		$hulop.location && $hulop.location.showNext();
		showResult(false);
		$("#map-page").trigger("resize");
		$('.instruction').hide();
	}

	function showStep(index, pan, adjust) {
		currentStep = index;
		adjustRotation(null, index > 0 ? 2000 : 0);
		lastAdjust = adjust;
		function fixIndex(index) {
			return Math.max(Math.min(index, naviRoutes.length - 1), 0)
		}
		var text_index = fixIndex(index + (adjust || 0));
		var step = naviRoutes[index = fixIndex(index)];
		$('#route_table tr').addClass('invisible');
		$('#route_table tr#route_' + text_index).removeClass('invisible');
		console.log('showStep: ' + naviRoutes[text_index].display_title);
		if (pan != false) {
			panTo(step.latlng);
			suppressAnnounce = new Date().getTime();
			spokenDistance = Number.MAX_VALUE;
		}
		$hulop.location && $hulop.location.showNext(step, naviRoutes[index + 1]);
		$hulop.indoor && $hulop.indoor.showFloor(step.floor);
		suppressError = new Date().getTime();
	}

	var animating;
	function adjustRotation(pos, delay) {
		if (rotationMode == 2) {
			var currentRoute = naviRoutes[currentStep];
			if (currentRoute && currentRoute.polyline) {
				var angle = $hulop.util.computeRouteHeading(pos, currentRoute.polyline, currentStep == 0);
				if (!isNaN(angle)) {
					var rotation = -angle * Math.PI / 180.0;
					if (delay) {
						var diff = rotation - map.getView().getRotation();
						if (Math.abs(diff) > Math.PI) {
							rotation -= Math.sign(diff) * 2 * Math.PI;
						}
						animating = true;
						map.getView().animate({
							'rotation' : rotation,
							'duration' : delay
						}, function(completed) {
							animating = false;
							setTimeout(function() {
								lastCenter && setCenter(lastCenter);
							});
						});
					} else if (!animating) {
						map.getView().setRotation(rotation);
					}
					return true;
				}
			}
		}
	}

	function resetRotation() {
		if (!adjustRotation()) {
			map.getView().setRotation(0);
		}
	}

	function isLocationOnStep(index, latlng, radius) {
		if (index >= 0 && naviRoutes[index].polyline) {
			return $hulop.util.isLocationOnEdge(latlng, naviRoutes[index].polyline, radius);
		}
	}

	function panTo(latlng) {
		var center = getCenter();
		if (latlng[0] != center[0] || latlng[1] != center[1]) {
			setTimeout(function() {
				setCenter(latlng);
			});
			setSync(false);
		}
	}

	var syncTimeout;
	function setSync(value) {
		var syncButton = (sync = value) || !$hulop.location.getCurrentLatlng()
		sync ? $('.my_location').hide() : $('.my_location').show();
		syncButton ? $('.my_location_button').hide() : $('.my_location_button').show();
		if (sync) {
			$('#map-center-heading').hide();
		}

		if (!sync) {
			if (!devMode() && naviRoutes.length > 0) {
				if (syncTimeout) {
					clearTimeout(syncTimeout);
				}
				syncTimeout = setTimeout(function() {
					syncTimeout = null;
					restoreSync();
				}, 3 * 1000)
			}
		}
	}
	function restoreSync() {
		setSync(true);
		var latLng = $hulop.location.getCurrentLatlng();
		latLng && setCenter(latLng);
		var loc = $hulop.location.getCurrentLocation();
		if (loc && !isNaN(loc.floor) && $hulop.indoor) {
			var floor = Math.round(loc.floor);
			$hulop.indoor.showFloor(floor < 0 ? floor : floor + 1);
		}
		resetRotation();
	}

	var targetNodes = {}, lastFloor;
	function initTarget(data) {
		console.log(data);
		landmarks = data.landmarks || [];
		lastTo = $('#to').val();
		$('#from option').remove();
		$('#to option').remove();
		targetNodes = {};
		if (landmarks.length > 0) {
			var select_from = $('#from').append($('<option>', {
				'text' : $m('MY_LOCATION'),
				'value' : '',
				'current-location' : true
			}));
		}
		addLandmarks(landmarks);
		landmarks.length == 0 && showAlert($m('NO_TARGET'));
	}

	$(document).ready(function() {
		try {
			$('#popupDialog').enhanceWithin().popup();
		} catch (e) {
		}
	});
	function showAlert(text) {
		$hulop.util.speak(text, true);
		$('#popupText').text(text);
		$('#popupDialog').popup('open');
		setTimeout(function() {
			$('#popupDialog').popup('close');
		}, 7500);
	}

	function refreshSelect() {
		if ($('#from').selectmenu) {
			try {
				$('#from').selectmenu();
				$('#to').selectmenu();
				$('#from').selectmenu('refresh', true);
				$('#to').selectmenu('refresh', true);
			} catch (e) {
				console.error(e);
			}
		}
	}

	function addLandmarks(landmarks) {
		var select_from = $('#from'), select_to = $('#to');
		landmarks.forEach(function(obj) {
			var id = obj.node;
			var poi_id = obj.properties && obj.properties['facil_id'];
			if (poi_id) {
				// id += ':' + poi_id;
			}
			var option = $('<option>', {
				'text' : $hulop.route.getPoiName(obj),
				'value' : id
			});
			select_from.append(option);
			select_to.append(option.clone());
			id == lastTo && select_to.val(lastTo);
			targetNodes[id] = obj;
		});
		sortLandmarks();
		refreshSelect();
	}

	function sortLandmarks() {
		$('.basic_menu').hide();
		if ($hulop.category_menu && $hulop.category_menu.show(targetNodes)) {
			return;
		}
		$('.basic_menu').show();
		var center = getCenter();
		var floor = $hulop.indoor && $hulop.indoor.getCurrentFloor() || 0;
		function calcDistance(coordinates) {
			return $hulop.util.computeDistanceBetween(center, $hulop.util.newLatLng(coordinates[1], coordinates[0]));
		}
		function getWeight(height) {
			if ($hulop.route.levelDiff(floor, height) < 1) {
				return 1;
			}
			return height == 0 ? -1 : 0;
		}
		var e = document.getElementById('to');
		var options = [];
		for (var i = 0; i < e.options.length; i++) {
			var o = e.options[i];
			options[i] = new Option(o.text, o.value, o.defaultSelected, o.selected);
		}
		options.sort(function(a, b) {
			var na = targetNodes[a.value], nb = targetNodes[b.value];
			if (na && nb) {
				var wa = getWeight(na.node_height), wb = getWeight(nb.node_height);
				if (wa != wb) {
					return wb - wa;
				} else if (wa == 1) {
					// show closest place at top for current floor
					return calcDistance(na.node_coordinates) - calcDistance(nb.node_coordinates);
				}
			}
			// otherwise show alphabetical order
			var la = a.text.toLowerCase(), lb = b.text.toLowerCase();
			if (la != lb) {
				return la > lb ? 1 : -1;
			}
			return 0;
		});
		e.options.length = 0;
		for (var i = 0; i < options.length; i++) {
			if (lastFloor != floor) {
				options[i].selected = i == 0;
			}
			e.options[i] = options[i];
		}
		if (lastFloor != floor) {
			lastFloor = floor;
			refreshSelect();
		}
	}

	function setTarget(latLng, dist) {
		currentLatLng = latLng;
		currentDist = dist;
	}

	function initFeatures(latLng) {
		console.log('initFeatures');
		setTarget(latLng, getDist());
		$hulop.route.setOffline($('#test').val() == 'offline');
		clearRoute();
		$hulop.route.callService({
			'action' : 'start',
			'lat' : currentLatLng[1],
			'lng' : currentLatLng[0],
			'dist' : currentDist
		}, initTarget);
	}

	function doSearch(all, to_val) {
		lastSearchTo = to_val;
		clearRoute();
		var data = {
			'action' : 'search',
			'preferences' : JSON.stringify($hulop.util.getPreferences())
		}
		if (!all) {
			devMode() || restoreSync();
			data.from = $('#from').val();
			data.to = to_val || $('#to').val();
			var from_str = data.from.split(':');
			var to_str = data.to.split(':');
			var from = startCurrentLocation();
			if (from) {
				data.from = 'latlng:' + from[1] + ':' + from[0];
				var floor = $hulop.indoor && $hulop.indoor.getCurrentFloor() || 0;
				if (floor != 0) {
					data.from += ':' + floor;
				}
			}
			if (currentLatLng) {
				$hulop.util.logText("Route," + $('#from option:selected').text() + "," + $('#to option:selected').text());
				$hulop.util.logText("initTarget," + JSON.stringify({
					'action' : 'start',
					'lat' : currentLatLng[1],
					'lng' : currentLatLng[0],
					'dist' : currentDist
				}));
				$hulop.util.logText("showRoute," + JSON.stringify(data));
			}
		}
		$hulop.route.callService(data, all ? showFeatures : showRoute);
	}

	function startCurrentLocation() {
		if ($('#from option:selected').attr('current-location') == 'true') {
			return $hulop.util.isMobile() ? getCenter() : currentLatLng;
		}
	}

	function getLatLng(coord) {
		return $hulop.util.newLatLng(coord[1], coord[0]);
	}

	function distAndTitle(distance, route, soon, round) {
		round = round || 1;
		var title = route.title;
		if (soon && distance < 6) {
			var afterPrefix = getLastLinkInfo(route, 'afterPrefix');
			if (afterPrefix) {
				return $m(afterPrefix, title);
			}
			return distance <= NO_SOON_DIST ? title : $m('NEXT_SOON', title);
		}
		return distance < 6 ? title : $m(round > 1 ? 'NEXT_DEST_ABOUT' : 'NEXT_DEST', Math.floor(distance / round) * round, title);
	}

	function getDist() {
		return Number($('#dist').val());
	}

	function resizeMap() {
		if ($('#map').is(':hidden')) {
			return;
		}
		var top = $('#map-page [data-role="header"]').height() + 2;
		var fix = $(window).height() - top - $('#map-container').height();
		if (fix != 0) {
			var height = $('#map').height() + fix;
			$('#map').height(height);
			$('#map-center').css({
				'top' : top + height / 2
			});
			$('#map-center-heading').css({
				'top' : top + height / 2
			});
			map.updateSize();
		}
	}

	function showPage(target) {
		$('body').pagecontainer && $('body').pagecontainer('change', target);
	}

	function updateCenterOrientation(radian) {
		if (!sync && devMode()) {
			if (isNaN(radian)) {
				$('#map-center-heading').hide();
			} else {
				$('#map-center-heading').css('transform', 'rotate(' + (radian) / Math.PI * 180 + 'deg)').show();
			}
		}
	}

	var counter = {};
	function fixRate(index, interval, distance) {
		if (counter.index != index) {
			counter = {
				'index' : index
			};
		}
		if (distance > ARRIVE_DIST) {
			return 1;
		}
		var now = new Date().getTime();
		counter.start = counter.start || now;
		return 1 - Math.min(1, (now - counter.start) / interval);
	}

	function getState() {
		var state = {};
		if ($hulop.util.isMobile()) {
			var pageId = $('body').pagecontainer('getActivePage').prop('id');
			state.page = pageId;
			if (pageId == 'map-page') {
				state.navigation = $('.result').is(':visible');
			}
		}
		return state;
	}

	var lastState;
	function stateChanged() {
		var state = JSON.stringify(getState());
		if (state != lastState) {
			lastState = state;
			$hulop.util.logText("stateChanged," + state);
			$hulop.logging && $hulop.logging.flush();
		}
	}

	function resetState() {
		showPage('#map-page');
		clearRoute();
	}

	function getCenter(mapCenter) {
		if (!mapCenter) {
			var latLng = $hulop.location && $hulop.location.getCurrentLatlng();
			if (latLng && !sync && !devMode()) {
				return latLng;
			}
		}
		return ol.proj.transform(map.getView().getCenter(), 'EPSG:3857', 'EPSG:4326');
	}

	var lastCenter;
	function setCenter(center) {
		// console.log(center);
		if (animating) {
			lastCenter = center;
		} else {
			map.getView().setCenter(ol.proj.transform(center, 'EPSG:4326', 'EPSG:3857'));
			lastCenter = null;
		}
	}

	function devMode() {
		return !$hulop.mobile || $hulop.mobile.getPreference('developer_mode');
	}

	function setRotation(angle) {
		rotationMode == 1 && map.getView().setRotation(angle * Math.PI / 180.0);
	}
	
	var noheader = location.search.substr(1).split('&').indexOf('noheader') != -1;
	function addRemainDist() {
		if (!noheader) {
			var remain = $('<div>', {
				'class' : 'instruction ol-unselectable ol-control LEFT_TOP',
				'css' : {
					'display' : 'none'
				}
			}).append($('<span>', {
				'id' : 'remaining-distance',
				'class' : 'ui-btn ui-mini ui-shadow ui-corner-all',
				'css' : {
					'font-size' : '16px',
					'margin' : '0px',
					'padding' : '0.5625em'
				}
			}));
			map.addControl(new ol.control.Control({
				'element' : remain[0]
			}));
		}
	}

	function showRemainDist(distance) {
		var text = $m('REMAIN_DIST', Math.floor(distance));
		if (noheader) {
			$hulop.util.logText('setTitle,' + text);
		} else {
			$('#remaining-distance').text(text);
		}
	}
	
	var HOOK_LENGTH = 3;
	function getArrivalToken() {
		var lastRoute = naviRoutes[naviRoutes.length - 2];
		var total = 0, count = 0, len = lastRoute.links.length;
		while (count < len && total <= HOOK_LENGTH) {
			total += lastRoute.links[len - ++count].info.length;
		}
		if (count > 1 && total > HOOK_LENGTH) {
			var angle = lastRoute.links[len - 1].info.lastDir.heading - lastRoute.links[len - count].info.lastDir.heading;
			if (angle > 180) {
				angle -= 360;
			} else if (angle < -180) {
				angle += 360;
			}
			if (Math.abs(angle) > 45 && Math.abs(angle) < 135) {
				return angle > 0 ? 'ARRIVED_RIGHT' : 'ARRIVED_LEFT';
			}
		}
		return 'ARRIVED';
	}

	return {
		'getState' : getState,
		'resetState' : resetState,
		'init' : init,
		'setTarget' : setTarget,
		'initTarget' : initTarget,
		'showRoute' : showRoute,
		'showResult' : showResult,
		'showStep' : showStep,
		'setSync' : setSync,
		'getMap' : function() {
			return map;
		},
		'getRouteLayer' : function() {
			return routeLayer;
		},
		'refresh' : function() {
			labelLayer.changed();
			routeLayer.changed();
		},
		'clearRoute' : clearRoute,
		'on' : function(key, value) {
			listeners[key] = value;
		},
		'doSearch' : doSearch,
		'getPoiInfo' : getPoiInfo,
		'setCenter' : setCenter,
		'getCenter' : getCenter,
		'setRotation' : setRotation,
		'updateCenterOrientation' : updateCenterOrientation
	};

}();

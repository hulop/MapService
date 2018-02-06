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

$hulop.indoor = function() {

	var overlayMap = {}, floors = [], activeFloor = null, enabled = false, styleOptions;
	var map, floorButton, toiletMarkers = [];

	var toiletImage = new ol.style.Style({
		'image' : new ol.style.Icon({
			'anchor' : [ 0.5, 1 ],
			'scale' : 32 / 96,
			'anchorXUnits' : 'fraction',
			'anchorYUnits' : 'fraction',
			'src' : 'images/toilet.png'
		})
	});
	var toiletLayer = new ol.layer.Vector({
		'source' : new ol.source.Vector(),
		'style' : function() {
			return toiletImage;
		},
		'zIndex' : 101
	});

	function getOverlay(id) {
		return overlayMap[id];
	}

	function createOverlay(region) {
		if (region.tile_url) {
			return overlayMap[region.id] = new TileOverlay(region);
		}
		var overlay = new FloorPlanOverlay({
			'src' : region.image,
			'lat' : region.lat,
			'lng' : region.lng,
			'ppm' : region.ppm,
			'ppm_x' : region.ppm_x,
			'ppm_y' : region.ppm_y,
			'origin_x' : region.origin_x,
			'origin_y' : region.origin_y,
			'rotate' : region.rotate,
			'floor' : region.floor,
			'width' : region.width || 1000,
			'height' : region.height || 1000,
			'zIndex' : region.zIndex || 0
		});
		return overlayMap[region.id] = overlay;
	}

	function refresh() {
		showFloor(activeFloor);
	}

	function loadOverlays() {
		map = $hulop.map.getMap();
		$.ajax({
			'type' : 'get',
			'url' : 'map/floormaps.json',
			'dataType' : 'json',
			'success' : function(data) {
				console.log(data);
				data.forEach(function(region) {
					createOverlay(region);
				});
				map.on('moveend', refresh);
				setTimeout(function() {
					activeFloor = ($hulop.config.INITIAL_LOCATION && $hulop.config.INITIAL_LOCATION.floor) || null;
					refresh();
				}, 1000)
			},
			'error' : function(XMLHttpRequest, textStatus, errorThrown) {
				console.error(textStatus + ' (' + XMLHttpRequest.status + '): ' + errorThrown);
			}
		});
		var floorToggle = $('<div>', {
			'class' : 'floorToggle ol-unselectable ol-control BOTTOM',
			'css' : {
				'display' : 'none'
			}
		}).append(floorButton = $('<a>', {
			'text' : $m('OUTDOOR'),
			'href' : '#',
			'class' : 'ui-btn ui-mini ui-shadow ui-corner-all ui-btn-icon-left ui-icon-home',
			'css' : {
				'margin' : '0px',
				'width' : '75px',
				'font-size' : '14pt'
			},
			'on' : {
				'click' : function(e) {
					e.preventDefault();
					e.target.blur();
					var index = floors.indexOf(activeFloor) + 1;
					showFloor(index < floors.length ? floors[index] : null);
				}
			}
		}));
		map.addControl(new ol.control.Control({
			'element' : floorToggle[0]
		}));

		map.addLayer(toiletLayer);

		var toiletLatlng;
		function initToilets() {
			setTimeout(arguments.callee, 1000);
			if (getCurrentFloor() == 0) {
				return;
			}
			var latlng = $hulop.map.getCenter();
			var toiletDist = $hulop.config.MAX_RADIUS || 500;
			if (toiletLatlng && $hulop.util.computeDistanceBetween(latlng, toiletLatlng) < toiletDist * 0.9) {
				return;
			}
			toiletLatlng = latlng;
			showToilets();
			toiletMarkers = [];
			var start = new Date().getTime();
			$hulop.route.callService({
				'action' : 'toilets',
				'lat' : toiletLatlng[1],
				'lng' : toiletLatlng[0],
				'dist' : toiletDist
			}, function(data) {
				console.log('Get Toilets: ' + (new Date().getTime() - start) + 'ms');
				for (var id in data) {
					var site = data[id];
					var properties = site.properties;
					for (var key in properties) {
						var m = /^(ent\d+_)fl$/.exec(key);
						if (m) {
							var lat = properties[m[1] + 'lat'];
							var lng = properties[m[1] + 'lon'];
							lat && lng && toiletMarkers.push({
								'marker' : new ol.Feature({
									'geometry' : new ol.geom.Point(ol.proj.transform([ lng, lat ], 'EPSG:4326', 'EPSG:3857'))
								}),
								'floor' : properties[key],
								'site' : site
							});
						}
					}
				}
				if (toiletMarkers.length > 0) {
					showToilets(getCurrentFloor());
					console.log(toiletMarkers.length + ' accessible toilets');
					toiletMarkers.forEach(function(t) {
						console.log(t);
					});
				} else {
					console.log('No accessible toilets');
				}
			});
		}
		$hulop.util.isMobile() && initToilets();
	}

	function showFloor(floor) {
		if (floor && floor % 1 != 0) {
			return;
		}
		floors = [];
		var zoom = map.getView().getZoom();
		var center = $hulop.map.getCenter();
		for ( var id in overlayMap) {
			var ov = overlayMap[id];
			var diag = ov.coverage || (Math.sqrt(Math.pow(ov.width / ov.ppm_x, 2) + Math.pow(ov.height / ov.ppm_y, 2)));
			var dist = Math.max(diag + 100, ($hulop.config.MAX_RADIUS || 500) / 2);
			var range = zoom >= 16 && $hulop.util.computeDistanceBetween(center, $hulop.util.newLatLng(ov.lat, ov.lng)) < dist;
			var of = ov.floor;
			ov.show(range && of == floor);
			range && floors.indexOf(of) < 0 && floors.push(of);
		}
		floors.sort(function(a, b) {
			return a - b;
		});
		var lastFloor = getCurrentFloor();
		activeFloor = floor;
		var text;
		if (floor) {
			text = floor > 0 ? floor + 'F' : 'B' + (-floor) + 'F';
		} else {
			text = $m('OUTDOOR');
		}
		floorButton.text(text);
		if (floors.length > 0) {
			$('.floorToggle').show();
			enabled = true;
		} else {
			$('.floorToggle').hide();
			enabled = false;
			activeFloor = null;
		}
		if (lastFloor != getCurrentFloor()) {
			$hulop.map.refresh();
			showToilets(getCurrentFloor());
		}
	}

	function showToilets(floor) {
		toiletLayer.getSource().clear();
		toiletMarkers.forEach(function(t) {
			t.floor == floor && toiletLayer.getSource().addFeature(t.marker);
		});

	}

	function getCurrentFloor() {
		return (enabled && activeFloor) || 0;
	}

	function TileOverlay(options) {
		for ( var key in options) {
			this[key] = options[key];
		}
		var source = new ol.source.XYZ({
			'wrapX' : false,
			'url' : this.tile_url
		});
		this.attributions && source.setAttributions(this.attributions);

		var layer = new ol.layer.Tile({
			'source' : source
		});
		this.show = function(show) {
			layer.setVisible(show);
		}
		$hulop.map.getMap().addLayer(layer);
	}

	return {
		'setStyle' : function(style) {
			styleOptions = style;
		},
		'getOverlay' : getOverlay,
		'refresh' : refresh,
		'loadOverlays' : loadOverlays,
		'showFloor' : showFloor,
		'getCurrentFloor' : getCurrentFloor
	};

}();

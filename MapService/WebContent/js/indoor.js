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

	var overlayMap = {}, floors = [], activeFloor = null, activeFloorName = null, enabled = false, styleOptions;
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

	var facilityLabel = new ol.style.Style({
		'text' : new ol.style.Text({
			'textAlign' : 'center',
			'textBaseline' : 'middle',
			'fill' : new ol.style.Fill({
				'color' : 'black'
			}),
			'stroke' : new ol.style.Stroke({
				'color' : 'white',
				'width' : 3
			})
		})
	});

	var toiletLayer = new ol.layer.Vector({
		'source' : new ol.source.Vector(),
		'style' : function(feature) {
			var zoom = map.getView().getZoom();
			var p = feature.getProperties();
			if (zoom > 16 && p.toilet) {
				return toiletImage;
			}
			if (zoom >= p.show_labels && p.label) {
				facilityLabel.getText().setText(p.label);
				return facilityLabel;
			}
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
			'name' : region.name,
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
				'action' : 'facilities',
				'quiet' : true,
				'lat' : toiletLatlng[1],
				'lng' : toiletLatlng[0],
				'dist' : toiletDist
			}, function(data) {
				console.log('Get Toilets: ' + (new Date().getTime() - start) + 'ms');
				for (var id in data) {
					var site = data[id];
					var properties = site.properties;
					var floors = [];
					for (var key in properties) {
						/^(ent\d+_)fl$/.exec(key) && floors.push(properties[key]);
					}
					if (floors.length > 0) {
						var toilet = false, label = false;
						if (properties.facil_type == 10) {
							toilet = properties.toilet == 3 || properties.toilet == 4 || properties.toilet == 5 || properties.toilet == 6;
						} else {
							label = properties['name_' + $hulop.messages.defaultLang] || properties.name;
						}
						if (toilet || label) {
							toiletMarkers.push({
								'marker' : new ol.Feature({
									'toilet' : toilet,
									'label' : label,
									'show_labels' : Number(properties.hulop_show_labels_zoomlevel || $hulop.config.DEFAULT_SHOW_LABELS_ZOOMLEVEL),
									'geometry' : new ol.geom.Point(ol.proj.transform(site.geometry.coordinates, 'EPSG:4326', 'EPSG:3857'))
								}),
								'floors' : floors
							});
						}
					}
				}
				console.log(toiletMarkers.length + ' accessible toilets');
				showToilets(getCurrentFloor());
			});
		}
		$hulop.util.isMobile() && initToilets();
	}

	function showFloor(floor) {
//		if (floor && floor % 1 != 0) {
//			return;
//		}
		floors = [];
		var activeMaps = [];
		var zoom = map.getView().getZoom();
		var center = $hulop.map.getCenter();
		for ( var id in overlayMap) {
			var ov = overlayMap[id];
			var diag = ov.coverage || (Math.sqrt(Math.pow(ov.width / ov.ppm_x, 2) + Math.pow(ov.height / ov.ppm_y, 2)));
			var dist = Math.max(diag + 100, ($hulop.config.MAX_RADIUS || 500) / 2);
			if (zoom >= 16 && $hulop.util.computeDistanceBetween(center, $hulop.util.newLatLng(ov.lat, ov.lng)) < dist) {
				ov.floor == floor && activeMaps.push(id);
				floors.indexOf(ov.floor) < 0 && floors.push(ov.floor);
			}
		}
		if (floor && activeMaps.length == 0) {
			return;
		}
		activeFloorName = null;
		for (var id in overlayMap) {
			var ov = overlayMap[id];
			var show = activeMaps.indexOf(id) != -1;
			ov.show(show);
			if (show && ov.name) {
				activeFloorName = ov.name;
			}
		}
		floors.sort(function(a, b) {
			return a - b;
		});
		var lastFloor = getCurrentFloor();
		activeFloor = floor;
		floorButton.text(getFloorName());
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
			t.floors.indexOf(floor) >= 0 && toiletLayer.getSource().addFeature(t.marker);
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
			'source' : source,
			'visible' : false
		});
		this.show = function(show) {
			layer.setVisible(show);
		}
		$hulop.map.getMap().addLayer(layer);
	}

	function getFloorName() {
		if (activeFloorName) {
			return activeFloorName;
		}
		var floor = getCurrentFloor();
		return floor ? (floor > 0 ? floor + 'F' : 'B' + (-floor) + 'F') : $m('OUTDOOR');
	}

	function isVisible(height) {
		var index = floors.indexOf(getCurrentFloor());
		return (index != -1) && (index == 0 || floors[index - 1] < height) && (index == floors.length - 1 || height < floors[index + 1]) 
	}

	return {
		'setStyle' : function(style) {
			styleOptions = style;
		},
		'getOverlay' : getOverlay,
		'refresh' : refresh,
		'loadOverlays' : loadOverlays,
		'showFloor' : showFloor,
		'getCurrentFloor' : getCurrentFloor,
		'getFloorName' : getFloorName,
		'isVisible' : isVisible
	};

}();

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

$hulop.location = function() {
	/**
	 * Localization related functions
	 * 
	 */
	var watchID, lastLocation, lastLatLng, lastAngle, locationListener, locationFilter;
	var showArrow = true;

	var locationArrowImage = new ol.style.Icon({
		'anchor' : [ 0.5, 0.5 ],
		'anchorXUnits' : 'fraction',
		'anchorYUnits' : 'fraction',
		'rotateWithView' : true,
		'src' : 'images/map-location-arrow.png'
	});

	var locationImage = new ol.style.Icon({
		'anchor' : [ 0.5, 0.5 ],
		'anchorXUnits' : 'fraction',
		'anchorYUnits' : 'fraction',
		'rotateWithView' : true,
		'src' : 'images/map-location.png'
	});

	var markerStyle = new ol.style.Style({
		'fill' : new ol.style.Fill({
			'color' : 'rgba(49, 133, 255, 0.2)'
		}),
		'stroke' : new ol.style.Stroke({
			'width' : 1,
			'color' : 'rgba(49, 133, 255, 1.0)'
		}),
		'image' : locationImage
	});

	var nextStyle = {
		'LineString' : [ new ol.style.Style({
			'stroke' : new ol.style.Stroke({
				'width' : 10,
				'color' : 'red'
			})
		}), new ol.style.Style({
			'image' : new ol.style.Icon({
				'src' : 'images/map-next-arrow.png',
				'anchor' : [ 0.75, 0.5 ],
				'scale' : 32 / 64,
				'rotateWithView' : true
			})
		}) ],
		'Circle' : new ol.style.Style({
			'stroke' : new ol.style.Stroke({
				'width' : 2,
				'color' : 'gray'
			})
		}),
		'MultiPolygon' : new ol.style.Style({
			'stroke' : new ol.style.Stroke({
				'width' : 1,
				'color' : 'blue'
			})
		})
	};

	var markerLayer, locFeature, accFeature;
	function showMarker(location, accuracy) {
		var map = $hulop.map.getMap();
		if (!map) {
			lastLocation = null;
			return;
		}
		var center = location ? ol.proj.transform(location, 'EPSG:4326', 'EPSG:3857') : [ 0, 0 ]
		var locProperties = {
			'geometry' : new ol.geom.Point(center)
		}
		var accProperties = {
			'geometry' : new ol.geom.Circle(center, accuracy || 0)
		}
		if (!markerLayer) {
			markerLayer = new ol.layer.Vector({
				'source' : new ol.source.Vector({
					'features' : [ locFeature = new ol.Feature(locProperties), accFeature = new ol.Feature(accProperties) ]
				}),
				'style' : function(feature) {
					return markerStyle;
				},
				'zIndex' : 103
			});
			map.addLayer(markerLayer);
		} else {
			locFeature.setProperties(locProperties);
			accFeature.setProperties(accProperties);
		}
	}

	function watchLocation(listener, filter) {
		locationListener = listener;
		locationFilter = filter;
		if (navigator.geolocation && !$hulop.mobile) {
			var options = {
				'enableHighAccuracy' : false,
				'timeout' : 5000,
				'maximumAge' : 0
			};
			function success(pos) {
				updateLocation(pos.coords);
			}
			function error(err) {
				console.warn('ERROR(' + err.code + '): ' + err.message);
			}
			setTimeout(function() {
				if (!$hulop.mobile) {
					watchID = navigator.geolocation.watchPosition(success, error, options);
				}
			}, 10 * 1000);
		}
	}

	function clearWatch() {
		watchID && navigator.geolocation.clearWatch(watchID);
	}

	function updateLocation(crd) {
		if (crd && (isNaN(crd.latitude) || isNaN(crd.longitude))) {
			crd = undefined;
		}
		if (!crd) {
			lastLocation && showLocation(lastLocation = crd);
			return;
		}
		$hulop.screen_filter && $hulop.screen_filter.onUpdateLocation(crd);
		var ll = locationFilter && locationFilter($hulop.util.newLatLng(crd.latitude, crd.longitude));
		if (ll) {
			crd.latitude = ll[1];
			crd.longitude = ll[0];
		}
		if (!lastLocation || lastLocation.latitude !== crd.latitude || lastLocation.longitude !== crd.longitude || lastLocation.floor !== crd.floor) {
			showLocation(lastLocation = crd);
		}
	}

	var lastRAD;
	function updateOrientation(rad) {
		lastRAD = rad;
		showDirection(rad * 180 / Math.PI);
	}

	var lastLogTime = 0;
	function showLocation(crd) {
		if (!crd) {
			showMarker();
			lastLatLng = undefined;
			return;
		}
		if ($hulop.logging && crd.provider != 'logplay') {
			var now = new Date().getTime();
			if (now > lastLogTime + 1 * 1000) {
				lastLogTime = now;
				var data = {
					'event' : 'location',
					'timestamp' : crd.timestamp || now,
					'latitude' : crd.latitude,
					'longitude' : crd.longitude,
					'floor' : crd.floor || 0
				};
				isNaN(lastRAD) || (data.z = -lastRAD);
				$hulop.logging.onData(data);
			}
		}
		// console.log(crd);
		lastLatLng = $hulop.util.newLatLng(crd.latitude, crd.longitude);
		locationListener && locationListener(lastLatLng, crd.floor);
		showMarker(lastLatLng, crd.accuracy);
	}

	function enableOrientation(enable) {
		showArrow = enable;
		var angle = lastAngle;
		lastAngle = null;
		showDirection(angle);
	}

	var P = 0.3;
	function showDirection(angle) {
		angle = Math.round(angle / 1) * 1;
		if (lastLatLng && angle != lastAngle) {
			if (!isNaN(lastAngle)) {
				angle = $hulop.util.mergeDegree(angle, lastAngle, P);
				var diff = $hulop.util.normalizeDegree(angle - lastAngle);
				if (Math.abs(diff) < 2) {
					return;
				}
			}
			lastAngle = angle;
			if (isNaN(angle)) {
				markerStyle.setImage(locationImage);
				markerLayer && markerLayer.changed();
				return;
			}
			locationArrowImage.setRotation(angle * Math.PI / 180.0);
			var image = showArrow ? locationArrowImage : locationImage;
			if (markerStyle.getImage() != image) {
				markerStyle.setImage(image);
			}
			markerLayer && markerLayer.changed();
			showArrow && $hulop.map.setRotation(-angle);
		}
	}

	var nextLayer, stepLine = new ol.Feature(), nextCircle = new ol.Feature(), nextPolygon = new ol.Feature();

	function showNextFeature(lineGeometry, circleGeometry, polygonGeometry) {
		var map = $hulop.map.getMap();
		if (!map) {
			return;
		}
		if (!nextLayer) {
			nextLayer = new ol.layer.Vector({
				'source' : new ol.source.Vector({
					'features' : [ stepLine, nextCircle, nextPolygon]
				}),
				'style' : function(feature) {
					return nextStyle[feature.getGeometry().getType()];
				},
				'zIndex' : 102
			});
			map.addLayer(nextLayer);
		}
		lineGeometry && stepLine.setGeometry(lineGeometry);
		circleGeometry && nextCircle.setGeometry(circleGeometry);
		polygonGeometry && nextPolygon.setGeometry(polygonGeometry);
	}

	function showNext(step, nextStep) {
		var latlng = step && step.nextLatlng
		var path = [];
		if (latlng) {
			if (step.type != '10') {
				step.polyline.getCoordinates().forEach(function(point) {
					path.push(ol.proj.transform(point, 'EPSG:4326', 'EPSG:3857'));
				});
				if (nextStep && nextStep.polyline && nextStep.type != '10') {
					var nextPath = nextStep.polyline.getCoordinates();
					nextPath.length > 1 && path.push(ol.proj.transform(nextPath[1], 'EPSG:4326', 'EPSG:3857'));
				}
			}
		}
		if (path.length > 1) {
			var style = nextStyle.LineString[1];
			// console.log(style);
			var end = path[path.length - 1];
			style.setGeometry(new ol.geom.Point(end));
			var dx, dy;
			for (var i = path.length - 2; i >= 0; i--) {
				var start = path[i];
				dx = end[0] - start[0];
				dy = end[1] - start[1];
				if (dx || dy) {
					break;
				}
			}
			// console.log('dx=' + dx + ', dy=' + dy + ', rotation=' +
			// Math.atan2(dy, dx));
			style.getImage().setRotation(-Math.atan2(dy, dx));
		}
		showNextFeature(new ol.geom.LineString(path));
		showNextCircle();
		showNextPolygon();
	}

	function showNextCircle(latlng, radius) {
		var center = latlng && radius && ol.proj.transform(latlng, 'EPSG:4326', 'EPSG:3857')
		var fix = latlng && radius && ol.proj.getPointResolution('EPSG:3857', 1, center);
		showNextFeature(null, center ? new ol.geom.Circle(center, radius / fix) : new ol.geom.Point([ 0, 0 ]));
	}

	function showNextPolygon(latlng, radius, prevInfo, nextInfo) {
		var coords = [];
		if (latlng && prevInfo && prevInfo.road_width >= radius * 2) {
			coords.push($hulop.util.computeRect(latlng, prevInfo.lastDir.heading, prevInfo.road_width / 2, prevInfo.road_width / 2));
		}
		if (latlng && nextInfo && nextInfo.road_width >= radius * 2) {
			coords.push($hulop.util.computeRect(latlng, nextInfo.firstDir.heading, nextInfo.road_width / 2, nextInfo.road_width / 2));
		}
		var polygonGeom = new ol.geom.MultiPolygon(coords)
		showNextFeature(null, null, polygonGeom);
		return polygonGeom;
	}

	return {
		'watchLocation' : watchLocation,
		'clearWatch' : clearWatch,
		'updateLocation' : updateLocation,
		'showLocation' : showLocation,
		'updateOrientation' : updateOrientation,
		'showNext' : showNext,
		'showNextCircle' : showNextCircle,
		'showNextPolygon' : showNextPolygon,
		'enableOrientation' : enableOrientation,
		'getCurrentLocation' : function() {
			return lastLocation;
		},
		'getCurrentLatlng' : function() {
			return lastLatLng;
		}
	};

}();

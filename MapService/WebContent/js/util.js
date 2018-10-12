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

$hulop.util = function() {
	/**
	 * Utilities functions TODO need further categorization
	 * 
	 */

	var lang = ((navigator.languages && navigator.languages[0]) || navigator.browserLanguage || navigator.language || navigator.userLanguage || 'en');
	var cachedPrefs = {};
	function isMobile() {
		return !!$('body').pagecontainer;
	}

	function loading(fShow) {
		console.log('loading ' + fShow);
		if (fShow) {
			if ($('#loading').size() == 0) {
				$('<div>', {
					'id' : 'loading'
				}).appendTo($('body'));
			}
		} else {
			$('#loading').remove();
		}
	}

	function getPreferences(cache) {
		if (!cache) {
			cachedPrefs = {
				'dist' : $('#dist').val(),
				'preset' : $('#preset').val(),
				'min_width' : $('#min_width').val(),
				'slope' : $('#slope').val(),
				'road_condition' : $('#road_condition').val(),
				'stairs' : $('#stairs').val(),
				'deff_LV' : $('#deff_LV').val(),
				'esc' : $('#esc').val(),
				'mvw' : $('#mvw').val(),
				'elv' : $('#elv').val()
			};
			if (window.localStorage) {
				localStorage.setItem('preferences', JSON.stringify(cachedPrefs));
				console.log('Save Preferences')
			}
		}
		return cachedPrefs;
	}

	function loadPreferences() {
		var prefStr = localStorage.getItem('preferences');
		if (prefStr) {
			cachedPrefs = JSON.parse(prefStr);
			for ( var key in cachedPrefs) {
				var value = cachedPrefs[key];
				console.log(key + '=' + value);
				$('#' + key).val(value);
			}
		}
		$('#preset').bind("change", function(event, ui) {
			adjustCustom();
		});
		adjustCustom();
		onPrefChange();
	}

	function adjustCustom() {
		if (isMobile()) {
			var preset = $('#preset').val();
			switch (preset) {
			case '1':
				$('#min_width').val('9');
				$('#slope').val('9');
				$('#road_condition').val('9');
				$('#stairs').val('9');
				$('#deff_LV').val('9');
				$('#esc').val('9');
				$('#mvw').val('9');
				$('#elv').val('9');
				break;
			case '2':
				$('#min_width').val('2');
				$('#slope').val('1');
				$('#road_condition').val('1');
				$('#stairs').val('1');
				$('#deff_LV').val('1');
				$('#esc').val('1');
				$('#mvw').val('1');
				$('#elv').val('2');
				break;
			case '3':
				$('#min_width').val('3');
				$('#slope').val('9');
				$('#road_condition').val('1');
				$('#stairs').val('1');
				$('#deff_LV').val('9');
				$('#esc').val('1');
				$('#mvw').val('9');
				$('#elv').val('9');
				break;
			}
			if (preset == '9') {
				$('.custom_menues').show();
			} else {
				$('.custom_menues').hide();
				localStorage.setItem('preset', preset);
			}
			try {
				$('.custom_menues select').selectmenu('refresh', true);
			} catch (e) {
			}
			getPreferences();
		}
	}

	function onPrefChange() {
		if (!isMobile()) {
			return;
		}
		var user_mode = $hulop.mobile && $hulop.mobile.getPreference('user_mode');
		var preset;
		switch (user_mode) {
		case 'user_general':
			preset = '1';
			break;
		case 'user_wheelchair':
			preset = '2';
			break;
		case 'user_stroller':
			preset = '3';
			break;
		default:
			return;
		}
		if (preset != localStorage.getItem('preset')) {
			$('#preset').val(preset);
			$('#preset').change();
			try {
				$('#preset').selectmenu('refresh', true);
			} catch (e) {
			}
		}
	}

	var forceFlush;
	function speak(text, flush, flushNext) {
		flush |= forceFlush;
		forceFlush = flushNext;
		console.log(text);
		if ($hulop.mobile) {
			$hulop.mobile.speak(text, flush);
		} else if (('speechSynthesis' in window) && ('SpeechSynthesisUtterance' in window)) {
			var msg = new SpeechSynthesisUtterance();
			msg.volume = 1.0;
			msg.text = text;
			msg.lang = lang;
			if (flush && speechSynthesis.speaking) {
				speechSynthesis.cancel();
			}
			speechSynthesis.speak(msg);
		}
	}

	function isSpeaking(callback) {
		if ($hulop.mobile) {
			$hulop.mobile.isSpeaking(callback);
		} else if (('speechSynthesis' in window)) {
			setTimeout(function() {
				callback(speechSynthesis.speaking);
			})
		}
	}

	function startRecognizer(callback) {
		if ($hulop.mobile) {
			$hulop.mobile.startRecognizer(callback);
		} else {
			var text = prompt('Enter Text');
			text && callback([ text ]);
		}
	}

	function logText(text) {
		console.log('logText: ' + text);
		if ($hulop.mobile) {
			$hulop.mobile.logText(text);
		}
	}

	function vibrate(pattern) {
		if (navigator.vibrate) {
			navigator.vibrate(pattern);
		} else if ($hulop.mobile) {
			$hulop.mobile.vibrate(pattern);
		}
	}

	var polyline, projection;

	function isLocationOnEdge(center, poly, radius) {
		if (poly) {
			var cp = poly.getClosestPoint(center);
			var dist = computeDistanceBetween(cp, center);
			// console.log(dist);
			return dist <= radius;
		}
		return false;
	}

	function computeRouteHeading(center, poly, firstLink) {
		center = center || poly.getFirstCoordinate();
		var heading = computeHeading(center, poly.getLastCoordinate());
		var closest = poly.getClosestPoint(center);
		var tryNext = false;
		var shortLink = firstLink ? 5 : 2;
		poly.forEachSegment(function(start, end) {
			var point = new ol.geom.LineString([ start, end ]).getClosestPoint(center);
			if (tryNext || (point[0] == closest[0] && point[1] == closest[1])) {
				heading = computeHeading(start, end);
				tryNext = computeDistanceBetween(start, end) < shortLink;
			}
			shortLink = 2;
		});
		return heading;
	}

	function getGeoJSON(type, coordinates, properties) {
		return {
			'geometry' : {
				'type' : type,
				'coordinates' : coordinates
			},
			'type' : 'Feature',
			'properties' : properties || {}
		};
	}

	function getDirection(from, to) {
		return {
			'start' : from,
			'end' : to,
			'heading' : computeHeading(from, to),
			'distance' : computeDistanceBetween(from, to)
		}
	}

	function getAngle1(from, to) {
		if (from && to && from.distance && to.distance) {
			var angle = (((to.heading - from.heading) % 360) + 360) % 360; // 0-360
			return (angle > 180) ? angle - 360 : angle; // +-180
		}
		return 0;
	}

	function getAngle(from, to) {
		var angle = getAngle1(from, to);
		if (angle == 0 || from.end == to.start) {
			return angle;
		}
		if (Math.abs(angle) < 175) {
			return angle;
		}
		return getAngle1(from, getDirection(from.end, to.start)) > 0 ? 170 : -170;
	}

	function toDMS(dd) {
		var sign = '';
		if (dd < 0) {
			sign = '-'
			dd = -dd;
		}
		var deg = Math.floor(dd);
		var frac = Math.abs(dd - deg);
		var min = Math.floor(frac * 60);
		var sec = Math.floor(frac * 3600 - min * 60);
		var ms = Math.round(frac * 3600000 - min * 60000 - sec * 1000);
		if (ms >= 1000) {
			ms -= 1000;
			sec++;
		}
		if (sec >= 60) {
			sec -= 60;
			min++;
		}
		if (min >= 60) {
			min -= 60;
			deg++;
		}
		function fix(num, digit) {
			var s = '' + num;
			return '000'.substr(0, digit - s.length) + s;
		}
		return sign + deg + '.' + fix(min, 2) + '.' + fix(sec, 2) + '.' + fix(ms, 3);
	}

	function encodeUcode(lat, lng, floor, seq) {
		lat = Math.floor(lat * 36000);
		lng = Math.floor(lng * 36000);
		floor = floor == 0 ? 0x1FF : (floor + 50) * 2;
		var segments = [ (lat << 7) + (lng >> 17), ((lng & 0x1FFFF) << 15) + (floor << 6) + seq ];
		segments = segments.map(function(val) {
			var x = Number(val).toString(16).toUpperCase();
			return '00000000'.substr(0, 8 - x.length) + x;
		});
		return '00001B0000000003' + segments[0] + segments[1];
	}

	function decodeUcode(code) {
		if (code.startsWith('00001B0000000003')) {
			var segments = [ parseInt(code.substr(16, 8), 16), parseInt(code.substr(24, 8), 16) ];
			var lat = segments[0] >> 7;
			var lng = ((segments[0] & 0x3F) << 17) + (segments[1] >> 15);
			var floor = ((segments[1] & 0x7FC0) >> 6);
			var seq = segments[1] & 0x3F;
			return {
				'ucode' : code,
				'lat' : lat / 36000,
				'lng' : lng / 36000,
				'floor' : floor == 0x1FF ? 0 : floor / 2 - 50,
				'seq' : seq
			};
		}
	}

	function getScript(url) {
		var s = document.createElement('script');
		s.src = url;
		document.head.appendChild(s);
		console.log('getScript: ' + url);
	}

	var wgs84Sphere = new ol.Sphere(6378137);

	function degToRad(deg) {
		return (deg * Math.PI / 180.0)
	}

	function radToDeg(rad) {
		return (rad * 180.0 / Math.PI)
	}

	function newLatLng(lat, lng) {
		return [ lng, lat ];
	}

	function computeDistanceBetween(from, to) {
		return wgs84Sphere.haversineDistance(from, to);
	}

	function computeHeading(from, to) {
		var dlng = degToRad(to[0] - from[0]);
		var lat1 = degToRad(from[1]);
		var lat2 = degToRad(to[1]);
		var y = Math.sin(dlng) * Math.cos(lat2);
		var x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dlng);
		return radToDeg(Math.atan2(y, x));
	}

	function computeOffset(from, distance, heading) {
		var R = 6378137;
		var lat1 = degToRad(from[1]);
		var lng1 = degToRad(from[0]);
		var bearing = degToRad(heading);

		var lat2 = Math.asin(Math.sin(lat1) * Math.cos(distance / R) + Math.cos(lat1) * Math.sin(distance / R) * Math.cos(bearing));
		var lng2 = lng1 + Math.atan2(Math.sin(bearing) * Math.sin(distance / R) * Math.cos(lat1), Math.cos(distance / R) - Math.sin(lat1) * Math.sin(lat2));
		return newLatLng(radToDeg(lat2), radToDeg(lng2));
	}

	function computeLength(path) {
//		if (path.array != null)
//			path = path.array;
		var distance = 0;
		for (var i = 1; i < path.length; i++) {
			distance = distance + computeDistanceBetween(path[i - 1], path[i]);
		}
		return distance;
	}

	var D2R = Math.PI / 180;
	var R2D = 180 / Math.PI;
	function normalizeDegree(angle) {
		var c = Math.cos(angle * D2R);
		var s = Math.sin(angle * D2R);
		return Math.atan2(s, c) * R2D;
	}
	function mergeDegree(a, b, p) {
		var ac = Math.cos(a * D2R);
		var as = Math.sin(a * D2R);
		var bc = Math.cos(b * D2R);
		var bs = Math.sin(b * D2R);
		return Math.atan2(as * p + bs * (1 - p), ac * p + bc * (1 - p)) * R2D;
	}

	return {
		'isMobile' : isMobile,
		'loading' : loading,
		'getPreferences' : getPreferences,
		'loadPreferences' : loadPreferences,
		'speak' : speak,
		'isSpeaking' : isSpeaking,
		'startRecognizer' : startRecognizer,
		'logText' : logText,
		'vibrate' : vibrate,
		'isLocationOnEdge' : isLocationOnEdge,
		'getGeoJSON' : getGeoJSON,
		'getDirection' : getDirection,
		'getAngle' : getAngle,
		'toDMS' : toDMS,
		'encodeUcode' : encodeUcode,
		'decodeUcode' : decodeUcode,
		'getScript' : getScript,
		'newLatLng' : newLatLng,
		'normalizeDegree' : normalizeDegree,
		'mergeDegree' : mergeDegree,
		'computeDistanceBetween' : computeDistanceBetween,
		'computeHeading' : computeHeading,
		'computeRouteHeading' : computeRouteHeading,
		'computeOffset' : computeOffset,
		'onPrefChange' : onPrefChange,
		'computeLength' : computeLength
	};

}();

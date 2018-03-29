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

$hulop.route = function() {
	/**
	 * Hokou-Kukan Network related functions
	 * http://www.mlit.go.jp/common/001177504.pdf
	 * http://www.mlit.go.jp/common/001177505.pdf
	 */

	var user = new Date().getTime();
	var lang = ((navigator.languages && navigator.languages[0]) || navigator.browserLanguage || navigator.language || navigator.userLanguage || 'en').substr(0,
			2);
	var offline = false;
	var naviCondition = {};

	function isLink(obj) {
		return obj.properties.link_id;
	}

	function linkInfo(obj) {
		dump(obj);
		if (isLink(obj)) {
			var properties = obj.properties;
			var tmp = getLinkInfo(obj);
			var name = tmp.name;
			var type = tmp.type;
			var announce = true, elevator = false;
			switch (type) {
			case 101: // Sidewalk, Pedestrian road, Garden path or Free passage
			case 107: // Indoor route
				announce = false;
				break;
			case 4: // Elevator 
				elevator = true;
				break;
			}
			function getDir(angle, elevator) {
				var a = Math.abs(angle);
				var dir;
				if (a < 60) {
					dir = 'SLIGHT';
				} else if (a < 120) {
					dir = elevator ? 'ELEVATOR' : 'TURN';
				} else if (a < 150) {
					dir = 'SHARP';
				} else {
					dir = 'UTURN';
				}
				// if (a < 175) {
				dir += (angle > 0 ? '_RIGHT' : '_LEFT');
				// }
				return dir;
			}
			function getTitle(angle, elevator) {
				if (!angle) {
					return name;
				}
				dir = getDir(angle, elevator);
				return announce ? $m(dir + '_THEN', name) : $m(dir);
			}
			var accInfo = "";
			if ($hulop.util.getPreferences(true).slope != '9') {
				if (properties['vtcl_slope'] == 2 || properties['vtcl_slope'] == 3) {
					if (accInfo) {
						accInfo += ', ';
					}
					accInfo += $m('ACC_SLOPE');
				}
			}
			if ($hulop.util.getPreferences(true).deff_LV != '9') {
				if (properties['lev_diff'] == 2) {
					if (accInfo) {
						accInfo += ', ';
					}
					accInfo += $m('ACC_STEP');
				}
			}
			var length = elevator ? 0 : properties['distance'];
			if (length == 0 && !elevator) {
				console.error('link length is 0');
				console.error(obj);
			}
			var pl = getText('LINK_POI_' + type), ps = getText('DOOR_' + properties.sourceDoor), pe = getText('DOOR_' + properties.targetDoor);
			var poi_link = [], poi_start = [], poi_end = [];
			if (pl) {
				poi_link.push(pl);
			}
			if (ps) {
				poi_start.push(ps);
				poi_link.push(ps);
			}
			if (pe) {
				poi_end.push(pe);
				poi_link.push(pe);
			}
			var pd = getText('DOOR_' + properties.door_type);
			if (pd) {
				poi_end.push(pd);
				poi_link.push(pd);
			}
			return {
				'name' : name,
				'type' : type,
				'accInfo' : accInfo,
				'announce' : announce,
				'getDir' : getDir,
				'getTitle' : getTitle,
				'afterPrefix' : getAfterPrefix(obj),
				'length' : length,
				'elevator' : elevator,
				'poi_link' : poi_link,
				'poi_start' : poi_start,
				'poi_end' : poi_end,
				'backward' : properties.sourceNode == obj.properties['end_id']
			};
		}
	}

	function dump(obj) {
		if (isLink(obj)) {
			console.log(getLinkInfo(obj).name + ': ' + (obj.properties['st_name'] || ''))
		}
		console.log(obj);
	}

	function getText(id) {
		var text = $m(id);
		return text != id && text;
	}

	function getLinkInfo(obj) {
		var type = getRouteType(obj);
		var linkName = getText('LINK_TYPE_' + type);
		var floorDiff = (obj.properties.targetHeight || 0) - (obj.properties.sourceHeight || 0);
		if (floorDiff != 0 && type == 4) { // Elevator
			var floor = (obj.properties.targetHeight || 0);
			if (floor >= 0) {
				floor = $m('FLOOR', floor == 0 ? 1 : floor);
			} else {
				floor = $m('UNDER_FLOOR', -floor);
			}
			return {
				name : $m('MOVE_FLOOR', linkName, floor),
				type : type
			}
		}
		if (floorDiff > 0) {
			linkName = $m('UP', linkName);
		} else if (floorDiff < 0) {
			linkName = $m('DOWN', linkName);
		}
		return {
			name : linkName,
			type : type
		}
	}

	function getAfterPrefix(obj) {
		var floorDiff = (obj.properties.targetHeight || 0) - (obj.properties.sourceHeight || 0);
		var type = getRouteType(obj);
		switch (type) {
		case 103: // Crosswalk
		case 2: // Moving walkway
		case 3: // Railroad crossing
		case 4: // Elevator
		case 7: // Slope
			return 'AFTER_' + type;
		case 5: // Escalator
		case 6: // Stairs
			if (floorDiff > 0) {
				return 'AFTER_' + type + '_UP';
			} else if (floorDiff < 0) {
				return 'AFTER_' + type + '_DOWN';
			}
			break;
		}
	}

	var styles = {
		'node' : new ol.style.Style({
			'image' : new ol.style.Icon({
				'anchor' : [ 0.5, 1 ],
				'scale' : 36 / 25,
				'anchorXUnits' : 'fraction',
				'anchorYUnits' : 'fraction',
				'src' : 'images/map-marker.png'
			})
		}),
		'elevator' : new ol.style.Style({
			'image' : new ol.style.Icon({
				'anchor' : [ 0.5, 1 ],
				'anchorXUnits' : 'fraction',
				'anchorYUnits' : 'fraction',
				'src' : 'images/ev.png'
			}),
			'stroke' : new ol.style.Stroke({
				'color' : 'black',
				'width' : 6
			})
		}),
		'link' : new ol.style.Style({
			'stroke' : new ol.style.Stroke({
				'color' : '#00B4B4',
				'width' : 10
			})
		})
	};

	function getStyle(feature) {
		var floor = $hulop.indoor && $hulop.indoor.getCurrentFloor() || 0;
		var properties = feature.getProperties();
		if (properties.link_id) {
			if (floor) {
				if ($hulop.indoor && !$hulop.indoor.isVisible(properties['sourceHeight']) && !$hulop.indoor.isVisible(properties['targetHeight'])) {
					return null;
				}
			}
			return properties['route_type'] == 4 ? styles.elevator : styles.link;
		} else if (properties.node_id) {
			if (floor) {
				var height = properties['floor'];
				if (!height) {
					return null;
				}
				if ($hulop.indoor && !$hulop.indoor.isVisible(height)) {
					return null;
				}
			}
			return styles.node;
		}
	}

	function levelDiff(floor, height) {
		floor > 0 && floor--;
		height > 0 && height--;
		return Math.abs(floor - height);
	}

	function callService(data, callback) {
		if (offline) {
			callback({
				'error' : 'offline'
			});
			return;
		}
		sendData('post', 'routesearch', data, callback);
		if (data.action == 'search') {
			naviCondition = {
				'from' : data.from,
				'to' : data.to
			};
		}
	}

	function sendData(type, url, data, callback) {
		data.quiet || $hulop.util.loading(true);
		data.user = data.user || ($hulop.logging && $hulop.logging.getClientId()) || user;
		data.lang = data.lang || lang;
		$.ajax({
			'type' : type,
			'url' : url,
			'data' : data,
			'success' : function(result) {
				$hulop.util.loading(false);
				callback(result);
			},
			'error' : function(XMLHttpRequest, textStatus, errorThrown) {
				$hulop.util.loading(false);
				console.error(textStatus + ' (' + XMLHttpRequest.status + '): ' + errorThrown);
				callback({
					'error' : XMLHttpRequest.status
				});
			}
		});
	}

	function getPoiName(obj, pron) {
		var name, exit;
		if (pron) {
			name = obj.name_pron || obj.name;
			exit = obj.exit_pron || obj.exit;
		} else {
			name = obj.name;
			exit = obj.exit;
		}
		if (exit) {
			name += ' ' + exit;
		}
		if (!name && obj.properties && obj.properties.facil_type == 10) {
			name = '';
			switch (obj.properties['sex']) {
			case 1:
				name += $m('FOR_MALE');
				break;
			case 2:
				name += $m('FOR_FEMALE');
				break;
			}
			switch (obj.properties['toilet']) {
			case 3:
			case 4:
			case 5:
			case 6:
				name += $m('FOR_DISABLED');
				break;
			}
			name += $m('TOILET');
		}
		return name;
	}

	function getRouteType(obj) {
		var type = obj.properties['route_type'];
		var struct = obj.properties['rt_struct'];
		if (struct != 99 && (type == 1 || type == 99)) {
			return 100 + struct;
		}
		return type;
	}

	return {
		'isLink' : isLink,
		'linkInfo' : linkInfo,
		'getStyle' : getStyle,
		'callService' : callService,
		'sendData' : sendData,
		'getPoiName' : getPoiName,
		'levelDiff' : levelDiff,
		'getNaviCondition' : function() {
			return naviCondition;
		},
		'setOffline' : function(flag) {
			offline = flag;
		}
	};

}();

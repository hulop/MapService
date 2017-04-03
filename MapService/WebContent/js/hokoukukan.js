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
	 * 歩行空間ネットワーク (Hokou-Kukan Network) related functions
	 * 
	 */

	var user = new Date().getTime();
	var lang = ((navigator.languages && navigator.languages[0]) || navigator.browserLanguage || navigator.language || navigator.userLanguage || 'en').substr(0,
			2);
	var offline = false;
	var naviCondition = {};

	function isLink(obj) {
		return obj.properties.category == 'リンクの情報';
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
			case '1': // Sidewalk
			case '3': // Park road
			case '8': // Free passage
				announce = false;
				break;
			case '10':
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
				var slope = properties['縦断勾配1'];
				if (slope && Number(slope) >= 3.33) {
					if (accInfo) {
						accInfo += ', ';
					}
					accInfo += $m('ACC_SLOPE');
				}
			}
			if ($hulop.util.getPreferences(true).deff_LV != '9') {
				switch (properties['段差']) {
				case '1':
				case '2':
				case '3':
					if (accInfo) {
						accInfo += ', ';
					}
					accInfo += $m('ACC_STEP');
					break;
				}
			}
			var length = elevator ? 0 : Number(properties['リンク延長']);
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
				'backward' : properties.sourceNode == obj.properties['終点ノードID']
			};
		}
	}

	function dump(obj) {
		if (isLink(obj)) {
			console.log(getLinkInfo(obj).name + ': ' + (obj.properties['通り名称または交差点名称'] || ''))
		}
		console.log(obj);
	}

	function getText(id) {
		var text = $m(id);
		return text != id && text;
	}

	function getLinkInfo(obj) {
		var type = obj.properties['経路の種類'];
		var linkName = getText('LINK_TYPE_' + type);
		var floorDiff = (obj.properties.targetHeight || 0) - (obj.properties.sourceHeight || 0);
		if (floorDiff != 0 && type == '10') {
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
		var type = obj.properties['経路の種類'];
		switch (type) {
		case '5': // Crosswalk
		case '7': // Moving walkway
		case '9': // Railroad crossing
		case '10': // Elevator
		case '13': // Slope
			return 'AFTER_' + type;
		case '11': // Escalator
		case '12': // Stairs
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
		switch (properties.category) {
		case 'リンクの情報':
			if (floor) {
				if (levelDiff(floor, properties['sourceHeight']) >= 1 && levelDiff(floor, properties['targetHeight']) >= 1) {
					return null;
				}
			}
			if (properties['エレベーター種別']) {
				return styles.elevator;
			} else {
				return styles.link;
			}
			break;
		case 'ノード情報':
			if (floor) {
				var height = properties['高さ'];
				if (!height || levelDiff(floor, Number(height.replace('B', '-'))) >= 1) {
					return null;
				}
			}
			return styles.node;
			break;
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
		$hulop.util.loading(true);
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
		if (!name && obj.category == '公共用トイレの情報') {
			name = '';
			if (obj.properties) {
				switch (obj.properties['男女別']) {
				case '1':
					name += $m('FOR_MALE');
					break;
				case '2':
					name += $m('FOR_FEMALE');
					break;
				}
				switch (obj.properties['多目的トイレ']) {
				case '1':
				case '2':
					name += $m('FOR_DISABLED');
					break;
				}
			}
			name += $m('TOILET');
		}
		return name;
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

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

$hulop.editor.ext = function() {
	// Hokoukukan network dependency
	var linkKey = '接続リンクID#', nodeKeys = [ '起点ノードID', '終点ノードID' ], typeKeys = [ 'エレベーター種別', 'elevator_equipments' ];
	var numberKeys = [];
	var elevetor_type_info = '\n  0: not included\n  1: braille and audio\n  2: wheelchair\n  3: 1&2\n  9: unknown';
	function isElevatorLink(link) {
		return link && link.get('リンクID') && link.get('エレベーター種別');
	}
	function isElevetorNode(node) {
		return node && node.get('ノードID');
	}
	function getFloor(node) {
		return Number(node && node.get('高さ'));
	}
	function createNode(nodeID, geometry, floor) {
		return $hulop.editor.newFeature({
			'type' : 'Feature',
			'geometry' : geometry,
			'properties' : {
				'file' : 'EDITOR',
				'category' : 'ノード情報',
				'ノードID' : nodeID,
				'高さ' : '' + floor
			}
		});
	}
	function createElevatorLink(linkID, geometry, node1, node2) {
		[ node1, node2 ].forEach(function(node) {
			for (var i = 1; i <= 99; i++) {
				if (!node.get('接続リンクID' + i)) {
					node.set('接続リンクID' + i, linkID)
					break;
				}
			}
		});
		return $hulop.editor.newFeature({
			'type' : 'Feature',
			'geometry' : geometry,
			'properties' : {
				'file' : 'EDITOR',
				'category' : 'リンクの情報',
				'リンクID' : linkID,
				'起点ノードID' : node1.getId(),
				'終点ノードID' : node2.getId(),
				'経路の種類' : '10',
				'エレベーター種別' : '9',
				'方向性' : '0',
				'通行制限' : '0',
				'手すり' : '0',
				'屋根の有無' : '0',
				'蓋のない溝や水路の有無' : '0',
				'主な利用者' : '0',
				'縦断勾配1' : '0',
				'縦断勾配2' : '0',
				'横断勾配' : '0',
				'路面状況' : '0',
				'段差' : '0',
				'リンク延長' : '0'
			}
		});
	}

	// Common
	var separator = '\n------------------------------\n';
	var elevetor_equipments_info = '\n  [_button_right_|_button_right_braille_]\n  [_button_left_|_button_left_braille_]';
	var elevetor_prompts = [ 'Change Elevator Type' + separator + 'Enter elevetor type' + elevetor_type_info,
			'Change Elevator Equipments' + separator + 'Enter elevetor equipments' + elevetor_equipments_info ];
	var source = $hulop.map.getRouteLayer().getSource();

	function getLinks(node) {
		var links = [];
		for (var i = 1; i <= 99; i++) {
			var linkId = node.get(linkKey.replace('#', i));
			var link = linkId && source.getFeatureById(linkId);
			link && links.push(link);
		}
		return links;
	}

	function getNodes(link) {
		var nodes = [];
		nodeKeys.forEach(function(key) {
			var nodeId = link.get(key);
			var node = nodeId && source.getFeatureById(nodeId);
			node && nodes.push(node);
		});
		return nodes;
	}

	function createElevator(feature) {
		if (!isElevetorNode(feature)) {
			alert('Please select a node');
			return;
		}
		var floors = prompt('Create Elevetor' + separator
				+ 'Enter floor numbers\n  (example)\n    1,3,5,7,9\n    -1:10 (=-1,1,2,3,4,5,6,7,8,9,10)');
		if (floors == null) {
			return;
		}

		var m = /^\s*(-?\d+)\s*:\s*(-?\d+)\s*$/.exec(floors);
		var array = [];
		if (m && !isNaN(m[1]) && !isNaN(m[2])) {
			var s = Number(m[1]), e = Number(m[2]);
			for (var i = s; i <= e; i++) {
				i && array.push(i);
			}
		} else {
			try {
				array = eval('[' + floors + ']');
			} catch (e) {
			}
		}
		var nodeFloor = getFloor(feature);
		if (!Array.isArray(array) || array.length < 2 || array.indexOf(nodeFloor) == -1) {
			alert('Invalid floor numbers ' + floors);
			return;
		}
		var geometry = {
			'type' : 'Point',
			'coordinates' : ol.proj.transform(feature.getGeometry().getCoordinates(), 'EPSG:3857', 'EPSG:4326')
		};
		var time = new Date().getTime(), nodes = [];
		array = array.sort(function(a, b) {
			return a - b;
		}).filter(function(item, pos, self) {
			return self.indexOf(item) == pos;
		})
		array.forEach(function(floor) {
			if (floor == nodeFloor) {
				nodes.push(feature);
				return;
			}
			nodes.push(createNode('EDITOR_node_' + time++, geometry, floor));
		});
		for (var i = 1; i < nodes.length; i++) {
			createElevatorLink('EDITOR_link_' + time++, geometry, nodes[i - 1], nodes[i]);
		}
	}

	function changeElevator(feature, type) {
		if (!isElevatorLink(feature)) {
			alert('Please select an elevetor link');
			return;
		}
		var key = typeKeys[type];
		var text = prompt(elevetor_prompts[type], feature.get(key) || '');
		if (text == null || (type == 0 && isNaN(text))) {
			return;
		}
		var visited = [];
		function scanElevatorLink(link) {
			if (visited.indexOf(link) == -1) {
				visited.push(link);
				if (isElevatorLink(link)) {
					if (text == '') {
						link.unset(key);
					} else if (numberKeys.indexOf(key) == -1) {
						link.set(key, text);
					} else if (isNaN(text)) {
						link.unset(key);
					} else {
						link.set(key, Number(text));
					}
					getNodes(link).forEach(function(node) {
						getLinks(node).forEach(scanElevatorLink);
					});
				}
			}
		}
		scanElevatorLink(feature);
	}

	return {
		'createElevator' : createElevator,
		'changeElevator' : changeElevator
	};

}();

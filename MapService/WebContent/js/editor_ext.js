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
	var linkKey = 'link#_id', nodeKeys = [ 'start_id', 'end_id' ], typeKeys = [ 'elevator', 'hulop_elevator_equipments' ];
	var numberKeys = ['elevator'];
	var elevetor_type_info = '\n  1: without elevator\n  2: with elevator (not accessible)\n  3: with elevator (accessible to wheelchair users)\n  4: with elevator (accessible to visually impaired persons)\n  5: with elevator (accessible to wheelchair users and visually impaired persons)\n  99: unknown';
	function isElevatorLink(link) {
		return link && link.get('link_id') && (link.get('route_type') == 4);
	}
	function isElevetorNode(node) {
		return node && node.get('node_id');
	}
	function getFloor(node) {
		return node && node.get('floor');
	}
	function createNode(nodeID, geometry, floor) {
		return $hulop.editor.newFeature({
			'type' : 'Feature',
			'geometry' : geometry,
			'properties' : {
				'hulop_file' : 'EDITOR',
				'node_id' : nodeID,
				'floor' : '' + floor,
				'in_out': floor == 0 ? 1 : 3
			}
		});
	}
	function createElevatorLink(linkID, geometry, node1, node2) {
		[ node1, node2 ].forEach(function(node) {
			for (var i = 1; i <= 99; i++) {
				if (!node.get('link' + i + '_id')) {
					node.set('link' + i + '_id', linkID)
					break;
				}
			}
		});
		return $hulop.editor.newFeature({
			'type' : 'Feature',
			'geometry' : geometry,
			'properties' : {
				'hulop_file' : 'EDITOR',
				'link_id': linkID,
				'start_id': node1.get('node_id'),
				'end_id': node2.get('node_id'),
				'rt_struct': 7,
				'route_type': 4,
				'elevator' : 99,
				'direction': 1,
				'width': 99,
				'vtcl_slope': 99,
				'lev_diff': 99,
				'tfc_signal': 99,
				'tfc_s_type': 99,
				'brail_tile': 99,
				'elevator': 99,
				'roof': 99,
				'distance' : 0
			}
		});
	}

	// Common
	var separator = '\n------------------------------\n';
	var elevetor_equipments_info = '\n  [_button_right_｜_button_right_braille_]\n  [_button_left_｜_button_left_braille_]';
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

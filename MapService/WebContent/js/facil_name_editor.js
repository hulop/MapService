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
var $hulop = window.opener.$hulop;
var $names = [ 'facil_id', 'floors', 'entrances', 'hulop_building', 'hulop_major_category', 'hulop_sub_category',
		'hulop_show_labels_zoomlevel' ];
var $numbers = [ 'hulop_show_labels_zoomlevel' ];
$names = $names.concat([ 'name_ja', 'name_hira', 'name_en', 'name_es', 'name_fr', 'name_ko', 'name_zh-CN' ]);
$names = $names.concat([ 'hulop_long_description', 'hulop_long_description_ja', 'hulop_long_description_hira',
		'hulop_long_description_en', 'hulop_long_description_es', 'hulop_long_description_fr', 'hulop_long_description_ko',
		'hulop_long_description_zh-CN' ]);
var $exit_names = [ 'ent#_node', 'ent#_fl', 'ent#_n', 'ent#_n_ja', 'ent#_n_hira', 'ent#_n_en', 'ent#_n_es', 'ent#_n_fr',
		'ent#_n_ko', 'ent#_n_zh-CN' ];

function isFacility(feature) {
	return feature.get('facil_id') && feature.get('hulop_major_category') != '_nav_poi_' && feature.get('facil_type') != 10;
}

function getExitList(feature) {
	return $hulop.editor.findExit(feature).map(function(exit) {
		var floor = Number(feature.get('ent' + exit.ent_index + '_fl'));
		return {
			'feature' : feature,
			'floor' : floor,
			'data' : $exit_names.map(function(name, col) {
				name = name.replace('#', exit.ent_index);
				return {
					'name' : name,
					'value' : /ent\d_fl/.test(name) ? floorText(floor) : feature.get(name)
				};
			})
		};
	});
}

function floorText(floor) {
	return (floor < 0 ? 'B' + (-floor) : floor) + 'F';
}

$(document).ready(function() {
	function getFacilList() {
		var source = $hulop.map.getRouteLayer().getSource();
		return source.getFeatures().filter(isFacility).map(function(feature) {
			var floors = $hulop.editor.getHeights(feature).sort();
			return {
				'feature' : feature,
				'data' : $names.map(function(name, col) {
					var value;
					switch (name) {
					case 'floors':
						value = floors.map(floorText);
						break;
					case 'entrances':
						value = $hulop.editor.findExit(feature).length;
						break;
					default:
						value = feature.get(name);
						break;
					}
					return {
						'name' : name,
						'value' : value
					};
				})
			};
		});
	}

	function createFacil() {
		// Create table
		$('#facil').empty();
		var table = $('<table>').appendTo($('#facil'));

		// Create thead
		var thead = $('<thead>').appendTo(table);
		var head_tr = $('<tr>').appendTo(thead);
		$names.forEach(function(name) {
			head_tr.append($('<th>', {
				'css' : {
					'background-color' : 'lightgreen'
				},
				'text' : name.replace(/^hulop_/, '')
			}));
		});
		return table;
	}

	function createExit(target) {
		// Create table
		target.empty();
		var table = $('<table>').appendTo(target);

		// Create thead
		var thead = $('<thead>').appendTo(table);
		var head_tr = $('<tr>').appendTo(thead);
		$exit_names.forEach(function(name) {
			head_tr.append($('<th>', {
				'css' : {
					'background-color' : 'lightblue'
				},
				'text' : name
			}));
		});
		return table;
	}

	// Create tbody
	function createCell(feature, name, value, editable) {
		var color = '#eee';
		if (editable) {
			color = '#fff';
			if (value) {
				var text = value.trim().replace(/[\t\r\n]/g, ' ');
				if (value != text) {
					console.error('"' + value + '" > "' + text + '"')
					feature.set(name, value = text);
					color = 'lightblue';
				}
			}
		}
		var td = $('<td>', {
			'contenteditable' : editable,
			'css' : {
				'background-color' : color
			},
			'text' : value
		});
		if (editable) {
			var onInput = function(event) {
				var text = $(event.target).text().trim().replace(/[\t\r\n]/g, ' ');
				if ($numbers.indexOf(name) == -1) {
					feature.set(name, text);
				} else {
					if (text == '' || isNaN(text)) {
						feature.unset(name);
					} else {
						feature.set(name, Number(text));
					}
				}
			};
			td.on('input', onInput);
		}
		return td;
	}

	var table = createFacil();
	var tbody = $('<tbody>').appendTo(table);
	var current_facil;
	getFacilList().forEach(function(facil) {
		var body_tr = $('<tr>', {
			'click' : function(event) {
				if (current_facil != facil) {
					current_facil = facil;
					$hulop.editor.showProperty(facil.feature);
					var exitList = getExitList(facil.feature);
					if (exitList.length == 0) {
						$('#exit').empty();
						return;
					}
					var table = createExit($('#exit'));
					var tbody = $('<tbody>').appendTo(table);
					exitList.forEach(function(exit, index) {
						var body_tr = $('<tr>', {
							'click' : function() {
								$hulop.indoor.showFloor(exit.floor);
							}
						}).appendTo(tbody);
						exit.data.forEach(function(item, col) {
							body_tr.append(createCell(exit.feature, item.name, item.value, col > 1));
						});
					});
					table.DataTable();
				}
				if (event.target.cellIndex == 2) {
					// $(document).scrollTop($('#exit').offset().top);
				}
			}
		}).appendTo(tbody);
		facil.data.forEach(function(item, col) {
			body_tr.append(createCell(facil.feature, item.name, item.value, col > 2));
		});
	});
	table.DataTable()
});
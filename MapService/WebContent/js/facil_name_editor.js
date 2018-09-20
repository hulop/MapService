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
var $names = [ 'facil_id', 'floors', 'entrances', 'hulop_building', 'hulop_major_category', 'hulop_sub_category',
		'hulop_show_labels_zoomlevel' ];
var $numbers = [ 'hulop_show_labels_zoomlevel' ];
$names = $names.concat([ 'name_ja', 'name_hira', 'name_en', 'name_es', 'name_fr', 'name_ko', 'name_zh-CN' ]);
$names = $names.concat([ 'hulop_long_description', 'hulop_long_description_ja', 'hulop_long_description_hira',
		'hulop_long_description_en', 'hulop_long_description_es', 'hulop_long_description_fr', 'hulop_long_description_ko',
		'hulop_long_description_zh-CN' ]);
var $exit_names = [ 'ent#_node', 'ent#_fl', 'ent#_n', 'ent#_n_ja', 'ent#_n_hira', 'ent#_n_en', 'ent#_n_es', 'ent#_n_fr',
		'ent#_n_ko', 'ent#_n_zh-CN' ];
var $facil_filter = [ 'facil_id', 'name_ja', 'name_en' ];
var $facil_default = {};

function isFacility(feature) {
	return feature.get('facil_id') && feature.get('hulop_major_category') != '_nav_poi_' && feature.get('facil_type') != 10;
}

function getExitList(source, feature) {
	return $hulop.editor.findExit(feature).map(function(exit) {
		var node = source.getFeatureById(exit.node_id);
		var floor = Number(feature.get('ent' + exit.ent_index + '_fl'));
		return {
			'feature' : feature,
			'node' : node,
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

function getFeatureKeys(facil, node, keys) {
	var featureKeys;
	$hulop.editor.findExit(facil).forEach(function(exit) {
		if (exit.node_id == node.getId()) {
			featureKeys = keys.map(function(key) {
				return {
					'feature' : facil,
					'key' : key.replace('#', exit.ent_index)
				};
			});
		}
	});
	return featureKeys;
}

function floorText(floor) {
	return (floor < 0 ? 'B' + (-floor) : floor) + 'F';
}

$(document).ready(function() {
	var flashLayer = new ol.layer.Vector({
		'source' : new ol.source.Vector(),
		'style' : new ol.style.Style({
			'image' : new ol.style.Circle({
				'radius' : 20,
				'fill' : new ol.style.Fill({
					'color' : 'rgba(0,0,0,0.25)'
				}),
				'stroke' : new ol.style.Stroke({
					'color' : '#FFF',
					'width' : 3
				})
			})
		}),
		'zIndex' : 999
	});
	var map = $hulop.map.getMap();
	$(window).bind("beforeunload", function() {
		map.removeLayer(flashLayer);
	});
	map.addLayer(flashLayer);

	function flash(point) {
		flashLayer.getSource().addFeature(point);
		setTimeout(function() {
			flashLayer.getSource().removeFeature(point);
		}, 1000);
	}

	function getFacilList(source) {
		return source.getFeatures().filter(isFacility).map(function(feature) {
			var floors = $hulop.editor.getHeights(feature).sort(function(a, b) {
				return a - b;
			});
			return {
				'feature' : feature,
				'floors' : floors,
				'data' : $names.map(function(name, col) {
					var value;
					switch (name) {
					case 'floors':
						value = floors.map(floorText).join(',');
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

	function createTable(target, names, head_color) {
		// Create table
		target.empty();
		var table = $('<table>', {
			'class' : 'display cell-border compact'
		}).appendTo(target);

		// Create thead
		var thead = $('<thead>').appendTo(table);
		var head_tr = $('<tr>').appendTo(thead);
		names.forEach(function(name) {
			head_tr.append($('<th>', {
				'css' : {
					'background-color' : head_color
				},
				'text' : name.replace(/^hulop_/, '')
			}));
		});
		return table;
	}

	// Create tbody
	function createCell(feature, name, value, editable) {
		var color;
		if (editable && value && typeof value === 'string') {
			var text = value.trim().replace(/[\t\r\n]/g, ' ');
			if (value != text) {
				console.error('"' + value + '" > "' + text + '"')
				feature.set(name, value = text);
				color = 'lightblue';
			}
		}
		var td = $('<td>', {
			'contenteditable' : editable,
			'text' : value
		});
		color && td.css('background-color', color);
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

	var table = createTable($('#facil'), $names, 'lightgreen');
	var tbody = $('<tbody>').appendTo(table);
	var current_facil;
	var source = $hulop.map.getRouteLayer().getSource();
	getFacilList(source).forEach(function(facil) {
		var body_tr = $('<tr>', {
			'click' : function(event) {
				flash(facil.feature);
				if (current_facil != facil) {
					current_facil = facil;
					$hulop.editor.showProperty(facil.feature);
					var exitList = getExitList(source, facil.feature);
					if (exitList.length == 0) {
						$('#exit').empty();
						return;
					}
					if (facil.floors.indexOf($hulop.indoor.getCurrentFloor()) == -1) {
						$hulop.indoor.showFloor(facil.floors[0]);
					}
					var table = createTable($('#exit'), $exit_names, 'lightblue');
					var tbody = $('<tbody>').appendTo(table);
					exitList.forEach(function(exit, index) {
						var body_tr = $('<tr>', {
							'click' : function() {
								$hulop.indoor.showFloor(exit.floor);
								exit.node && flash(exit.node);
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
	table.DataTable();

	var bom = new Uint8Array([ 0xEF, 0xBB, 0xBF ]);
	function downloadFile(arrays, filename) {
		console.log([ arrays, filename ]);
		var type, data, blob;
		if (filename.endsWith('.json')) {
			type = 'json';
			data = JSON.stringify(arrays, null, '\t');
			blob = new Blob([ data ], {
				'type' : 'text/json;charset=utf-8;'
			});
		} else if (filename.endsWith('.csv')) {
			type = 'csv';
			data = $.csv.fromArrays(arrays);
			blob = new Blob([ bom, data ], {
				'type' : 'text/csv;charset=utf-8;'
			});
		} else {
			return;
		}
		if (navigator.msSaveBlob) {
			navigator.msSaveBlob(blob, filename);
		} else {
			var link = document.createElement('a');
			if (link.download !== undefined) {
				var url = URL.createObjectURL(blob);
				link.setAttribute('href', url);
				link.setAttribute('download', filename);
			} else {
				link.href = 'data:attachment/' + type + ',' + data;
			}
			link.style = 'visibility:hidden';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
	}

	window.export_json = function() {
		var arrays = getFacilList(source).map(function(facil) {
			var array = facil.data;
			getExitList(source, facil.feature).forEach(function(exit) {
				array = array.concat(exit.data);
			});
			return array;
		});
		downloadFile(arrays, 'facilities-all.json');
	}

	function values(item) {
		return item.value;
	}

	function import_csv(csv) {
		var arrays = $.csv.toArrays(csv);
		console.log(arrays);
		var rows = arrays.length;
		if (rows < 2) {
			return 'Empty data';
		}
		var header = arrays[0];
		var isExit;
		if (header.join() == $names.join()) {
		} else if (header.join() == $facil_filter.concat($exit_names).join()) {
			isExit = true;
		} else {
			return 'Unknown csv header';
		}
		var cols = header.length;
		for (var i = 1; i < rows; i++) {
			if (arrays[i].length != cols) {
				return 'Incorrect column count ' + arrays[i].length + ' at row ' + (i + 1);
			}
		}
		var same = 0, ignore = 0, remove = 0, change = 0, error = 0;
		function update(feature, key, to) {
			var from = feature.get(key);
			if (from == to) {
				same++;
			} else if (to != '') {
				if ($numbers.indexOf(key) == -1) {
					feature.set(key, to);
					change++;
					console.log(key + ': change ' + from + ' to "' + to + '"');
				} else {
					if (isNaN(to)) {
						error++;
						console.error(key + ': error ' + to);
					} else {
						feature.set(key, Number(to));
						change++;
						console.log(key + ': change ' + from + ' to Number(' + to + ')');
					}
				}
			} else if (from != undefined) {
				feature.unset(key);
				remove++;
				console.log(key + ': remove ' + from);
			} else {
				ignore++;
			}
		}
		for (var i = 1; i < arrays.length; i++) {
			var row = arrays[i];
			var facil = source.getFeatureById(row[0]);
			if (isExit) {
				var node = source.getFeatureById(row[3]);
				var featureKeys = node && getFeatureKeys(facil, node, header);
				if (featureKeys) {
					featureKeys.forEach(function(item, index) {
						index > 4 && update(item.feature, item.key, row[index]);
					})
				} else {
					error++;
					console.error([ 'getFeatureKeys()', facil, node, header ]);
				}
			} else {
				header.forEach(function(key, index) {
					index > 2 && update(facil, key, row[index]);
				})
			}
		}
		if (change || remove || error) {
			(change || remove) && location.reload();
			return (change + remove) + ' change(s), ' + error + ' error(s)';
		}
		return 'No changes';
	}

	window.export_facil_csv = function() {
		var arrays = [ $names ].concat(getFacilList(source).map(function(facil) {
			return facil.data.map(values);
		}));
		downloadFile(arrays, 'facilities.csv');
	}

	window.export_ent_csv = function() {
		var arrays = [ $facil_filter.concat($exit_names) ];
		getFacilList(source).forEach(function(facil) {
			function filter(item) {
				return $facil_filter.indexOf(item.name) != -1;
			}
			function defaultValues(item, index) {
				if (item.value) {
					return item.value;
				}
				var name = $facil_default[item.name];
				if (name) {
					for (var i = 0; i < facil.data.length; i++) {
						var item = facil.data[i];
						if (item.name == name) {
							return item.value;
						}
					}
				}
			}
			var exitList = getExitList(source, facil.feature);
			if (exitList.length > 0) {
				var commons = facil.data.filter(filter).map(defaultValues);
				exitList.forEach(function(exit, index) {
					arrays.push(commons.concat(exit.data.map(values)));
				});
			}
		});
		downloadFile(arrays, 'entrances.csv');
	}

	window.import_file = function(input) {
		var file = input.files[0];
		if (file) {
			console.log(file);
			var fr = new FileReader();
			fr.addEventListener('load', function(e) {
				var result = import_csv(fr.result);
				result && alert(result);
			});
			fr.readAsText(file);
		}
		input.value = '';
	}
});
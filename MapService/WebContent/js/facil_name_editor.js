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
var $names = [ '施設ID', 'floors', 'entrances', 'building', 'major_category', 'sub_category', 'show_labels_zoomlevel' ];
var $numbers = [];
$names = $names.concat([ '名称', '名称:ja', '名称:ja-Pron', '名称:en', '名称:es', '名称:fr', '名称:ko', '名称:zh-CN' ]);
$names = $names.concat([ 'long_description', 'long_description:ja', 'long_description:ja-Pron', 'long_description:en',
		'long_description:es', 'long_description:fr', 'long_description:ko', 'long_description:zh-CN' ]);
var $exit_names = [ '対応ノードID', '高さ', '出入口の名称', '出入口の名称:ja', '出入口の名称:ja-Pron', '出入口の名称:en', '出入口の名称:es', '出入口の名称:fr', '出入口の名称:ko',
		'出入口の名称:zh-CN' ];

function isFacility(feature) {
	return feature.get('施設ID') && feature.get('major_category') != '_nav_poi_' && feature.get('category') != '公共用トイレの情報';
}

function getExitList(feature) {
	return $hulop.editor.findExit(feature).map(function(exit) {
		var source = $hulop.map.getRouteLayer().getSource();
		var node = source.getFeatureById(exit.get('対応ノードID'));
		var floor = Number(node && node.get('高さ'));
		return {
			'feature' : exit,
			'floor' : floor,
			'data' : $exit_names.map(function(name, col) {
				return {
					'name' : name,
					'value' : name == '高さ' ? floorText(floor) : exit.get(name)
				};
			})
		};
	});
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

	function getFacilList() {
		var source = $hulop.map.getRouteLayer().getSource();
		return source.getFeatures().filter(isFacility).map(function(feature) {
			var floors = $hulop.editor.getHeights(feature).sort();
			return {
				'feature' : feature,
				'floors' : floors,
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
		if (editable && value) {
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
	getFacilList().forEach(function(facil) {
		var body_tr = $('<tr>', {
			'click' : function(event) {
				flash(facil.feature);
				if (current_facil != facil) {
					current_facil = facil;
					$hulop.editor.showProperty(facil.feature);
					var exitList = getExitList(facil.feature);
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
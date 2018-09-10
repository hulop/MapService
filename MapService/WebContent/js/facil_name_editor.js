var $names = [ 'facil_id', 'floors', 'hulop_building', 'hulop_major_category', 'hulop_sub_category', 'hulop_show_labels_zoomlevel' ];
var $numbers = ['hulop_show_labels_zoomlevel'];
$names = $names.concat([ 'name_ja', 'name_hira', 'name_en', 'name_es', 'name_fr', 'name_ko', 'name_zh-CN' ]);
$names = $names.concat([ 'hulop_long_description', 'hulop_long_description_ja', 'hulop_long_description_hira',
		'hulop_long_description_en', 'hulop_long_description_es', 'hulop_long_description_fr', 'hulop_long_description_ko',
		'hulop_long_description_zh-CN' ]);
var $exit_names = [ 'ent#_node', 'ent#_fl', 'ent#_n', 'ent#_n_ja', 'ent#_n_hira', 'ent#_n_en', 'ent#_n_es', 'ent#_n_fr',
		'ent#_n_ko', 'ent#_n_zh-CN' ];

$(document).ready(function() {
	var $hulop = window.opener.$hulop;
	function floorText(floor) {
		return (floor < 0 ? 'B' + (-floor) : floor) + 'F';
	}
	function createCell(feature, name, value, editable, rowspan) {
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
			'rowspan' : rowspan || 1,
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

	$('body').empty();
	var table = $('<table>').appendTo($('body'));
	var thead = $('<thead>').appendTo(table);
	var tbody = $('<tbody>').appendTo(table);
	var head_tr = $('<tr>').appendTo(thead);
	$names.forEach(function(name) {
		head_tr.append($('<th>', {
			'css' : {
				'background-color' : 'lightgreen'
			},
			'text' : name.replace(/^hulop_/, '')
		}));
	});
	$exit_names.forEach(function(name) {
		head_tr.append($('<th>', {
			'css' : {
				'background-color' : 'lightblue'
			},
			'text' : name
		}));
	});

	var source = $hulop.map.getRouteLayer().getSource();
	source.getFeatures().forEach(function(feature) {
		if (feature.get('facil_id') && feature.get('hulop_major_category') != '_nav_poi_' && feature.get('facil_type') != 10) {
			var floors = $hulop.editor.getHeights(feature).sort();
			tr = $('<tr>', {
				'click' : function() {
					$hulop.editor.showProperty(feature);
				}
			}).appendTo(tbody);
			var exitList = $hulop.editor.findExit(feature);
			$names.forEach(function(name, col) {
				var value = name == 'floors' ? floors.map(floorText) : feature.get(name);
				tr.append(createCell(feature, name, value, col > 1, exitList.length));
			});
			exitList.forEach(function(exit, row) {
				if (row > 0) {
					tr = $('<tr>', {
						'click' : function() {
							$hulop.editor.showProperty(feature);
						}
					}).appendTo(tbody);
				}
				var floor = Number(feature.get('ent' + exit.ent_index + '_fl'));
				tr.click(function() {
					$hulop.indoor.showFloor(floor);
				});
				$exit_names.forEach(function(name, col) {
					name = name.replace('#', exit.ent_index);
					var value = /ent\d_fl/.test(name) ? floorText(floor) : feature.get(name);
					tr.append(createCell(feature, name, value, col > 1));
				});
			});
		}
	});
});
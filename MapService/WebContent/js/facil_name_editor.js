var $names = [ 'facil_id', 'floors', 'hulop_building', 'hulop_major_category', 'hulop_sub_category', 'hulop_show_labels_zoomlevel' ];
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
				var text = feature.get(name) || '';
				if (name == 'floors') {
					text = floors.map(floorText);
				}
				var editable = col > 1;
				tr.append($('<td>', {
					'rowspan' : exitList.length || 1,
					'contenteditable' : editable,
					'css' : {
						'background-color' : editable ? '#fff' : '#eee'
					},
					'text' : text
				}));
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
					var text = name == 'ent#_fl' ? floorText(floor) : feature.get(name.replace('#', exit.ent_index)) || '';
					var editable = col > 1;
					tr.append($('<td>', {
						'contenteditable' : editable,
						'css' : {
							'background-color' : editable ? '#fff' : '#eee'
						},
						'text' : text
					}));
				});
			});
		}
	});
});
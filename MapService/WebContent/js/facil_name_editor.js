var $names = [ '施設ID', 'floors', 'building', 'major_category', 'sub_category', 'show_labels_zoomlevel' ];
$names = $names.concat([ '名称', '名称:ja', '名称:ja-Pron', '名称:en', '名称:es', '名称:fr', '名称:ko', '名称:zh-CN' ]);
$names = $names.concat([ 'long_description', 'long_description:ja', 'long_description:ja-Pron', 'long_description:en',
		'long_description:es', 'long_description:fr', 'long_description:ko', 'long_description:zh-CN' ]);
var $exit_names = [ '対応ノードID', '高さ', '出入口の名称', '出入口の名称:ja', '出入口の名称:ja-Pron', '出入口の名称:en', '出入口の名称:es', '出入口の名称:fr', '出入口の名称:ko',
		'出入口の名称:zh-CN' ];

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
			'text' : name
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
		if (feature.get('施設ID') && feature.get('major_category') != '_nav_poi_' && feature.get('category') != '公共用トイレの情報') {
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
				var node = source.getFeatureById(exit.get('対応ノードID'));
				var floor = Number(node && node.get('高さ'));
				tr.click(function() {
					$hulop.indoor.showFloor(floor);
				});
				$exit_names.forEach(function(name, col) {
					var text = name == '高さ' ? floorText(floor) : exit.get(name) || '';
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
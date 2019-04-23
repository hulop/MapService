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

$hulop.editor = function() {

	function i18nMenu(properties) {
		var result = [];
		[ 'en', 'ja', 'es', 'fr', 'ko', 'zh-CN' ].forEach(function(lang) {
			result.push('group:I18N_' + lang);
			properties.forEach(function(p) {
				result.push(p + ':' + lang);
				p != 'content' && lang == 'ja' && result.push(p + ':' + lang + '-Pron');
			});
		});
		return result;
	}

	var PROPERTY_NAMES = {};

	PROPERTY_NAMES['ノード情報'] = [ 'ノードID', '緯度経度桁数コード', '緯度', '経度', '接続リンクID1', '接続リンクID2', '接続リンクID3', '接続リンクID4', '接続リンクID5', '接続リンクID6', '接続リンクID7',
			'接続リンクID8', '接続リンクID9', '接続リンクID10', '高さ' ];

	PROPERTY_NAMES['リンクの情報'] = [ 'リンクID', '起点ノードID', '終点ノードID', 'リンク延長', '経路の種類', '方向性', '通行制限', '手すり', '屋根の有無', '蓋のない溝や水路の有無', '日交通量', '主な利用者', '通り名称または交差点名称' ]
			.concat(i18nMenu([ '通り名称または交差点名称' ])).concat(
					[ 'group:ROAD', '有効幅員', '有効幅員緯度', '有効幅員経度', '縦断勾配1', '縦断勾配1緯度', '縦断勾配1経度', '縦断勾配2', '横断勾配', '横断勾配緯度', '横断勾配経度', '路面状況', '段差', '段差緯度',
							'段差経度', 'road_low_priority', 'distance_overwrite', 'group:STAIR', '最小階段段数', '最大階段段数', 'group:ELEVATOR', 'エレベーター種別', 'elevator_equipments', 'エレベーターの緯度', 'エレベーターの経度',
							'group:A11Y', '視覚障害者誘導用ブロック', '補助施設の設置状況', '補助施設の緯度', '補助施設の経度', 'エスコートゾーン', 'group:TRAFFIC', 'バス停の有無', 'バス停の緯度', 'バス停の経度',
							'信号の有無', '信号の緯度', '信号の経度', '信号種別', 'group:SERVICE', '供用開始時間', '供用終了時間', '供用開始日', '供用終了日', '供用制限曜日',
							'business_hours', 'business_hours_PreHoliday', 'business_hours_Holiday',
							'business_hours_Mon', 'business_hours_Tue', 'business_hours_Wed', 'business_hours_Thu', 'business_hours_Fri', 'business_hours_Sat','business_hours_Sun'
							 ]);
	PROPERTY_NAMES['出入口情報'] = [ '出入口ID', '対応ノードID', '対応施設ID', '出入口の名称', '出入口の有効幅員', '扉の種類', '段差' ].concat(i18nMenu([ '出入口の名称' ]));

	PROPERTY_NAMES['公共施設の情報'] = [ '施設ID', '緯度経度桁数コード', '緯度', '経度', '名称', '所在地', '電話番号', '階層', '供用開始時間', '供用終了時間', '供用制限曜日', '多目的トイレ', 'group:EXT', 'building',
			'major_category', 'sub_category', 'minor_category', 'heading', 'angle', 'height', 'long_description', 'short_description', 'description', 'location_description', 'content', 'tags', 'poi_external_category',
			'business_hours', 'business_hours_PreHoliday', 'business_hours_Holiday',
			'business_hours_Mon', 'business_hours_Tue', 'business_hours_Wed', 'business_hours_Thu', 'business_hours_Fri', 'business_hours_Sat','business_hours_Sun',
			'show_labels_zoomlevel' ]
			.concat(i18nMenu([ '名称', '所在地', 'long_description', 'short_description', 'description', 'location_description', 'content']));

	PROPERTY_NAMES['公共用トイレの情報'] = [ '施設ID', '緯度経度桁数コード', '緯度', '経度', '階層', '男女別', '有料無料の別', '多目的トイレ', 'ベビーベッド', '供用開始時間', '供用終了時間', '供用制限曜日', 'group:EXT',
			'building',
			'business_hours', 'business_hours_PreHoliday', 'business_hours_Holiday',
			'business_hours_Mon', 'business_hours_Tue', 'business_hours_Wed', 'business_hours_Thu', 'business_hours_Fri', 'business_hours_Sat','business_hours_Sun' ];

	PROPERTY_NAMES['指定避難所の情報'] = [ '施設ID', '緯度経度桁数コード', '緯度', '経度', '施設種別', '地区名', '名称', '所在地', '電話番号', '階層', '風水害対応', '多目的トイレ' ].concat(i18nMenu([ '地区名',
			'名称', '所在地' ]));

	PROPERTY_NAMES['病院の情報'] = [ '施設ID', '緯度経度桁数コード', '緯度', '経度', '名称', '所在地', '電話番号', '階層', '診療科目', '休診日', '多目的トイレ' ].concat(i18nMenu([ '名称', '所在地' ]));

	$hulop.area.setPropertyNames(PROPERTY_NAMES);
	console.log(PROPERTY_NAMES);

	var OPTIONAL_NAMES = {};
	OPTIONAL_NAMES['ノード情報'] = [ '接続リンクID1', '接続リンクID2', '接続リンクID3', '接続リンクID4', '接続リンクID5', '接続リンクID6', '接続リンクID7', '接続リンクID8', '接続リンクID9', '接続リンクID10' ];

	var READONLY_NAMES = [ 'ノードID', '緯度経度桁数コード', '緯度', '経度', 'リンクID', '起点ノードID', '終点ノードID', 'リンク延長', '出入口ID', '対応ノードID', '対応施設ID', '施設ID', '接続リンクID1',
			'接続リンクID2', '接続リンクID3', '接続リンクID4', '接続リンクID5', '接続リンクID6', '接続リンクID7', '接続リンクID8', '接続リンクID9', '接続リンクID10', 'geometry' ];
	var EDITOR_FILE = 'EDITOR';
	var MAX_INDEX = 10;
	var downKey, keyState = {}, ADD_KEY = 65, DO_POI_KEY = 68, SPLIT_KEY = 83, COPY_KEY = 67, PASTE_KEY = 86;
	var lastData, map, source, select, modify, callback, start_feature, poi_lines, editingFeature, editingProperty, clipboardFeature;
	var start_point, switch_line, from_feature;
	var selectPoint, dragPoint, pointOffset;

	var args = {};
	location.search.substr(1).split('&').forEach(function(arg) {
		if (arg) {
			var kv = arg.split('=');
			args[kv[0]] = kv.length > 1 ? kv[1] : '';
		}
	});
	console.log(args);

	var defaultLang = $hulop.messages.defaultLang == 'ja' ? 'ja' : 'en';
	var messages = {}, keynames = {}, tooltips = {};
	$.ajax({
		'type' : 'get',
		// 'async' : false,
		'url' : 'editor/messages_' + defaultLang + '.json',
		'dataType' : 'json',
		'success' : function(data) {
			tooltips = data.tooltips;
			messages = data.messages;
			keynames = data.keynames;
			console.log(data);
			traverseTextNode(document.body, function(el) {
				var text = el.nodeValue;
				for (var m; m = text.match(/(\(i18n_([^\)]+)\))/);) {
					text = text.replace(m[1], messages[m[2]]);
				}
				el.nodeValue = text;
			});
		},
		'error' : function(XMLHttpRequest, textStatus, errorThrown) {
			console.error(textStatus + ' (' + XMLHttpRequest.status + '): ' + errorThrown);
		}
	});

	function traverseTextNode(el, callback) {
		switch (el.nodeType) {
		case 1:
			for (var i = 0; i < el.childNodes.length; i++) {
				traverseTextNode(el.childNodes[i], callback);
			}
			break;
		case 3:
			callback(el);
			break;
		}
	}

	function init(cb) {
		callback = cb;
		console.log('Editor running');
		map = $hulop.map.getMap();
		var routeLayer = $hulop.map.getRouteLayer();
		routeLayer.setStyle(getStyle);
		source = routeLayer.getSource();
		$('.ol-rotate').css({
			'cssText' : 'right: .5em !important; left: initial !important;'
		});
		map.addControl(new ol.control.Zoom());

		// Browser event listeners
		$(window).on({
			'keydown' : function(event) {
				keyState = event;
				if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
					return;
				}
				downKey = event.keyCode;
			},
			'keyup' : function(event) {
				keyState = event;
				downKey = null;
				drawMarkers();
				doAlign();
			}
		});

		$('#save_button').on('click', function(event) {
			saveChanges();
		});
		$('#restore_button').on('click', function(event) {
			discardChanges();
		});
		$('#export_button').on('click', function(event) {
			downloadFile(toFeatureCollection(), 'MapData.geojson');
		});
		$('#delete_button').on('click', function(event) {
			source.getFeatures().forEach(function(feature) {
				source.removeFeature(feature);
			});
			$('.modified').show();
			$('#list tbody').empty();
		});
		var fileText;
		$('#import_file').on('change', function(event) {
			fileText = null;
			if (this.files.length > 0) {
				var file = this.files[0];
				if (file) {
					console.log(file);
					var fr = new FileReader();
					fr.addEventListener('load', function(e) {
						fileText = fr.result;
					});
					fr.readAsText(file);
				}
			}
		});
		$('#import_button').on('click', function(event) {
			if (fileText) {
				try {
					var features = JSON.parse(fileText);
					if (features.type == 'FeatureCollection' && features.features) {
						var bounds;
						function addCoords(crd) {
							if (typeof (crd[0]) == 'number') {
								var x = crd[0], y = crd[1];
								bounds = bounds ? [ Math.min(bounds[0], x), Math.min(bounds[1], y), Math.max(bounds[2], x), Math.max(bounds[3], y) ] : [ x, y, x, y ];
							} else {
								crd.forEach(addCoords);
							}
						}
						callback(); // clear routes
						showFeatureList();
						resetOriginal();
						features.features.forEach(function(feature) {
							var f = addFeatureList(feature);
							lastData.modified.push(f.getId());
							syncLatlng(f);
							addCoords(feature.geometry.coordinates);
						});
						$('#list tbody tr').css('background-color', 'lightblue');
						$('.modified').show();
						bounds && $hulop.map.getMap().getView().fit(ol.proj.transformExtent(bounds, 'EPSG:4326', 'EPSG:3857'), map.getSize());
						resetExit();
						validate();
					}
				} catch (e) {
					console.error(e);
				}
			}
		});

		// Map event isteners
		map.on('pointermove', function(event) {
			var latLng = ol.proj.transform(event.coordinate, 'EPSG:3857', 'EPSG:4326');
			// console.log(latLng);
			drawMarkers(latLng);
		});
		map.on('pointerdown', function(event) {
			// console.log(event);
			var feature = getEventFeature(event);
			if (feature) {
				drawPoiLines(feature);
				if (selectPoint == feature) {
					var coord = (dragPoint = feature).getGeometry().getCoordinates();
					pointOffset = [ coord[0] - event.coordinate[0], coord[1] - event.coordinate[1] ];
					return false;
				}
			}
			dragPoint = null;
		});
		map.on('pointerup', function(event) {
			drawPoiLines();
			if (dragPoint) {
				dragPoint = null;
				return false;
			}
		});
		map.on('pointerdrag', function(event) {
			// console.log(event);
			if (dragPoint) {
				var point = ol.coordinate.add(event.coordinate, pointOffset);
				dragPoint.getGeometry().setCoordinates(point);
				return false;
			}
		});

		map.on('click', function(event) {
			// console.log(event);
			var feature = getEventFeature(event);
			if (feature === null) {
				return;
			}
			var latLng = ol.proj.transform(event.coordinate, 'EPSG:3857', 'EPSG:4326');
			editingFeature && !feature && showProperty();
			var offset = !feature || feature.getGeometry().getType() != 'Point';
			switch (downKey) {
			case ADD_KEY:
				offset && createNode(latLng);
				break;
			case DO_POI_KEY:
				offset && createFacility(latLng, '公共施設の情報');
				break;
			case 70: // F
				offset && createFacility(latLng, '病院の情報');
				break;
			case 71: // G
				offset && createFacility(latLng, '公共用トイレの情報');
				break;
			case 72: // H
				offset && createFacility(latLng, '指定避難所の情報');
				break;
			case PASTE_KEY:
				var category = clipboardFeature && clipboardFeature.get('施設ID') && clipboardFeature.get('category');
				category && merge(clipboardFeature, createFacility(latLng, category))
				break;
			default:
				if (feature) {
					if (feature.get('リンクID')) {
						var editable = source.getFeatureById(feature.get('起点ノードID')) && source.getFeatureById(feature.get('終点ノードID'));
						if (keyState.shiftKey && !start_feature) {
							editable && addAlignFeature(feature);
							return false;
						}
						if (!editable) {
							showProperty(feature);
							return false;
						}
					}
					if (align_features.length > 0) {
						return false;
					}
					// console.log(feature.getId());
					if (keyState.altKey && switchMonitor(feature)) {
						return;
					}
					if (keyState.shiftKey) {
						var last_feature = start_feature;
						if (feature.get('ノードID') || feature.get('施設ID')) {
							if (start_feature) {
								connectFeatures(start_feature, feature);
							} else {
								start_feature = feature;
							}
						}
						if (last_feature || !start_feature) {
							return;
						}
					}
					var newLink = offset && downKey == SPLIT_KEY && feature.get('リンクID') && source.getFeatureById(feature.get('起点ノードID'))
							&& source.getFeatureById(feature.get('終点ノードID')) && splitLink(event);
					newLink && (feature = newLink);
					showProperty(feature);
					downKey == COPY_KEY && (clipboardFeature = feature);
				}
				break;
			}
		});

		// Data layer listeners
		select = new ol.interaction.Select({
			'condition' : ol.events.condition.never,
			'style' : function(feature) {
				if ($hulop.area.getId(feature)) {
					return $hulop.area.getSelectStyle(feature);
				}
				var style = getStyle(feature);
				if (!style) {
					return;
				}
				if (!Array.isArray(style)) {
					style = [style];
				}
				if (feature.getGeometry().getType() == 'LineString') {
					feature.getGeometry().getCoordinates().forEach(function(point, index, array) {
						var edge = index == 0 || index == array.length - 1;
						style.push(new ol.style.Style({
							'geometry' : new ol.geom.Point(point),
							'image' : new ol.style.Circle({
								'radius' : 6,
								'fill' : new ol.style.Fill({
									'color' : edge ? 'white' : 'rgba(255, 255, 255, 0.5)'
								}),
								'stroke' : new ol.style.Stroke({
									'color' : style[0].getStroke().getColor(),
									'width' : 1
								})
							})
						}));
					});
				}
				return style;
			},
			'layers' : [ routeLayer ],
			'multi' : false
		});
		var pointStyle = new ol.style.Style({
			'image' : new ol.style.Circle({
				'radius' : 3 * 2,
				'fill' : new ol.style.Fill({
					'color' : 'rgba(0,153,255,1)'
				}),
				'stroke' : new ol.style.Stroke({
					'color' : 'rgba(255,255,255,1)',
					'width' : 3 / 2
				})
			}),
			'zIndex' : Infinity
		});
		modify = window.modify = new ol.interaction.Modify({
			'style' : function(feature) {
				vertex = feature.getGeometry().getCoordinates();
				return pointStyle;
			},
			'condition' : function(event) {
				if (ol.events.condition.primaryAction(event)) {
					// console.log(event);
					if (select.getFeatures().getLength() > 0) {
						var feature = select.getFeatures().item(0);
						if ($hulop.area.getId(feature)) {
							return $hulop.area.modifyCondition(event, isVertex(feature));
						}
						return feature.getGeometry().getType() != 'LineString' || isVertex(feature, ol.events.condition.altKeyOnly(event));
					}
				}
				return false;
			},
			'deleteCondition' : function(event) {
				if (ol.events.condition.singleClick(event)) {
					if (select.getFeatures().getLength() > 0) {
						var feature = select.getFeatures().item(0);
						if ($hulop.area.getId(feature)) {
							return $hulop.area.deleteCondition(event, isVertex(feature));
						}
						if (feature.getGeometry().getType() == 'LineString') {
							return isVertex(feature) && ol.events.condition.altKeyOnly(event);
						}
					}
				}
				return false;
			},
			'features' : select.getFeatures()
		});

		map.addInteraction(select);
		map.addInteraction(modify);
		console.log(source);

		source.on('addfeature', function(event) {
			var feature = event.feature;
			feature.getGeometry().on('change', function(event) {
				geometryChanged(feature);
			});
			feature.on('propertychange', function(event) {
				if (event.key == 'geometry') {
					geometryChanged(feature);
					feature.getGeometry().on('change', function(event) {
						geometryChanged(feature);
					});
				} else {
					feature == editingFeature && feature.get(event.key) != event.oldValue && !editingProperty && showProperty(feature);
				}
				setModified(feature)
			});
		});
		initData();
	}

	var vertex;
	function isVertex(feature, others) {
		if (vertex) {
			var type = feature.getGeometry().getType();
			var coords = feature.getGeometry().getCoordinates();
			for (var i = 0; i < coords.length; i++) {
				if (type == 'Polygon') {
					for (var j = 0; j < coords[i].length; j++) {
						if (isEqual(coords[i][j], vertex)) {
							return true;
						}
					}
				} else if (isEqual(coords[i], vertex)) {
					return i > 0 && i < coords.length - 1;
				}
			}
			return others;
		}
	}

	function getEventFeature(event) {
		var candidate;
		return map.forEachFeatureAtPixel(event.pixel, function(feature) {
			candidate = candidate || null;
			if (feature.getId()) {
				if (!feature.getGeometry().getArea) {
					return feature;
				} else if (!candidate || feature.getGeometry().getArea() < candidate.getGeometry().getArea()) {
					candidate = feature;
				}
			}
		}) || candidate;
	}

	function splitLink(event) {
		var feature = getEventFeature(event);
		if (feature && feature.get('リンクID')) {
			var coordinates = feature.getGeometry().getCoordinates();
			if (coordinates.length == 2) {
				var nodes = [ '起点ノードID', '終点ノードID' ].map(function(key) {
					var nodeID = feature.get(key);
					return nodeID && source.getFeatureById(nodeID);
				});
				if (nodes[0] && nodes[1]) {
					var latLng = ol.proj.transform(event.coordinate, 'EPSG:3857', 'EPSG:4326');
					var newNode = createNode(latLng);
					reconnectLink(feature, nodes[1], newNode);
					var newLink = createLink(newNode, nodes[1]);
					merge(feature, newLink);
					setModified(nodes[0]);
					setModified(nodes[1]);
					setModified(feature);
					align_edge = nodes;
					align_nodes = [newNode];
					align_features = [feature, newLink];
					doAlign();
					return newLink;
				}
			}
		}
	}

	function reconnectLink(link, from, to) {
		var linkId = link.get('リンクID');
		var array = link.getGeometry().getCoordinates();
		var fromNode = from.get('ノードID');
		var toNode = to.get('ノードID');
		var isStart = fromNode == link.get('起点ノードID');
		array[isStart ? 0 : array.length - 1] = to.getGeometry().getCoordinates();
		link.setGeometry(new ol.geom.LineString(array));
		link.set(isStart ? '起点ノードID' : '終点ノードID', toNode);
		for (var i = 1; i <= MAX_INDEX; i++) {
			if (from.get('接続リンクID' + i) == linkId) {
				from.unset('接続リンクID' + i);
				break;
			}
		}
		for (var i = 1; i <= MAX_INDEX; i++) {
			if (!to.get('接続リンクID' + i)) {
				to.set('接続リンクID' + i, linkId);
				break;
			}
		}
	}

	function prepareData(center, radius) {
		$hulop.route.callService({
			'action' : 'start',
			'cache' : false,
			'lat' : center[1],
			'lng' : center[0],
			'dist' : radius
		}, function() {
			$hulop.route.callService({
				'action' : 'nodemap',
			}, function(nodemap) {
				$hulop.route.callService({
					'action' : 'features',
				}, function(features) {
					console.log(nodemap);
					console.log(features);
					initData(nodemap, features);
				});
			});
		});
	}

	function initData(nodemap, features) {
		lastData = {
			'node_exit' : {},
			'poi_exit' : {},
			'original' : {},
			'modified' : []
		};
		callback();
		showFeatureList();
		if (nodemap && features) {
			for ( var id in nodemap) {
				addFeatureList(nodemap[id]);
			}
			features.forEach(addFeatureList);
			$('#properties').text(($('#list tr').length - 1) + ' objects');
		}
		resetOriginal();
		resetExit();
		resetModified();
		console.log(lastData);
		$hulop.indoor && $hulop.indoor.setStyle(getStyle);
		validate();
	}

	function resetOriginal() {
		lastData.original = {};
		lastData.modified = [];
		source.getFeatures().forEach(function(feature) {
			var id = feature.getId();
			toGeoJson(feature, function(obj) {
				// console.log(obj);
				lastData.original[id] = JSON.stringify(obj);
			});
		});
	}

	function resetExit() {
		lastData.node_exit = {};
		lastData.poi_exit = {};
		source.getFeatures().forEach(function(feature) {
			var exitID = feature.get('出入口ID');
			if (exitID) {
				addNodeExit(feature.get('対応ノードID'), exitID);
				addPoiExit(feature.get('対応施設ID'), exitID);
			}
		});
	}

	function resetModified() {
		$('.modified').hide();
		$('#list tbody tr').removeAttr('style');
	}

	function saveChanges() {
		console.log(lastData);
		var data = {
			'action' : 'editdata',
			'editor' : args.editor,
			'insert' : [],
			'remove' : [],
			'update' : []
		};
		for ( var id in lastData.original) {
			var feature = source.getFeatureById(id);
			if (!feature) {
				data.remove.push(fixDbId({
					'id' : id
				}));
			} else if (lastData.modified.indexOf(id) != -1) {
				toGeoJson(feature, function(obj) {
					data.update.push(fixDbId(obj));
				});
			}
		}
		source.getFeatures().forEach(function(feature) {
			var id = feature.getId();
			if (!lastData.original[id]) {
				toGeoJson(feature, function(obj) {
					data.insert.push(fixDbId(obj));
				});
			}
		});
		resetOriginal();
		resetExit();
		resetModified();
		var org_remove = data.remove;
		data.remove = JSON.stringify(data.remove);
		data.insert = JSON.stringify(data.insert);
		data.update = JSON.stringify(data.update);
		console.log(data);
		$hulop.route.sendData('post', 'api/editor', data, function(result) {
			console.log(result);
			var errors = 0;
			result.insert && result.insert.forEach(function(obj) {
				!obj._rev && errors++;
				checkDbResult(obj);
			});
			result.update && result.update.forEach(function(obj) {
				!obj._rev && errors++;
				checkDbResult(obj);
			});
			org_remove.forEach(function(obj) {
				checkDbResult({
					'_id' : obj._id
				});
			});
			errors > 0 && alert(errors + ' errors while saving changes. Please reload data.');
		});
	}

	function toFeatureCollection() {
		var features = [];
		source.getFeatures().forEach(function(feature) {
			toGeoJson(feature, function(obj) {
				if (obj.id) {
					obj._id = obj.id
					delete obj.id;
				}
				features.push(obj);
			});
		});
		features.sort(function(a, b) {
			if (a._id == b._id) {
				return 0;
			}
			return a._id < b._id ? -1 : 1;
		});
		return JSON.stringify({
			'type' : 'FeatureCollection',
			'features' : features
		}, null, '\t');
	}

	function downloadFile(data, filename) {
		var blob = new Blob([ data ], {
			type : 'text/json;charset=utf-8;'
		});
		if (navigator.msSaveBlob) {
			navigator.msSaveBlob(blob, filename);
		} else {
			var link = document.createElement('a');
			if (link.download !== undefined) {
				var url = URL.createObjectURL(blob);
				link.setAttribute('href', url);
				link.setAttribute('download', filename);
			} else {
				link.href = 'data:attachment/json,' + data;
			}
			link.style = 'visibility:hidden';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
	}

	var idRev = {};
	function checkDbResult(obj) {
		if (obj._id) {
			if (obj._rev) {
				idRev[obj._id] = obj._rev;
			} else {
				delete idRev[obj._id];
			}
		}
	}

	function fixDbId(obj) {
		var id = obj.id;
		if (!id) {
			console.error('No id');
			console.error(obj);
			return obj;
		}
		obj._id = id;
		idRev[id] && (obj._rev = idRev[id]);
		delete obj.id;
		return obj;
	}

	function discardChanges() {
		for ( var id in lastData.original) {
			var feature = source.getFeatureById(id);
			if (!feature || lastData.modified.indexOf(id) != -1) {
				var f = format.readFeature(JSON.parse(lastData.original[id]), {
					'featureProjection' : 'EPSG:3857'
				});
				if (feature) {
					feature.setProperties(f.getProperties());
					feature.setGeometry(f.getGeometry());
				} else {
					source.addFeature(f);
				}
			}
		}
		source.getFeatures().forEach(function(feature) {
			var id = feature.getId();
			lastData.original[id] || source.removeFeature(feature);
		});
		$('#list tbody tr').each(function() {
			var id = $(this).find('td:last-child').text();
			lastData.original[id] || $(this).remove();
		});
		lastData.modified = [];
		resetExit();
		resetModified();
		validate();
	}

	function setModified(feature) {
		var id = feature.getId();
		if (lastData.modified.indexOf(id) == -1) {
			lastData.modified.push(id);
			getFeatureRow(id).css('background-color', 'lightblue');
			$('.modified').show();
		}
	}

	function findExit(feature) {
		var nodeID = feature.get('ノードID')
		var facilID = feature.get('施設ID');
		var exitList = (nodeID && getNodeExit(nodeID)) || (facilID && getPoiExit(facilID)) || [];
		return exitList.map(function(id) {
			return source.getFeatureById(id);
		}).filter(function(exit) {
			return exit
		});
	}

	function hasNodeExit(node) {
		var exitList = getNodeExit(node.get('ノードID'));
		return exitList && exitList.length > 0;
	}

	function hasPoiExit(node) {
		var exitList = getPoiExit(node.get('施設ID'));
		return exitList && exitList.length > 0;
	}

	function getValues(name, key) {
		return (key && lastData[name][key]) || [];
	}

	function addValue(name, key, value) {
		if (key && value) {
			var nodes = lastData[name][key] = (lastData[name][key] || []);
			nodes.indexOf(value) < 0 && nodes.push(value);
		}
	}

	function removeValue(name, key, value) {
		if (key && value) {
			var nodes = lastData[name][key];
			var pos = nodes && nodes.indexOf(value);
			pos >= 0 && nodes.splice(pos, 1);
		}
	}

	function getNodeExit(nodeID) {
		return getValues('node_exit', nodeID);
	}

	function addNodeExit(nodeID, exitID) {
		return addValue('node_exit', nodeID, exitID);
	}

	function removeNodeExit(nodeID, exitID) {
		return removeValue('node_exit', nodeID, exitID);
	}

	function getPoiExit(poiID) {
		return getValues('poi_exit', poiID);
	}

	function addPoiExit(poiID, exitID) {
		return addValue('poi_exit', poiID, exitID);
	}

	function removePoiExit(poiID, exitID) {
		return removeValue('poi_exit', poiID, exitID);
	}

	function canRemoveFeature(feature) {
		return canRemoveNode(feature) || canRemoveLink(feature) || canRemoveFacility(feature) || canRemoveExit(feature) || canRemoveArea(feature);
	}

	function removeFeature(feature) {
		var removed = removeNode(feature) || removeLink(feature) || removeFacility(feature) || removeExit(feature) || removeArea(feature);
		removed && $('.modified').show();
		return removed;
	}

	function connectFeatures(f1, f2) {
		if (f1.get('ノードID') && f2.get('ノードID')) {
			createLink(f1, f2) != false && hideLine();
		} else if (f1.get('ノードID') || f2.get('ノードID')) {
			createExit(f1, f2) != false && hideLine();
		}
	}

	function createNode(latlng) {
		var p = {
			'category' : 'ノード情報',
			'ノードID' : newID('node'),
			'高さ' : '' + getFloor()
		};
		var feature = newFeature(newGeoJSON(p, latlng));
		showProperty(feature);
		return feature;
	}

	function canRemoveNode(node) {
		var nodeID = node.get('ノードID');
		if (!nodeID || hasNodeExit(node)) {
			return false;
		}
		for (var i = 1; i <= MAX_INDEX; i++) {
			var linkId = node.get('接続リンクID' + i);
			if (linkId && source.getFeatureById(linkId)) {
				return false;
			}
		}
		return true;
	}

	function removeNode(node) {
		if (!canRemoveNode(node)) {
			return false;
		}
		source.removeFeature(node);
		showProperty();
		return true;
	}

	function createFacility(latlng, category) {
		var p = {
			'category' : category,
			'施設ID' : newID('poi')
		};
		if (category != '公共用トイレの情報') {
			p['名称'] = '';
		}
		var feature = newFeature(newGeoJSON(p, latlng));
		showProperty(feature);
		return feature;
	}

	function canRemoveFacility(facil) {
		var facilID = facil.get('施設ID');
		return facilID && !hasPoiExit(facil);
	}

	function removeFacility(facil) {
		if (!canRemoveFacility(facil)) {
			return false;
		}
		source.removeFeature(facil);
		showProperty();
		return true;
	}

	function createExit(node, facil) {
		if (facil && facil.get('ノードID')) {
			facil = [ node, node = facil ][0];
		}
		var nodeID = node.get('ノードID');
		var exit, exitID;
		getNodeExit(nodeID).forEach(function(id) {
			if (!exit) {
				var e = source.getFeatureById(id);
				if (e && !e.get('対応施設ID')) {
					exitID = id;
					exit = e;
				}
			}
		});
		if (!exit) {
			exitID = newID('exit');
			addNodeExit(nodeID, exitID);
			var p = {
				'category' : '出入口情報',
				'出入口ID' : exitID,
				'対応ノードID' : nodeID,
				'出入口の名称' : ''
			};
			var obj = newGeoJSON(p, ol.proj.transform(node.getGeometry().getCoordinates(), 'EPSG:3857', 'EPSG:4326'));
			exit = newFeature(obj);
		}
		if (facil) {
			var facilID = facil.get('施設ID');
			exit.set('対応施設ID', facilID);
			addPoiExit(facilID, exitID);
		}
		showProperty(node);
	}

	function canRemoveExit(exit) {
		var exitID = exit.get('出入口ID');
		if (!exitID) {
			return false;
		}
		var nodeID = exit.get('対応ノードID');
		return nodeID && source.getFeatureById(nodeID);
	}

	function removeExit(exit) {
		var node = canRemoveExit(exit);
		if (!node) {
			return false;
		}
		var exitID = exit.get('出入口ID');
		var nodeID = exit.get('対応ノードID');
		removePoiExit(exit.get('対応施設ID'), exitID);
		removeNodeExit(nodeID, exitID);
		source.removeFeature(exit);
		showProperty(editingFeature);
		return true;
	}

	function canRemoveArea(area) {
		return $hulop.area.getId(area);
	}

	function removeArea(area) {
		if (!canRemoveArea(area)) {
			return false;
		}
		source.removeFeature(area);
		showProperty();
		return true;
	}

	function createLink(node1, node2) {
		if (node1 == node2) {
			return false;
		}
		var linkID = newID('link');
		[ node1, node2 ].forEach(function(node) {
			for (var i = 1; i <= MAX_INDEX; i++) {
				if (!node.get('接続リンクID' + i)) {
					node.set('接続リンクID' + i, linkID)
					break;
				}
			}
		});
		var p = {
			'category' : 'リンクの情報',
			'リンクID': linkID,
			'起点ノードID': node1.get('ノードID'),
			'終点ノードID': node2.get('ノードID'),
			'経路の種類': '8',
			'方向性': '0',
			'通行制限': '0',
			'手すり': '0',
			'屋根の有無': '0',
			'蓋のない溝や水路の有無': '0',
			'主な利用者': '0',
			'縦断勾配1': '0',
			'縦断勾配2': '0',
			'横断勾配': '0',
			'路面状況': '0',
			'段差': '0'
		};
		var obj = newGeoJSON(p, ol.proj.transform(node1.getGeometry().getCoordinates(), 'EPSG:3857', 'EPSG:4326'), ol.proj.transform(node2.getGeometry()
				.getCoordinates(), 'EPSG:3857', 'EPSG:4326'));
		var feature = newFeature(obj);
		showProperty(feature);
		return feature;
	}

	function merge(from, to) {
		var properties = from.getProperties();
		for ( var name in properties) {
			var value = properties[name];
			if (READONLY_NAMES.indexOf(name) == -1 && !$hulop.area.isReadOnly(name)) {
				to.set(name, value);
			}
		}
	}

	function canRemoveLink(link) {
		var linkID = link.get('リンクID');
		if (linkID) {
			var nodes = [ '起点ノードID', '終点ノードID' ].map(function(key) {
				var nodeID = link.get(key);
				return nodeID && source.getFeatureById(nodeID);
			});
			return nodes[0] && nodes[1] && nodes;
		}
	}

	function removeLink(link) {
		var nodes = canRemoveLink(link);
		if (!nodes) {
			return false;
		}
		var linkID = link.get('リンクID');
		nodes.forEach(function(node) {
			for (var i = 1; i <= MAX_INDEX; i++) {
				if (node.get('接続リンクID' + i) == linkID) {
					node.unset('接続リンクID' + i);
					setModified(node);
					break;
				}
			}
		});
		source.removeFeature(link);
		showProperty();
		return true;
	}

	function newFeature(obj) {
		var feature = addFeatureList(obj);
		syncLatlng(feature);
		setModified(feature);
		return feature;
	}

	function newID(type) {
		return EDITOR_FILE + '_' + type + '_' + new Date().getTime();
	}

	function newGeoJSON(properties, p1, p2) {
		properties.file = EDITOR_FILE;
		return {
			'type' : 'Feature',
			'geometry' : p2 ? {
				'type' : 'LineString',
				'coordinates' : [ [ p1[0], p1[1] ], [ p2[0], p2[1] ] ]
			} : {
				'type' : 'Point',
				'coordinates' : [ p1[0], p1[1] ]
			},
			'properties' : properties
		};
	}

	var styles = {
		'node' : new ol.style.Style({
			'image' : new ol.style.Circle({
				'radius' : 8,
				'fill' : new ol.style.Fill({
					'color' : '#0000ff'
				}),
				'stroke' : new ol.style.Stroke({
					'color' : '#FFFFFF',
					'width' : 2
				})
			}),
			'zIndex' : 1
		}),
		'marker' : new ol.style.Style({
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
			})
		}),
		'link' : new ol.style.Style({
			'stroke' : new ol.style.Stroke({
				'color' : '#00B4B4',
				'width' : 10
			})
		})
	};

	var align_features = [], align_edge = [], align_nodes = [];
	function addAlignFeature(feature) {
		if (align_features.indexOf(feature) == -1) {
			align_features.push(feature);
			feature.changed();
			['起点ノードID', '終点ノードID'].forEach(function(key) {
				var node = source.getFeatureById(feature.get(key));
				var pos = align_edge.indexOf(node);
				if (pos == -1) {
					align_edge.push(node);
				} else {
					align_edge.splice(pos, 1);
					align_nodes.push(node)
				}
			});
		}
	}
	function doAlign() {
		if (align_nodes.length > 0 && align_edge.length == 2) {
			var edge = [align_edge[0].getGeometry().getCoordinates(), align_edge[1].getGeometry().getCoordinates()];
			var line =  new ol.geom.LineString(edge);
			align_nodes.forEach(function(node) {
				setGeometry(node, new ol.geom.Point(line.getClosestPoint(node.getGeometry().getCoordinates())));
			});
		}
		align_edge = [];
		align_nodes = [];
		while (align_features.length > 0) {
			align_features.pop().changed();
		}
	}

	function getStyle(feature) {
		var floor = getFloor();
		if ($hulop.area.getId(feature)) {
			return $hulop.area.getStyle(feature, floor);
		}
		var style, heights = getHeights(feature);
		var odd = heights.length > 0 && Math.round(Math.abs(heights[0])) % 2 == 1;
		if (heights.length > 0 && heights[0] > 0) {
			odd = !odd;
		}
		if (feature.get('ノードID')) {
			var exit = hasNodeExit(feature);
			style = new ol.style.Style({
				'image' : new ol.style.Circle({
					'radius' : exit ? 9 : 8,
					'fill' : new ol.style.Fill({
						'color' : odd ? '#0000ff' : '#ff0000'
					}),
					'stroke' : new ol.style.Stroke({
						'color' : exit ? '#00B4B4' : '#FFFFFF',
						'width' : exit ? 3 : 2
					})
				}),
				'zIndex' : floor == heights[0] ? 1.01 : 1
			});
		} else if (feature.get('リンクID')) {
			if (feature.get('エレベーター種別')) {
				var anchor = [ 0.5, 1 ];
				if (floor != 0 && heights.length == 2 && (heights[0] < floor || heights[1] < floor)) {
					anchor = [ 0, 0 ];
				}
				style = new ol.style.Style({
					'image' : new ol.style.Icon({
						'anchor' : anchor,
						'anchorXUnits' : 'fraction',
						'anchorYUnits' : 'fraction',
						'src' : 'images/ev.png'
					}),
					'stroke' : new ol.style.Stroke({
						'color' : 'black',
						'width' : 6
					})

				});
			} else {
				var b = '#0000ff', r = '#ff0000';
				if (feature.get('road_low_priority') == '1') {
					b = '#0000A0';
					r = '#A00000';
				}
				if (feature.get('視覚障害者誘導用ブロック') == '1') {
					b = r = '#00A000';
				}
				if (align_features.indexOf(feature) != -1) {
					b = r = '#00B4B4';
				}
				style = [new ol.style.Style({
					'stroke' : new ol.style.Stroke({
						'color' : heights.length == 1 ? odd ? b : r : '#7f007f',
						'width' : 6
					})
				})];
				var dir = feature.get('方向性');
				
				if (dir == '1' || dir == '2') {
				var geometry = feature.getGeometry();
				  geometry.forEachSegment(function(start, end) {
				    var dx = end[0] - start[0];
				    var dy = end[1] - start[1];
				    var rotation = Math.atan2(dy, dx);
				    // arrows
				    style.push(new ol.style.Style({
				      geometry: new ol.geom.Point((dir=='1')?end:start),
				      image: new ol.style.Icon({
				        src: 'images/arrow.png',
				        anchor: [1.5, 0.5],
				        rotateWithView: false,
				        rotation: (dir=='1')?-rotation:-rotation+Math.PI
				      })
				    }));
				  });
				}
			}
		} else if (feature.get('出入口ID')) {
			style = null;
		} else if (feature.get('major_category') == '_nav_poi_') {
			var heading = parseFloat(feature.get('heading') || 0);
			var angle = parseFloat(feature.get('angle') || 180);
			var fill = "#00CC00", stroke = "#006600";
			if (heading < -180 || heading > 180 || angle < 0 || angle > 180) {
				fill = "#CC00CC";
				stroke = "#660066";
			}
			var path = 'M 20 21.6 L 20 20 ';
			var size = Math.min(20, 12 * Math.sqrt(180 / angle));
			for (var i = -angle; i < angle + 10; i += 10) {
				i = Math.min(i, angle);
				var r = i / 180 * Math.PI;
				var x = 20 + Math.sin(r) * size;
				var y = 20 - Math.cos(r) * size;
				path += 'L ' + x + ' ' + y + ' ';
			}
			path += 'L 20 20 z';

			var src = 'data:image/svg+xml,' + escape('<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" width="40px" height="40px">'
					+ '<path stroke="' + stroke + '" stroke-width="2" stroke-opacity="0.75" fill="' + fill + '" fill-opacity="0.75" d="' + path + '"/></svg>');

			style = new ol.style.Style({
				'image' : new ol.style.Icon({
					'src' : src,
					'rotation' : heading * Math.PI / 180.0,
					'rotateWithView' : true,
					'anchor' : [ 0.5, 0.5 ],
					'anchorXUnits' : 'fraction',
					'anchorYUnits' : 'fraction',
					'imgSize' : [ 40, 40 ]
				}),
				'zIndex' : -1
			});
		} else if (feature.get('施設ID')) {
			style = styles.marker;
			if (feature == editingFeature) {
				floor = 0;
			}
		} else {
			console.log(feature);
		}
		if (floor != 0 && heights.length > 0 && style) {
			var visible = heights.filter(function(height) {
				return $hulop.indoor && $hulop.indoor.isVisible(height);
			}).length > 0;
			if (!visible) {
				style = null;
			}
		}
		if (feature.error) {
			if (Array.isArray(style)) {
				style.forEach(function(s) {
					s && s.getStroke() && s.getStroke().setColor('#c0c0c0');					
				});
			} else {
				style && style.getStroke() && style.getStroke().setColor('#c0c0c0');
			}
		}
		return style;
	}

	function getHeights(feature) {
		var heights = [];
		function addNode(node) {
			var h = Number(node.get('高さ').replace('B', '-'));
			heights.indexOf(h) == -1 && heights.push(h);
		}
		function addLink(link) {
			[ '起点ノードID', '終点ノードID' ].forEach(function(key) {
				var node = source.getFeatureById(link.get(key));
				node && addNode(node);
			});
		}
		if (feature.get('ノードID')) {
			addNode(feature);
			for (var i = 1; i <= MAX_INDEX; i++) {
				var linkID = feature.get('接続リンクID' + i);
				var link = linkID && source.getFeatureById(linkID);
				link && addLink(link);
			}
		} else if (feature.get('リンクID')) {
			addLink(feature);
		} else if (feature.get('施設ID')) {
			var h = feature.get('height');
			if (h) {
				h = Number(h.replace('B', '-'));
				heights.indexOf(h) == -1 && heights.push(h);
			}
			getPoiExit(feature.get('施設ID')).forEach(function(exitID) {
				var exit = source.getFeatureById(exitID);
				var nodeID = exit && exit.get('対応ノードID');
				var node = nodeID && source.getFeatureById(nodeID);
				node && addNode(node);
			});
		}
		return heights;
	}

	var ignoreChange = false;
	window.translateAll = function(deltaX, deltaY) {
		var count = 0;
	    ignoreChange = true;
		try {
		    source.getFeatures().forEach(function(feature) {
		        feature.getGeometry().translate(deltaX, deltaY);
		        count++;
		    });
		} finally {
		    ignoreChange = false;
		}
		return count;
	};

	function geometryChanged(feature) {
		if (ignoreChange) {
			syncLatlng(feature);
			setModified(feature);
			return;
		}
		var nodeID = feature.get('ノードID');
		if (nodeID) {
			var nodeCoordinate = feature.getGeometry().getCoordinates();
			var latlng = ol.proj.transform(nodeCoordinate, 'EPSG:3857', 'EPSG:4326');
			for (var i = 1; i <= MAX_INDEX; i++) {
				var linkID = feature.get('接続リンクID' + i);
				var link = linkID && source.getFeatureById(linkID);
				if (link && link != dragPoint) {
					var isStart = nodeID == link.get('起点ノードID');
					var geometry = null;
					var linkCoordinates = link.getGeometry().getCoordinates();
					if (isNaN(linkCoordinates[0])) {
						var other = linkCoordinates[isStart ? linkCoordinates.length - 1 : 0];
						var otherLatlng = ol.proj.transform(other, 'EPSG:3857', 'EPSG:4326');
						if (keyState.shiftKey || !link.get('エレベーター種別') || $hulop.util.computeDistanceBetween(latlng, otherLatlng) > 1) {
							var array = linkCoordinates;
							array[isStart ? 0 : array.length - 1] = nodeCoordinate;
							geometry = new ol.geom.LineString(array);
						}
					} else if (keyState.shiftKey) {
						geometry = new ol.geom.LineString(isStart ? [ nodeCoordinate, linkCoordinates ] : [ linkCoordinates, nodeCoordinate ]);
					}
					setGeometry(link, geometry || new ol.geom.Point(nodeCoordinate));
				}
			}
			findExit(feature).forEach(function(exit) {
				exit.setGeometry(new ol.geom.Point(nodeCoordinate));
			});
		}
		var linkID = feature.get('リンクID');
		var link = linkID && source.getFeatureById(linkID);
		if (link && link.getGeometry().getType() == 'Point') {
			var geometry = link.getGeometry();
			// Fix elevator nodes
			[ '起点ノードID', '終点ノードID' ].forEach(function(key) {
				var nodeID = feature.get(key);
				var node = nodeID && source.getFeatureById(nodeID);
				node && setGeometry(node, geometry.clone());
			});
		}
		syncLatlng(feature);
		poi_lines && drawPoiLines(feature);
		setModified(feature);
	}

	function setGeometry(feature, geometry) {
		feature && geometry && !isEqual(feature.getGeometry().getCoordinates(), geometry.getCoordinates()) && feature.setGeometry(geometry);
	}

	function isEqual(coord1, coord2) {
		if (typeof coord1 != 'object' || typeof coord2 != 'object') {
			return coord1 == coord2;
		}
		if (coord1.length != coord2.length) {
			return false;
		}
		for (var i = 0; i < coord1.length; i++) {
			if (!isEqual(coord1[i], coord2[i])) {
				return false;
			}
		}
		return true;
	}

	function syncLatlng(feature) {
		var coordinates = feature.getGeometry().getCoordinates();
		if (feature.get('ノードID') || feature.get('施設ID')) {
			var latlng = ol.proj.transform(coordinates, 'EPSG:3857', 'EPSG:4326');
			feature.set('緯度経度桁数コード', '3');
			feature.set('緯度', $hulop.util.toDMS(latlng[1]));
			feature.set('経度', $hulop.util.toDMS(latlng[0]));
		} else if (feature.get('リンクID')) {
			var geometry = feature.getGeometry();
			if (geometry.getType() == 'LineString') {
				var coords = [];
				geometry.getCoordinates().forEach(function(coord) {
					coords.push(ol.proj.transform(coord, 'EPSG:3857', 'EPSG:4326'));
				});
				feature.set('リンク延長', '' + Math.round($hulop.util.computeLength(coords) * 10) / 10);
			} else {
				feature.set('リンク延長', '0');
			}
		}
	}

	var markerStyle = {
		'Circle' : new ol.style.Style({
			'fill' : new ol.style.Fill({
				'color' : 'rgba(0, 180, 180, 0.2)'
			}),
			'stroke' : new ol.style.Stroke({
				'width' : 0.25,
				'color' : 'rgb(0, 180, 180)'
			})
		}),
		'LineString' : new ol.style.Style({
			'stroke' : new ol.style.Stroke({
				'color' : 'rgb(0, 180, 180)',
				'width' : 7
			})
		}),
		'poiLine' : new ol.style.Style({
			'stroke' : new ol.style.Stroke({
				'color' : 'rgba(0, 180, 180, 0.7)',
				'width' : 5
			})
		})
	};
	var markerLayer, circleFeature, lineFeature, switchFeature;
	var circleCenter, circleRadius;
	function drawMarkers(latLng) {
		var map = $hulop.map.getMap();
		if (!map) {
			return;
		}
		var circleProperties = {
			'geometry' : null
		};
		var lineProperties = {
			'geometry' : null
		};
		var switchProperties = {
			'geometry' : null
		};
		if (latLng) {
			if (keyState.ctrlKey && keyState.shiftKey) {
				circleCenter = circleCenter || latLng;
				circleRadius = Math.min($hulop.config.MAX_RADIUS || 500, $hulop.util.computeDistanceBetween(circleCenter, latLng));
				circleProperties.geometry = new ol.geom.Circle(ol.proj.transform(circleCenter, 'EPSG:4326', 'EPSG:3857'), circleRadius);
			}
			if (start_feature) {
				lineProperties.geometry = new ol.geom.LineString([ start_feature.getGeometry().getCoordinates(),
						ol.proj.transform(latLng, 'EPSG:4326', 'EPSG:3857') ]);
			}
			if (start_point) {
				switchProperties.geometry = new ol.geom.LineString([ start_point, ol.proj.transform(latLng, 'EPSG:4326', 'EPSG:3857') ]);
			}
		} else {
			circleCenter && prepareData(circleCenter, circleRadius)
			circleCenter = null;
			start_feature = null;
			start_point = null;
		}
		if (!markerLayer) {
			markerLayer = new ol.layer.Vector({
				'source' : new ol.source.Vector({
					'features' : [ circleFeature = new ol.Feature(circleProperties), lineFeature = new ol.Feature(lineProperties),
							switchFeature = new ol.Feature(lineProperties) ]
				}),
				'style' : function(feature) {
					// console.log(feature);
					return markerStyle[feature.getGeometry().getType()];
				},
				'zIndex' : 103
			});
			map.addLayer(markerLayer);
		} else {
			circleFeature.setProperties(circleProperties);
			lineFeature.setProperties(lineProperties);
			switchFeature.setProperties(switchProperties);
		}
	}

	var poiLineLayer, poiLineFeature;
	function drawPoiLines(feature) {
		var map = $hulop.map.getMap();
		if (!map) {
			return;
		}
		var lineProperties = {
			'geometry' : null
		};
		if (feature) {
			var nodes = findExit(feature);
			if (nodes.length == 0) {
				return;
			}
			var path = [];
			var key = feature.get('ノードID') ? '対応施設ID' : '対応ノードID';
			nodes.forEach(function(exit) {
				var id = exit.get(key);
				var target = id && source.getFeatureById(id);
				if (target) {
					path.push(feature.getGeometry().getCoordinates());
					path.push(target.getGeometry().getCoordinates());
				}
			});
			lineProperties.geometry = new ol.geom.LineString(path);
		}
		if (!poiLineLayer) {
			poiLineLayer = new ol.layer.Vector({
				'source' : new ol.source.Vector({
					'features' : [ poiLineFeature = new ol.Feature(lineProperties) ]
				}),
				'style' : function(feature) {
					return markerStyle.LineString;
				},
				'updateWhileInteracting' : true,
				'zIndex' : 103
			});
			map.addLayer(poiLineLayer);
		} else {
			poiLineFeature.setProperties(lineProperties);
		}
		poi_lines = lineProperties.geometry;
		// console.log(lineProperties);
		return lineProperties.geometry;
	}

	function transformPath(path, fromProj, toProj) {
		path.forEach(function(coordinate, index) {
			path[index] = ol.proj.transform(coordinate, fromProj, toProj);
		});
	}

	function hideLine(latlng) {
		start_feature = null;
		drawMarkers();
	}

	function hideSwitchLine(latlng) {
		start_point = null;
		drawMarkers();
	}

	function switchMonitor(feature) {
		console.log('switchMonitor ' + (editingFeature && editingFeature.getId()));
		if (editingFeature && editingFeature.getGeometry().getCoordinates) {
			var editLink = editingFeature.get('リンクID');
			var clickNode = feature.get('ノードID');
			if (editLink && clickNode) {
				var array = editingFeature.getGeometry().getCoordinates();
				if (start_point) {
					var fromNode = from_feature.get('ノードID');
					var isStart = fromNode == editingFeature.get('起点ノードID');
					if (editingFeature.get(!isStart ? '起点ノードID' : '終点ノードID') == clickNode) {
						return;
					}
					array[isStart ? 0 : array.length - 1] = feature.getGeometry().getCoordinates();
					editingFeature.setGeometry(new ol.geom.LineString(array));
					editingFeature.set(isStart ? '起点ノードID' : '終点ノードID', clickNode);
					for (var i = 1; i <= MAX_INDEX; i++) {
						if (from_feature.get('接続リンクID' + i) == editLink) {
							from_feature.unset('接続リンクID' + i);
							break;
						}
					}
					for (var i = 1; i <= MAX_INDEX; i++) {
						if (!feature.get('接続リンクID' + i)) {
							feature.set('接続リンクID' + i, editLink);
							break;
						}
					}
					setModified(editingFeature);
					setModified(from_feature);
					setModified(feature);
					hideSwitchLine();
				} else {
					var isStart = clickNode == editingFeature.get('起点ノードID');
					start_point = array[isStart ? 1 : array.length - 2];
					from_feature = feature;
				}
				return true;
			}
		}
	}

	function showFeatureList() {
		$('#list').empty();
		var table = $('<table>').appendTo($('#list'));
		$('<caption>', {
			'text' : M('DATA_LIST')
		}).appendTo(table);
		var thead = $('<thead>').appendTo(table);
		var tbody = $('<tbody>').appendTo(table);
		$('<tr>').append($('<th>', {
			'text' : M('DATA')
		}), $('<th>', {
			'text' : 'ID'
		})).appendTo(thead);
	}

	var format = new ol.format.GeoJSON()
	function toGeoJson(feature, callback) {
		callback(JSON.parse(format.writeFeature(feature, {
			'featureProjection' : 'EPSG:3857'
		})));
	}

	function addFeatureList(obj) {
		var p = obj.properties;
		var id = p['ノードID'] || p['リンクID'] || p['施設ID'] || p['出入口ID'] || $hulop.area.getId(p);
		if (source.getFeatureById(id)) {
			console.error('Duplicated id' + id);
			return;
		}
		if (obj._id && obj._id != id) {
			console.error('Incorrect id ' + id + ', it should ' + obj._id);
			return;
		}
		checkDbResult(obj);
		obj.id = id;

		var feature = format.readFeature(obj, {
			'featureProjection' : 'EPSG:3857'
		});
		source.addFeature(feature);
		var properties
		if (feature.get('category') == 'リンクの情報' && feature.get('経路の種類') == 10 && feature.get('リンク延長') != '0') {
			console.error('Invalid リンク延長 for elevator: ' + feature.get('リンク延長'));
			console.error(obj.properties);
		}
		$('<tr>', {
			'click' : function() {
				var nodeID = feature.get('対応ノードID');
				var node = nodeID && source.getFeatureById(nodeID);
				showProperty(node || feature);
			}
		}).append($('<td>', {
			'text' : getDisplayName(feature, true)
		}), $('<td>', {
			'text' : feature.getId()
		})).appendTo('#list tbody');
		return feature;
	}
	
	function newFeaturteCreated(feature) {
		$('<tr>', {
			'click' : function() {
				showProperty(feature);
			}
		}).append($('<td>', {
			'text' : getDisplayName(feature, true)
		}), $('<td>', {
			'text' : feature.getId()
		})).appendTo('#list tbody');
		setModified(feature);
		showProperty(feature);
	}

	function getFeatureRow(id) {
		var found = false;
		return $('#list tbody tr').filter(function() {
			if (!found) {
				return found = ($(this).find('td:last-child').text() === id);
			}
		});
	}

	function showProperty(feature) {
		// console.log('showProperty ' + (feature && feature.getId()));
		$('#properties').empty();
		editingFeature && editingFeature != feature && editingFeature.changed();
		editingFeature = feature;
		$hulop.editor.editingFeature = feature; // for debug
		var selectFeatures = select.getFeatures();
		var editable;
		if (feature) {
			if (feature.get('リンクID')) {
				var start = feature.get('起点ノードID');
				var end = feature.get('終点ノードID');
				editable = start && end && source.getFeatureById(start) && source.getFeatureById(end);
			} else {
				editable = feature.get('ノードID') || feature.get('施設ID') || $hulop.area.getId(feature);
			}
			showPropertyTable(feature);
			var exitList = findExit(feature); // Exit informations
			exitList.length == 0 && addRemoveButton(feature);
			exitList.forEach(function(exit) {
				showPropertyTable(exit);
				addRemoveButton(exit);
			});
		}
		if (editable) {
			if (selectFeatures.item(0) != feature) {
				selectFeatures.clear();
				if (feature.getGeometry().getType() == 'Point') {
					selectPoint = feature;
				} else {
					selectPoint = null;
					selectFeatures.push(feature);
				}
			}
		} else {
			selectFeatures.clear();
		}
	}

	function showPropertyTable(feature) {
		var table = $('<table>').appendTo($('#properties'));
		$('<caption>', {
			'text' : getDisplayName(feature)
		}).appendTo(table);
		var thead = $('<thead>').appendTo(table);
		var tbody = $('<tbody>').appendTo(table);
		$('<tr>').append($('<th>', {
			'text' : M('KEY')
		}), $('<th>', {
			'text' : M('VALUE')
		})).appendTo(thead);
		var added = {
			'category' : true,
			'file' : true
		};
		function appendRow(name, value) {
			if (!added[name]) {
				added[name] = true;
				propertyRow(feature, name, value).appendTo(tbody);
				if (value && name == '対応施設ID') {
					var poi = source.getFeatureById(value);
					var poiName = poi && poi.get('名称');
					if (poiName) {
						$('<tr>', {
							'class' : 'read_only'
						}).append($('<td>', {
							'text' : M('CORRESPONDING_FACILITY')
						}), $('<td>', {
							'text' : poiName
						})).appendTo(tbody)
					}
				}
			}
		}

		function appendGroup(name) {
			name = M('GROUP_' + name);
			$('<tr>', {
				'class' : 'group'
			}).append($('<th>', {
				'text' : name,
				'colspan' : 2
			})).appendTo(tbody);
			return true;
		}

		var category = feature.get('category');
		var optional = OPTIONAL_NAMES[category] || [];
		(PROPERTY_NAMES[category] || []).forEach(function(name) {
			var params = name.split(':');
			if (params.length == 2 && params[0] == 'group' && appendGroup(params[1])) {
				return;
			}
			var value = feature.get(name);
			if (typeof value == 'undefined') {
				if (optional.indexOf(name) != -1) {
					return;
				}
				value = '';
			}
			appendRow(name, value);
		});
		var appendOthers;
		var properties = feature.getProperties();
		for ( var name in properties) {
			if (name == 'geometry') {
				continue;
			}
			if (!appendOthers && !added[name]) {
				appendOthers = appendGroup('OTHERS');
			}
			appendRow(name, properties[name]);
		}

		function expandGroup(tr, expand) {
			if (expand) {
				tr.removeClass('collapsed');
			} else {
				tr.addClass('collapsed');
			}
			for (var next = tr.next(); next.length && !next.hasClass('group'); next = next.next()) {
				expand ? next.show() : next.hide();
			}
		}
		function resetView() {
			var noCollapse = [ M('GROUP_ROAD') ];
			switch (feature.get('経路の種類')) {
			case '10':
				noCollapse.push(M('GROUP_ELEVATOR'));
				break;
			case '12':
				noCollapse.push(M('GROUP_STAIR'));
				break;
			}
			table.find('tbody tr.group').each(function() {
				var tr = $(this);
				if (noCollapse.indexOf(tr.text()) != -1) {
					expandGroup(tr, true);
					return;
				}
				for (var next = tr.next(); next.length && !next.hasClass('group'); next = next.next()) {
					if (next.find('td:nth-child(2)').text()) {
						expandGroup(tr, true);
						return;
					}
				}
				expandGroup(tr, false);
			});
		}
		table.on('click', 'tbody tr.group', function(e) {
			var tr = $(this);
			expandGroup(tr, tr.hasClass('collapsed'));
		});
		table.on('click', 'thead tr', function(e) {
			resetView();
		});
		resetView();
	}

	function propertyRow(feature, name, value) {
		var tips = tooltips[feature.get('category')];
		var editable = READONLY_NAMES.indexOf(name) == -1 && !$hulop.area.isReadOnly(name);
		if (name.startsWith('_NAVCOG_')) {
			if (value.startsWith('{"')) {
				value = JSON.stringify(JSON.parse(value), null, '\t');
			}
		}
		function objValue(obj, key, restore) {
			var v = obj[key];
			if (v) {
				return v;
			}
			var m = key.match(/(.+?)([0-9]+)$/);
			v = m && obj[m[1]];
			if (v) {
				return restore ? v + m[2] : v;
			}
			m = key.match(/(.+?)(:.+)$/);
			v = m && obj[m[1]];
			if (v) {
				return restore ? v + m[2] : v;
			}
		}

		return $('<tr>', {
			'class' : editable ? 'editable' : 'read_only'
		}).append($('<td>', {
			'text' : objValue(keynames, name, true) || name
		}), $('<td>', {
			'title' : tips && objValue(tips, name),
			'on' : {
				'input' : function(event) {
					editingProperty = true;
					feature.set(name, $(event.target).text());
					editingProperty = false;
				}
			},
			'contenteditable' : editable,
			'text' : value
		}));
	}

	function addRemoveButton(feature) {
		if (canRemoveFeature(feature)) {
			$('<button>', {
				'text' : M('DELETE', getDisplayName(feature, true)),
				'click' : function(event) {
					var id = feature.getId();
					removeFeature(feature) && getFeatureRow(id).remove();
				}
			}).appendTo($('#properties'));
		}
	}

	function M() {
		var text;
		for (var i = 0; i < arguments.length; i++) {
			text = (i > 0) ? text.replace('%' + i, arguments[i]) : (messages[arguments[i]] || arguments[i]);
		}
		return text;
	}

	function getDisplayName(feature, short) {
		var category = feature.get('category');
		return keynames[short ? category + '_SHORT' : category] || category;
	}

	function getFloor() {
		return $hulop.indoor && $hulop.indoor.getCurrentFloor() || 0;
	}

	function validate() {
		source.getFeatures().forEach(function(feature) {
			feature.error = false;
		});
		source.getFeatures().forEach(function(feature) {
			var errors = [];
			var id = feature.getId();
			var category = feature.get('category');
			switch (category) {
			case 'ノード情報':
				for (var i = 1; i <= MAX_INDEX; i++) {
					var linkId = feature.get('接続リンクID' + i);
					if (linkId) {
						var link = source.getFeatureById(linkId);
						if (link) {
							if (id != link.get('起点ノードID') && id != link.get('終点ノードID')) {
								errors.push('connect link ID' + i + ' ' + linkId + ' does not connect to ' + id);
								link.error = true;
							}
						} else {
							errors.push('Missing link ' + linkId);
						}
					}
				}
				break;
			case 'リンクの情報':
				var node1 = feature.get('起点ノードID'), node2 = feature.get('終点ノードID');
				if (node1 == node2) {
					errors.push('Start node = End node ' + node1);
				}
				if (node1) {
					var node = source.getFeatureById(node1);
					node || errors.push('Missing node ' + node1);
				} else {
					errors.push('missing start node id');
				}
				if (node2) {
					var node = source.getFeatureById(node2);
					node || errors.push('Missing node ' + node2);
				} else {
					errors.push('missing end node id');
				}
				break;
			}
			if (errors.length > 0) {
				console.log(id + ': ' + category);
				console.log(feature);
				// console.error(errors);
				feature.error = true;
			}
		});
		source.getFeatures().forEach(function(feature) {
			feature.error && getFeatureRow(feature.getId()).css('background-color', '#c0c0c0');
		});
	}

	return {
		'version' : 'h22',
		'findExit' : findExit,
		'showProperty' : showProperty,
		'getHeights' : getHeights,
		'prepareData' : prepareData,
		'newFeature' : newFeature,
		'newFeaturteCreated' : newFeaturteCreated,
		'toFeatureCollection': toFeatureCollection,
		'downloadFile' : downloadFile,
		'init' : init
	};

}();

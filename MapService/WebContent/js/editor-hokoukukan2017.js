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
$hulop.editor.exportV2 = function() {
	var v1features = JSON.parse($hulop.editor.toFeatureCollection()).features;

	// create index
	var nodeMap = {}, entranceMap = {};
	v1features.forEach(function(feature) {
		var fp = feature.properties;
		if (fp) {
			var id;
			(id = fp['ノードID']) && (nodeMap[id] = feature);
			(id = fp['対応施設ID']) && (entranceMap[id] || (entranceMap[id] = [])).push(feature);
		}
	});

	return JSON.stringify({
		'type' : 'FeatureCollection',
		'features' : convert(v1features)
	}, null, '\t');

	/*
	 * convert from v1 to v2
	 */
	function convert(v1) {
		var v2 = [];
		v1.forEach(function(feature) {
			var fp = feature.properties;
			if (fp) {
				console.log(fp);
				var newFeature;
				if (fp['リンクID']) {
					newFeature = convertLink(feature);
				} else if (fp['ノードID']) {
					newFeature = convertNode(feature);
				} else if (fp['施設ID']) {
					newFeature = convertFacility(feature);
					newFeature && (entranceMap[fp['施設ID']] || []).forEach(function(entrance, i) {
						addEntrance(newFeature, entrance, i + 1);
					});
				}
				if (newFeature) {
					v2.push(newFeature);
					console.log(newFeature.properties);
				}
			}
		});
		return v2;
	}

	/*
	 * convert link feature
	 */
	function convertLink(feature) {
		var fp = feature.properties;

		// preset mandatory values unknown
		var tp = {
			'rt_struct': 99,
			'route_type': 99,
			'direction': 99,
			'width': 99,
			'vtcl_slope': 99,
			'lev_diff': 99,
			'tfc_signal': 99,
			'tfc_s_type': 99,
			'brail_tile': 99,
			'elevator': 99
		};

		for ( var name in fp) {
			var value = fp[name];
			switch (name) {
			case 'リンクID':
				set(tp, 'link_id', value);
				break;
			case '起点ノードID':
				set(tp, 'start_id', value);
				break;
			case '終点ノードID':
				set(tp, 'end_id', value);
				break;
			case 'リンク延長':
				set(tp, 'distance', Number(value));
				break;
			case '経路の種類':
				var rt_struct = 99, route_type = 0;
				switch (Number(value)) {
				case 1: // 歩道
				case 2: // 歩行者専用道路
				case 3: // 園路
				case 8: // 自由通路
					rt_struct = 1; // 車道と歩道の物理的な分離あり
					break;
				case 4: // 歩車共存道路
					rt_struct = 2; // 車道と歩道の物理的な分離なし
					break;
				case 5: // 横断歩道
					rt_struct = 3;
					break;
				case 6: // 横断歩道の路面標示の無い交差点の道路
					rt_struct = 4;
					break;
				case 7: // 動く歩道
					route_type = 1;
					break;
				case 9: // 踏切
					route_type = 2;
					break;
				case 10: // エレベーター
					route_type = 3;
					break;
				case 11: // エスカレーター
					route_type = 4;
					break;
				case 12: // 階段
					route_type = 5;
					break;
				case 13: // スロープ
					route_type = 6;
					break;
				case 99: // 不明
					route_type = 99;
					break;
				}
				set(tp, 'rt_struct', rt_struct);
				set(tp, 'route_type', route_type);
				break;
			case '方向性':
				set(tp, 'direction', Code(value));
				break;
			case '有効幅員':
				switch (value = Code(value)) {
				case 1: // 1m 以上 1.5m 未満
				case 2: // 1.5m 以上 2.0m 未満
					value = 1; // 1.0m 以上～2.0m 未満（車いすの通行可能（すれ違い困難））
					break;
				case 3: // 2.0m 以上
					value = 2; // 2.0m 以上～3.0m 未満（車いすの通行可能（すれ違い可能））
					break;
				}
				set(tp, 'width', value);
				break;
			case '縦断勾配1':
				set(tp, 'vSlope_max', value = Number(value));
				var vtcl_slope = isNaN(value) ? 99 : value < 5 ? 0 : 1;
				set(tp, 'vtcl_slope', vtcl_slope);
				break;
			case '段差':
				switch (value = Code(value)){
				case 1: // 2～5cm
				case 2: // 5～10cm
				case 3: // 10cm 以上
					value = 1; // 2 ㎝より大きい（車いすの通行に支障あり）
					break;
				}
				set(tp, 'lev_diff', value);
				break;
			case '信号の有無':
				set(tp, 'tfc_signal', Code(value));
				break;
			case '信号種別':
				set(tp, 'tfc_s_type', Code(value));
				break;
			case 'エスコートゾーン':
			case '視覚障害者誘導用ブロック':
				if (value == '1') {
					set(tp, 'brail_tile', 1);
				}
				break;
			case 'エレベーター種別':
				switch (value = Code(value)) {
				case 0: // 障害対応なし
					value = 1; // エレベーターあり（バリアフリー対応なし）
					break;
				case 1: // 点字・音声あり
				case 2: // 車イス対応
				case 3: // 1・2 両方
					value = 2; // エレベーターあり（バリアフリー対応あり）
					break;
				}
				set(tp, 'elevator', value);
				break;
			case '供用開始時間':
				set(tp, 'start_time', value);
				break;
			case '供用終了時間':
				set(tp, 'end_time', value);
				break;
			case '供用開始日':
				set(tp, 'start_date', value);
				break;
			case '供用終了日':
				set(tp, 'end_date', value);
				break;
			case '供用制限曜日':
				set(tp, 'no_serv_d', value);
				break;
			case '通行制限':
				set(tp, 'tfc_restr', Code(value));
				break;
			case '有効幅員緯度':
				set(tp, 'w_min_lat', DMS(value));
				break;
			case '有効幅員経度':
				set(tp, 'w_min_lon', DMS(value));
				break;
			case '縦断勾配1緯度':
				set(tp, 'vSlope_lat', DMS(value));
				break;
			case '縦断勾配1経度':
				set(tp, 'vSlope_lon', DMS(value));
				break;
			case '横断勾配':
				set(tp, 'hSlope_max', Number(value));
				break;
			case '横断勾配緯度':
				set(tp, 'hSlope_lat', DMS(value));
				break;
			case '横断勾配経度':
				set(tp, 'hSlope_lon', DMS(value));
				break;
			case '路面状況':
				set(tp, 'condition', Code(value));
				break;
			case '段差':
				set(tp, 'levDif_max', Number(value));
				break;
			case '段差緯度':
				set(tp, 'levDif_lat', DMS(value));
				break;
			case '段差経度':
				set(tp, 'levDif_lon', DMS(value));
				break;
			case '最小階段段数':
				set(tp, 'stair', Number(value));
				break;
			case '手すり':
				set(tp, 'handrail', Code(value));
				break;
			case '屋根の有無':
				set(tp, 'roof', Code(value));
				break;
			case '蓋のない溝や水路の有無':
				set(tp, 'waterway', Code(value));
				break;
			case 'バス停の有無':
				set(tp, 'bus_stop', Code(value));
				break;
			case 'バス停の緯度':
				set(tp, 'bus_s_lat', DMS(value));
				break;
			case 'バス停の経度':
				set(tp, 'bus_s_lon', DMS(value));
				break;
			case '補助施設の設置状況':
				set(tp, 'facility', Code(value));
				break;
			case '補助施設の緯度':
				set(tp, 'facil_lat', DMS(value));
				break;
			case '補助施設の経度':
				set(tp, 'facil_lon', DMS(value));
				break;
			case 'エレベーターの緯度':
				set(tp, 'elev_lat', DMS(value));
				break;
			case 'エレベーターの経度':
				set(tp, 'elev_lon', DMS(value));
				break;
			case '信号の緯度':
				set(tp, 'tfc_s_lat', DMS(value));
				break;
			case '信号の経度':
				set(tp, 'tfc_s_lon', DMS(value));
				break;
			case '日交通量':
				set(tp, 'day_trfc', Number(value));
				break;
			case '主な利用者':
				set(tp, 'main_user', Code(value));
				break;
			case '通り名称または交差点名称':
			case '通り名称または交差点名称:ja':
			case '通り名称または交差点名称:en':
			case '通り名称または交差点名称:es':
			case '通り名称または交差点名称:fr':
				set(tp, i18Name(name, 'st_name'), value);
				break;
			case '通り名称または交差点名称:ja-Pron':
				set(tp, 'st_name_hira', kana2hira(value));
				break;
			case 'road_low_priority':
				set(tp, 'hulop_' + name, Number(value));
				break;
			case 'elevator_equipments':
				set(tp, 'hulop_' + name, value);
				break;
			case 'file':
			case 'category':
			case '縦断勾配2':
				break;
			default:
				console.error(name + '=' + value);
				break;
			}
		}

		return {
			'type' : 'Feature',
			'geometry' : feature.geometry,
			'properties' : tp,
		}
	}

	/*
	 * convert node feature
	 */
	function convertNode(feature) {
		var fp = feature.properties;
		var tp = {};

		for ( var name in fp) {
			var value = fp[name];
			switch (name) {
			case 'ノードID':
				set(tp, 'node_id', value);
				break;
			case '緯度':
				set(tp, 'lat', DMS(value));
				break;
			case '経度':
				set(tp, 'lon', DMS(value));
				break;
			case '高さ':
				set(tp, 'floor', Number(value));
				break;
			case 'file':
			case 'category':
			case '緯度経度桁数コード':
				break;
			default:
				var num = name.replace(/^接続リンクID(\d+)$/, '$1');
				if (!isNaN(num)) {
					set(tp, 'link' + num + '_id', value);
					break;
				}
				console.error(name + '=' + value);
				break;
			}
		}

		return {
			'type' : 'Feature',
			'geometry' : feature.geometry,
			'properties' : tp,
		}
	}

	/*
	 * convert facility feature
	 */
	function convertFacility(feature) {
		var fp = feature.properties;
		var name = fp['名称'] || '';
		var toilet = Code(fp['多目的トイレ']) || 99;
		if (fp['ベビーベッド'] == '1') {
			toilet = (toilet == 2 ? 4 : 3);
		}

		// preset mandatory values unknown
		var tp = {
			'facil_type' : 99,
			'evacuation' : 99,
			'temporary' : 99,
			'name_ja' : name,
			'name_en' : /[\u3000-\u9fff]/.exec(name) ? '' : name,
			'address' : '',
			'tel' : '',
			'toilet' : toilet,
			'elevator' : 99,
			'escalator' : 99,
			'parking' : 99,
			'barrier' : 99,
			'nursing' : 99,
			'brail_tile' : 99,
			'info' : 99,
			'info_board' : 99
		}

		for ( var name in fp) {
			var value = fp[name];
			switch (name) {
			case '施設ID':
				set(tp, 'facil_id', value);
				break;
			case '緯度':
				set(tp, 'lat', DMS(value));
				break;
			case '経度':
				set(tp, 'lon', DMS(value));
				break;
			case 'category':
				switch (value) {
				case '公共用トイレの情報':
					set(tp, 'facil_type', 10); // 公共トイレ（単体）
					tp.toilet == 99 && set(tp, 'toilet', 1); // 一般トイレ
					break;
				case '病院の情報':
					set(tp, 'facil_type', 3); // 医療施設
					break;
				case '指定避難場所の情報':
					set(tp, 'evacuation', 2); // 指定避難所
					break;
				default:
					break;
				}
				break;
			case '所在地':
			case '所在地:ja':
			case '所在地:en':
			case '所在地:es':
			case '所在地:fr':
				set(tp, i18Name(name, 'address'), value);
				break;
			case '所在地:ja-Pron':
				set(tp, 'address_hira', kana2hira(value));
				break;
			case '電話番号':
				set(tp, 'tel', value);
				break;
			case '階層':
				set(tp, 'floors', Number(value));
				break;
			case '名称:ja':
			case '名称:en':
			case '名称:es':
			case '名称:fr':
				set(tp, i18Name(name, 'name'), value);
				break;
			case '名称:ja-Pron':
				set(tp, 'name_hira', kana2hira(value));
				break;
			case '供用開始時間':
				set(tp, 'start_time', value);
				break;
			case '供用終了時間':
				set(tp, 'end_time', value);
				break;
			case '供用制限曜日':
				set(tp, 'no_serv_d', value);
				break;
			case '男女別':
				set(tp, 'sex', Code(value));
				break;
			case '有料無料の別':
				set(tp, 'fee', Code(value));
				break;
			case '診療科目':
				set(tp, 'subject', Code(value));
				break;
			case '休診日':
				set(tp, 'close_day', value);
				break;
			case '地区名':
			case '地区名:ja':
			case '地区名:en':
			case '地区名:es':
			case '地区名:fr':
				set(tp, i18Name(name, 'med_dept'), value);
				break;
			case '地区名:ja-Pron':
				set(tp, 'med_dept_hira', kana2hira(value));
				break;
			case '風水害対応':
				set(tp, 'flood', Code(value));
				break;
			case 'building':
			case 'major_category':
			case 'sub_category':
			case 'minor_category':
				set(tp, 'hulop_' + name, value);
				break;
			case 'long_description':
			case 'long_description:ja':
			case 'long_description:en':
			case 'long_description:es':
			case 'long_description:fr':
				set(tp, i18Name(name, 'hulop_long_description'), value);
				break;
			case 'long_description:ja-Pron':
				set(tp, 'hulop_long_description_hira', kana2hira(value));
				break;
			case 'heading':
			case 'angle':
			case 'height':
				set(tp, 'hulop_' + name, Number(value));
				break;
			case 'file':
			case '緯度経度桁数コード':
			case '名称':
			case '多目的トイレ':
			case '施設種別':
			case 'ベビーベッド':
				break;
			default:
				console.error(name + '=' + value);
				break;
			}
		}

		set(tp, 'toilet', toilet);

		return {
			'type' : 'Feature',
			'geometry' : feature.geometry,
			'properties' : tp,
		}
	}

	/*
	 * add entrance properties to facility feature
	 */
	function addEntrance(feature, entrance, index) {
		var fp = feature.properties;
		for (var name in entrance.properties) {
			var value = entrance.properties[name];
			switch (name) {
			case '出入口の名称':
			case '出入口の名称:ja':
			case '出入口の名称:en':
			case '出入口の名称:es':
			case '出入口の名称:fr':
				set(fp, i18Name(name, 'ent' + index + '_n'), value);
				break;
			case '出入口の名称:ja-Pron':
				set(fp, name, 'ent' + index + '_n_hira', kana2hira(value));
				break;
			case '出入口の有効幅員':
				set(fp, 'ent' + index + '_w', Number(value));
				break;
			case '扉の種類':
				set(fp, 'ent' + index + '_d', Code(value));
				break;
			case '段差':
				var brr = 99;
				switch (value) {
				case '0': // ：1.0m 未満
					brr = 1; // 車いす使用者が利用可能な出入口あり
					break;
				case '1': // 1m 以上 1.5m 未満
				case '2': // 1.5m 以上 2.0m 未満
				case '3': // 2.0m以上
					brr = 0; // なし
					break;
				}
				set(fp, 'ent' + index + '_brr', brr);
				break;
			case '対応ノードID':
				var node = nodeMap[value];
				if (node) {
					set(fp, 'ent' + index + '_lat', DMS(node.properties['緯度']));
					set(fp, 'ent' + index + '_lon', DMS(node.properties['経度']));
					set(fp, 'ent' + index + '_fl', Number(node.properties['高さ']));
					set(fp, 'ent' + index + '_node', node.properties['ノードID']);
				}
				break;
			}
		}
	}
	
	/*
	 * Utility functions
	 */
	function set(properties, key, value) {
		switch (typeof value) {
		case 'string':
			value.length == 0 || (properties[key] = value);
			break;
		case 'number':
			isNaN(value) || (properties[key] = value);
			break;
		}
	}
	
	function Code(value) {
		return value == '9' ? 99 : Number(value);
	}

	function DMS(value) {
		var m = /(-?)(\d+)\.(\d+)\.(.*)/.exec(value);
		return m && (m[1] == '-' ? -1 : 1) * (Number(m[2]) + (Number(m[3]) / 60) + (Number(m[4]) / 3600));
	}
	
	function i18Name(v1, v2) {
		var m = /(.+):(.+)$/.exec(v1);
		if (m) {
			return v2 + '_' + (m[2] == 'ja-Pron' ? 'hira' : m[2]);
		}
		return v2;
	}

	function kana2hira(str) {
	    return str.replace(/[\u30a1-\u30f6]/g, function(m) {
	        return String.fromCharCode(m.charCodeAt(0) - 0x60);
	    });
	}
};

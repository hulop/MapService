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

$hulop.area = function() {
	var category = 'area';
	var area_id = 'hulop_area_id';
	var keys = [ area_id, 'hulop_area_name', 'hulop_area_height', 'hulop_area_localization', 'hulop_area_navigation' ];
	var keys_readonly = [ area_id ];
	var keys_string = [ area_id, 'hulop_area_name' ];
	var style = new ol.style.Style({
		'fill' : new ol.style.Fill({
			'color' : 'rgba(0, 255, 0, 0.25)',
		}),
		'stroke' : new ol.style.Stroke({
			'color' : 'rgba(0, 127, 0, 1)',
			'width' : 3
		}),
		'zIndex' : -9
	});
	var selectStyle = new ol.style.Style({
		'fill' : new ol.style.Fill({
			'color' : 'rgba(255, 255, 255, 0.5)'
		}),
		'stroke' : new ol.style.Stroke({
			'color' : 'rgba(0, 153, 255, 1)',
			'width' : 3
		}),
		'zIndex' : -10
	});

	var interaction;
	function addInteraction() {
		var map = $hulop.map.getMap();
		if (map) {
			if (!interaction) {
				interaction = new ol.interaction.Draw({
					'type' : 'Polygon',
					'source' : $hulop.map.getRouteLayer().getSource()
				});
				interaction.on('drawend', function(event) {
					addArea(event.feature);
					map.removeInteraction(interaction);
				});
			}
			map.addInteraction(interaction);
		}
	}

	function addArea(feature) {
		var id = 'EDITOR_' + category + '_' + new Date().getTime();
		feature.setId(id);
		feature.set(area_id, id);
		$hulop.editor.version == 'h22' && feature.set('category', category);
		$hulop.editor.newFeaturteCreated(feature);
	}

	return {
		'addInteraction' : addInteraction,
		'setPropertyNames' : function(propertyNames) {
			return propertyNames[category] = keys;
		},
		'isReadOnly' : function(key) {
			return keys_readonly.indexOf(key) != -1;
		},
		'isString' : function(key) {
			return keys_string.indexOf(key) != -1;
		},
		'getId' : function(feature) {
			return feature[area_id] || feature.get(area_id);
		},
		'getStyle' : function(feature) {
			return style;
		},
		'getSelectStyle' : function(feature) {
			return selectStyle;
		},
		'getCategory' : function(feature) {
			return category;
		},
		'getHeights' : function(feature) {
			var height = Number(feature.get('hulop_area_height'));
			return height ? [ height ] : [];
		},
		'modifyCondition' : function(event, isVertex) {
			return isVertex || ol.events.condition.altKeyOnly(event);
		},
		'deleteCondition' : function(event, isVertex) {
			return isVertex && ol.events.condition.altKeyOnly(event);
		}
	};
}();

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

$hulop.rect = function() {

	var select, dragBox, selecting;

	function addInteraction() {
		var map = $hulop.map.getMap();
		var vectorSource = $hulop.map.getRouteLayer().getSource();
		if (selecting || !map || !vectorSource)
			return;
		if (!dragBox) {
			dragBox = new ol.interaction.DragBox();
			select = new ol.interaction.Select({
				'condition' : ol.events.condition.never
			});

			var selectedFeatures = select.getFeatures();

			dragBox.on('boxstart', function() {
				selectedFeatures.clear();
			});

			dragBox.on('boxend', function() {
				var rotation = map.getView().getRotation();
				var oblique = rotation % (Math.PI / 2) !== 0;
				var candidateFeatures = oblique ? [] : selectedFeatures;
				var extent = dragBox.getGeometry().getExtent();
				var getStyle = $hulop.map.getRouteLayer().getStyle();
				vectorSource.forEachFeatureIntersectingExtent(extent, function(feature) {
					if ($hulop.map.getRouteLayer().getStyle()(feature)
							&& ol.extent.containsExtent(extent, feature.getGeometry().getExtent())) {
						candidateFeatures.push(feature);
					}
				});

				if (oblique) {
					var anchor = [ 0, 0 ];
					var geometry = dragBox.getGeometry().clone();
					geometry.rotate(-rotation, anchor);
					var extent$1 = geometry.getExtent();
					candidateFeatures.forEach(function(feature) {
						var geometry = feature.getGeometry().clone();
						geometry.rotate(-rotation, anchor);
						if (geometry.intersectsExtent(extent$1)) {
							selectedFeatures.push(feature);
						}
					});
				}
				map.removeInteraction(dragBox);
				setTimeout(function() {
					var count = selectedFeatures.getLength();
					if (count > 0 && confirm('Delete ' + count + ' features?')) {
						$hulop.editor.removeSelection(selectedFeatures.getArray());
					}
					selectedFeatures.clear();
					map.removeInteraction(select);
					selecting = false;
				})
			});
		}
		map.addInteraction(dragBox);
		map.addInteraction(select);
		selecting = true;
	}

	return {
		'addInteraction' : addInteraction
	};
}();

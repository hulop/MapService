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
	var map, source, vector;

	function init(cb) {
		console.log('Location log init');
		map = $hulop.map.getMap();
		map.addControl(new ol.control.Zoom());		
				
		map.on('click', function(event) {
			console.log(event);
			var feature = new ol.Feature({
				  geometry: new ol.geom.Point(event.coordinate)
				});

			source.clear();
			source.addFeatures([feature]);
			showQRCode(feature);
			vector.changed();
		});	
		
		source = new ol.source.Vector();
		vector = new ol.layer.Vector({
			'source' : source,
			'style' : function(feature) {
				var color = feature.get('color');
				return new ol.style.Style({
					'image' : new ol.style.Circle({
						'radius' : 8,
						'fill' : new ol.style.Fill({
							'color' : '#FFFFFF'
						}),
						'stroke' : new ol.style.Stroke({
							'color' : '#0000FF',
							'width' : 3
						})
					})
				});
			},
			'visible' : true,
			'zIndex' : 102
		});
		map.addLayer(vector);
	}

	function showQRCode(node) {
		$('#qrcode').empty();
		
		var point = node.getGeometry();
		var height = $hulop.indoor.getCurrentFloor();
		var div = $('<div>').appendTo($('#qrcode')).css({"padding":"10px", "text-align":"center"}).attr("id","qrcode");
		
		console.log(point.getCoordinates());
		
		// show QR code
		var ll = ol.proj.transform(point.getCoordinates(), "EPSG:3857", "EPSG:4326");
		var lat = Math.round(ll[1]*10e7)/10e7;
		var lng = Math.round(ll[0]*10e7)/10e7;
		var message = `latlng:${lat}:${lng}:${height}`;
		$('<div>').text(message).appendTo(div);
		var qrdiv = $('<div>').appendTo(div);
		var qrcode = new QRCode(qrdiv[0], {
			text: message,
			width: 360,
			height: 360,
			colorDark : "#000000",
			colorLight : "#ffffff",
			correctLevel : QRCode.CorrectLevel.L
		});		
		
		// show print button
		var btn = $('<button>').text("Print").appendTo(div).click(function() {
			// prepare for print
			btn.hide();
			// need to use fix size to print in proper aspect
			var olu = $("canvas.ol-unselectable");
			olu.css({"width":olu.width()+"px", "height":olu.height()+"px"});
			window.print();
			// hide QR code and show button again after closing the prompt 
			btn.show();
			olu.css({"width":"100%","height":"100%"});
		});
	}

	return {
		'init' : init
	};

}();

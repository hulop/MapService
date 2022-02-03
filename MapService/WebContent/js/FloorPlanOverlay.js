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

function FloorPlanOverlay(options) {
	(FloorPlanOverlay.instances = FloorPlanOverlay.instances || []).push(this);
	var overlay = this;
	this.setOption(options);
	(this.img = new Image()).onload = function() {
		if (overlay.width == 1000 && overlay.height == 1000) {
			overlay.width = overlay.img.width;
			overlay.height = overlay.img.height;
			var max = Math.max(overlay.width, overlay.height);
			overlay.ppm_x = overlay.ppm_y = overlay.ppm * max / 1000;
			overlay.origin_x = max / 2;
			if (overlay.width > overlay.height) {
				overlay.origin_y = overlay.height - max / 2;
			} else {
				overlay.origin_y = max / 2;
			}
			console.log(overlay);
		}
		for (var ov of FloorPlanOverlay.instances) {
			if (ov.floor == overlay.floor && ov.members) {
				overlay.parent = ov;
				ov.members.push(overlay);
				ov.members.sort(function(a, b) {
					return (a.zIndex || 0) - (b.zIndex || 0);
				});
				if (ov.canvas) {
					ov.canvas.width = ov.canvas.height = 0;
					ov.source.changed();
				}
				return;
			}
		}
		overlay.members = [overlay];
		var map = $hulop.map.getMap()
		var maxRatio = 1.5;
		if (!/chrome/i.test(navigator.userAgent)) {
			var wh = map.getSize().map((v) => v * devicePixelRatio);
			maxRatio = 4096 / (wh[0] + wh[1]) * Math.sqrt(2);
			console.log("maxRatio=" + maxRatio);
		}
		overlay.source = new ol.source.ImageCanvas({
			'ratio': Math.max(1.0, Math.min(maxRatio, 1.5)),
			'canvasFunction' : function(extent, resolution, pixelRatio, size, projection) {
				// Set the last canvas size to 0 because ImageCanvas caches last canvas only
				// https://github.com/openlayers/openlayers/blob/master/src/ol/source/ImageCanvas.js
				overlay.canvas && (overlay.canvas.width = overlay.canvas.height = 0);
				var canvas = overlay.canvasFunction(extent, resolution, pixelRatio, size, projection);
				if (canvas) {
					return overlay.canvas = canvas;
				}
				console.error('canvasFunction error');
				var now = new Date().getTime();
				if (FloorPlanOverlay.lastRetry > now - 1000) {
					return;
				}
				FloorPlanOverlay.lastRetry = now;
				$hulop.logging && $hulop.logging.onData({
					"event" : "error",
					"message" : "canvasFunction error",
					"timestamp" : now
				});
				FloorPlanOverlay.instances.forEach(function(ov) {
					ov.canvas && (ov.canvas.width = ov.canvas.height = 1);
				});
				setTimeout(function() {
					FloorPlanOverlay.instances.forEach(function(ov) {
						ov.source && ov.source.changed();
					});
				});
			},
			'projection' : 'EPSG:3857'
		});
		overlay.canvasLayer = new ol.layer.Image({
			'opacity' : 1.0,
			'visible' : overlay.visible,
			'source' : overlay.source,
			'zIndex' : overlay.zIndex
		});
		map.addLayer(overlay.canvasLayer);
	}
}

FloorPlanOverlay.prototype.setOption = function(options) {
	if (options) {
		for ( var key in options) {
			this[key] = options[key];
		}
		// backward compatibility
		if (this.ppm_x == undefined || this.ppm_y == undefined) {
			this.ppm_x = this.ppm;
			this.ppm_y = this.ppm;
		}
		this.origin_x = (this.origin_x != undefined) ? this.origin_x : this.width / 2;
		this.origin_y = (this.origin_y != undefined) ? this.origin_y : this.height / 2;
		// end backward compatibility
	}
	try {
		if (this.width != 1000 || this.height != 1000) {
			var x = (this.width / 2 - this.origin_x) / this.ppm_x;
			var y = (this.height / 2 - this.origin_y) / this.ppm_y;
			var ref = ol.proj.transform([ this.lng, this.lat ], 'EPSG:4326', 'EPSG:3857');
			var r = ol.proj.getPointResolution("EPSG:3857", 1, ref);
			var rad = -this.rotate / 180 * Math.PI;
			var c = Math.cos(rad);
			var s = Math.sin(rad);
			var dx = (x * c - y * s) / r;
			var dy = (x * s + y * c) / r;
			this.center = ol.proj.transform([ ref[0] + dx, ref[1] + dy ], 'EPSG:3857', 'EPSG:4326');
		}
	} catch(e) {
		console.error(e);
	}
}

FloorPlanOverlay.prototype.show = function(show) {
	this.visible = show;
	if (this.parent) {
		return;
	}
	if (this.canvasLayer) {
		this.canvasLayer.setVisible(show);
	} else if (show) {
		this.img.src = this.src;
	}
	if (!show && this.canvas && this.canvas.width > 0 && this.source) {
		this.canvas.width = this.canvas.height = 0;
		this.source.changed();
	}
}

FloorPlanOverlay.prototype.canvasFunction = function(extent, resolution, pixelRatio, size, projection) {
	// console.log(arguments);
	console.log(((w, h) => `Canvas size: ${w} x ${h} (${(w * h / 1024 / 1024).toFixed(3)}MP)`)(Math.floor(size[0]), Math.floor(size[1])));

	var canvas = document.createElement('canvas');
	canvas.width = size[0];
	canvas.height = size[1];
	var context = canvas.getContext('2d');
	if (!context) {
		return;
	}

	function getTranslate(xy) {
		return [ size[0] * (xy[0] - extent[0]) / (extent[2] - extent[0]), size[1] * (extent[3] - xy[1]) / (extent[3] - extent[1]) ];
	}

	var dpr = window.devicePixelRatio || 1;
	for (var ov of this.members) {
		function getScale(xy) {
			var r = ol.proj.getPointResolution(projection, resolution, xy);
			return [ dpr / r / ov.ppm_x, dpr / r / ov.ppm_y ];
		}

		var ref = ol.proj.transform([ ov.lng, ov.lat ], 'EPSG:4326', 'EPSG:3857');
		var trans = getTranslate(ref);
		var scale = getScale(ref);

		context.save();
		context.translate(trans[0], trans[1]);
		context.rotate(ov.rotate * Math.PI / 180);
		context.scale(scale[0], scale[1]);
		context.drawImage(ov.img, -ov.origin_x, ov.origin_y - ov.height, ov.width, ov.height);
		// context.fillStyle = 'rgba(0,0,255,0.1)';
		// context.fillRect(-ov.origin_x, ov.origin_y - ov.height, ov.width,
		// ov.height);
		// context.arc(0, 0, 10, 0, 2 * Math.PI, false);
		// context.fillStyle = 'red';
		// context.fill();
		context.restore();
	}
	return canvas;
}

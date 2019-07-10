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
	var map, source, vector, heatmap, back_source, back_vector, lastFeatures = [];
	var device_index = [];
	var device_colors = [ 'rgba(255, 40, 0, 0.6)', 'rgba(0, 65, 255, 0.6)', 'rgba(53, 161, 107, 0.6)', 'rgba(250, 245, 0, 0.6)', 'rgba(255, 153, 160, 0.6)',
			'rgba(200, 200, 203, 0.6)', 'rgba(154, 0, 121, 0.6)' ];
	var back_style = new ol.style.Style({
		'image' : new ol.style.Circle({
			'radius' : 4,
			'fill' : new ol.style.Fill({
				'color' : 'rgba(255, 200, 255, 1.0)'
			})
		})
	});

	function getData(device, start, end, callback) {
		var query = {
			'action' : 'get'
		};
		start && (query.start = start);
		end && (query.end = end);
		device && (query.clientId = device);
		if (device && !start) {
			query.skip = 0;
		}
		$.ajax({
			'type' : 'get',
			'url' : 'api/log',
			'data' : query,
			'success' : function(data) {
				callback(data);
			},
			'error' : function(XMLHttpRequest, textStatus, errorThrown) {
				console.error(textStatus + ' (' + XMLHttpRequest.status + '): ' + errorThrown);
				$hulop.util.loading(false);
			}
		});
	}

	function getFeatures(device_id, start, end) {
		var limit = start && end && Math.min(end, start + 24 * 60 * 60 * 1000);
		getData(device_id, start, limit, function(data) {
			var lastPoint, convPoint, conversations = [], lastFeature;
			function flush() {
				if (conversations.length) {
					var messages = 'device: ' + device_id + '\n';
					var dest_name;
					conversations.forEach(function(log, index) {
						console.log(log);
						var q = log.input.text;
						if (index == 0 || !q) {
							messages += '-------------------\n';
						}
						if (q) {
							messages += '[User ' + log.time + ']: ';
							messages += q + '\n';
						}
						messages += '[System ' + log.time + ']: '
						if (log.output) {
							messages += log.output.text.join('\n');
						}
						if (log.context.navi && log.context.dest_info) {
							messages += '\n[' + log.context.dest_info.name + ': ' + log.context.dest_info.nodes + ']';
							dest_name = log.context.dest_info.name;
						}
						messages += '\n\n';
					});
					console.log(messages);
					var lastFeature = lastFeatures[lastFeatures.length - 1];
					if (lastFeature) {
						lastFeature.set('messages', messages);
						dest_name && lastFeature.set('dest_name', dest_name);
					}
					conversations = [];
					convPoint = null;
				}
			}
			data.forEach(function(d, i) {
				if (d.event == 'location' && 'longitude' in d && 'latitude' in d) {
					lastPoint = [ d.longitude, d.latitude ];
					if (convPoint) {
						var moved = $hulop.util.computeDistanceBetween(lastPoint, convPoint);
						if (moved > 10) {
							flush();
						}
					}
					var point = ol.proj.transform(lastPoint, 'EPSG:4326', 'EPSG:3857');
					var feature = new ol.Feature(new ol.geom.Point(point));
					var floor = Math.round(d.floor);
					floor >= 0 && floor++;
					feature.set('floor', floor);
					var index = device_index.indexOf(d.client);
					if (index == -1) {
						index = device_index.length;
						device_index.push(d.client);
					}
					feature.set('color', device_colors[index % device_colors.length]);
					feature.set('timestamp', d.timestamp);
					feature.set('client', d.client);
					lastFeatures.push(feature);
				} else {
					if (d.event == 'conversation' && d.log) {
						d.log.time = new Date(d.timestamp).toLocaleString();
						convPoint = lastPoint;
						conversations.push(d.log);
						if (d.log.context.navi) {
							flush();
						}
					}
				}
			});
			flush();
			if (limit && limit < end) {
				console.log(new Date(start).toLocaleDateString() + ' ' + lastFeatures.length + ' features');
				getFeatures(device_id, limit, end);
			} else {
				if (lastFeatures.length > 0) {
					lastFeatures.sort(function(a, b) {
						return a.get('timestamp') - b.get('timestamp');
					});
					// console.log(lastFeatures);
					$('#time').attr('max', lastFeatures.length - 1);
				}
				showFeatures();
				$hulop.util.loading(false);
			}
		});
	}

	function load() {
		try {
			var dates = $('#date').val().split('-');
			var start = new Date(dates[0]).getTime();
			var end = dates.length > 1 ? new Date(dates[1]).getTime() : start;
			if (end >= start) {
				$('#message').text('');
				device_index = [];
				lastFeatures = [];
				$hulop.util.loading(true);
				getFeatures(null, start, end + 24 * 60 * 60 * 1000);
			}
		} catch (e) {
			console.error(e);
		}
	}

	function showFeatures() {
		var floor = $hulop.indoor && $hulop.indoor.getCurrentFloor() || 0;
		var days = $("#filter_days").val().trim().split(/\s*,\s*/);
		var hours = $("#filter_hours").val().trim().split(/\s*,\s*/);
		if (days.length > 0 && days[0] != '') {
			days = days.map(function(day) {
				return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(day.toLowerCase());
			});
		} else {
			days = null;
		}
		if (hours.length > 0 && hours[0] != '') {
			hours = hours.map(function(range) {
				return range.split('-').map(function(hhmm) {
					var hh_mm = hhmm.split(':');
					return parseInt(hh_mm[0]) * 60 + parseInt(hh_mm[1]);
				});
			});
		} else {
			hours = null;
		}
		var countMap = {}, maxCount = 0;
		var features = lastFeatures.filter(function(feature) {
			if (device_filter && device_filter.indexOf(feature.get('client')) == -1) {
				return false;
			}
			var date = new Date(feature.get('timestamp'));
			var day = date.getDay(), minutes = date.getHours() * 60 + date.getMinutes();
			if (days && days.indexOf(day) == -1) {
				return false;
			}
			if (hours && hours.filter(function(range) {
				return minutes >= range[0] && minutes < range[1];
			}).length == 0) {
				return false;
			}
			var f = feature.get('floor');
			var count = (countMap[f] || 0) + 1;
			maxCount = Math.max(maxCount, count);
			countMap[f] = count;
			return floor == f;
		});
		var rate = Math.min((Number($("#filter_thinning").val()) || 100) / 100, 7500 / maxCount);
		if (rate < 1) {
			var lastIndex = -1;
			features = features.filter(function(feature, index) {
				var newIndex = Math.floor(index * rate);
				if (newIndex != lastIndex) {
					lastIndex = newIndex;
					return true;
				}
			});
		}
		source.clear();
		source.addFeatures(features);
		$('#message').text(features.length ? Math.floor(rate * 10000) / 100 + '% (' + features.length + '/' + countMap[floor] + ') locations' : '');
	}

	function showBackground() {
		if (!back_vector.getVisible()) {
			return;
		}
		var index = Number($('#time').val());
		var floor = lastFeatures[index].get('floor');
		var features = [];
		for (var i = index - 1; i >= 0; i--) {
			var f = lastFeatures[i];
			if (f.get('floor') != floor) {
				break;
			}
			features.push(f);
		}
		for (var i = index; i < lastFeatures.length; i++) {
			var f = lastFeatures[i];
			if (f.get('floor') != floor) {
				break;
			}
			features.push(f);
		}
		back_source.clear();
		back_source.addFeatures(features);
	}

	var device_filter, fr = new FileReader();
	fr.addEventListener('load', function () {
		device_filter = this.result.trim().split(/\s*,\s*/);
	});

	function init(cb) {
		console.log('Location log init');
		map = $hulop.map.getMap();
		map.addControl(new ol.control.Zoom());
		$('.ui-icon-home').on('click', showFeatures);
		$('#filter_button').on('click', showFeatures);
		$('#load').on('click', load);
		$('#date').on('keydown', function(event) {
			event.keyCode == 13 && load();
		});
		$('#filter_csv').on('change', function() {
			device_filter = null;
			this.files[0] && fr.readAsText(this.files[0]);
		});
		$('#filter_csv_cancel').on('click', function() {
			$('#filter_csv').val(device_filter = null);
		});
		$('#heatmap').change(function() {
			var showHeatmap = $(this).is(':checked');
			vector.setVisible(!showHeatmap);
			heatmap.setVisible(showHeatmap);
		});
		$('#plot_all').change(function() {
			var plot_all = $(this).is(':checked');
			back_vector.setVisible(plot_all);
			showBackground();
		});
		source = new ol.source.Vector();
		vector = new ol.layer.Vector({
			'source' : source,
			'style' : function(feature) {
				var color = feature.get('color');
				return new ol.style.Style({
					'image' : new ol.style.Circle({
						'radius' : 4,
						'fill' : new ol.style.Fill({
							'color' : color
						})
					})
				});
			},
			'visible' : true,
			'zIndex' : 102
		});
		map.addLayer(vector);
		heatmap = new ol.layer.Heatmap({
			'source' : source,
			'radius' : 4,
			'blur' : 15,
			'visible' : false,
			'zIndex' : 102
		});
		map.addLayer(heatmap);
		back_source = new ol.source.Vector();
		back_vector = new ol.layer.Vector({
			'source' : back_source,
			'style' : function(feature) {
				if (feature.get('messages')) {
					return new ol.style.Style({
						'image' : new ol.style.Icon({
							'anchor' : [ 0.5, 1 ],
							'scale' : 36 / 25,
							'anchorXUnits' : 'fraction',
							'anchorYUnits' : 'fraction',
							'src' : 'images/' + (feature.get('dest_name') ? 'marker-blue.png' : 'map-marker.png')
						})
					});
				}
				return back_style;
			},
			'visible' : true,
			'zIndex' : 101
		});
		map.addLayer(back_vector);

		function onSlider() {
			var index = Number($('#time').val());
			var feature = lastFeatures[index];
			var timestamp = feature.get('timestamp');
			var floor = feature.get('floor');
			$('#message').text(new Date(timestamp).toLocaleString());
			if (index == 0 || ($hulop.indoor && $hulop.indoor.getCurrentFloor() != floor)) {
				$hulop.indoor.showFloor(floor);
				showBackground();
			}
			var features = [];
			for (var i = index; i >= 0; i--) {
				var f = lastFeatures[i];
				if (f.get('timestamp') < timestamp - 10 * 1000) {
					break;
				}
				features.push(f);
			}
			source.clear();
			source.addFeatures(features);
		}

		function showTracks() {
			// console.log((new Date()).getTime());
			if (lastFeatures.length > 0) {
				var index = Number($('#time').val()) + 1;
				if (index >= lastFeatures.length) {
					$('#pause').prop('checked', true);
					$('#time').val(0);
					onSlider();
					return;
				}
				$('#time').val(index);
				onSlider();
			}
			if (!$('#pause').prop('checked')) {
				// console.log((new Date()).getTime());
				setTimeout(showTracks, 100);
			}

		}
		var plot;
		location.search.substr(1).split('&').forEach(function(arg) {
			if (arg) {
				var kv = arg.split('=');
				if (kv[0] == 'plot') {
					plot = kv[1];
				}
			}
		});
		if (plot) {
			$hulop.util.loading(true);
			getFeatures(plot);
			$('.device').show();
			$('.date').hide();
			$('#time').on('input', onSlider);
			$('#pause').change(function() {
				if (!$(this).is(':checked')) {
					showTracks();
				}
			});
			if ($('#answers').length) {
				$('.plot').show();
				$('#show_info').change(function() {
					if ($(this).is(':checked')) {
						$('#answers').show();
					} else {
						$('#answers').hide();
					}
				});
			}
			heatmap.setRadius(6);
			heatmap.setBlur(10);
			showTracks();
			map.on('click', function(event) {
				var feature = map.forEachFeatureAtPixel(event.pixel, function(feature) {
					if (feature.get('client')) {
						return feature;
					}
				});
				feature && feature.get('messages') && alert(feature.get('messages'));
			});
		} else {
			$('#filter').show();
			map.on('click', function(event) {
				var feature = map.forEachFeatureAtPixel(event.pixel, function(feature) {
					if (feature.get('client')) {
						return feature;
					}
				});
				// if (feature && feature.get('messages')) {
				// alert(feature.get('messages'));
				// return;
				// }
				var clientId = feature && feature.get('client');
				if (clientId && confirm('Plot ' + clientId + '?')) {
					window.open('locationlog.jsp?plot=' + clientId, "plot");
				}
			});
		}
	}

	return {
		'heatmap' : function() {
			return heatmap
		},
		'init' : init,
		'load' : load
	};

}();

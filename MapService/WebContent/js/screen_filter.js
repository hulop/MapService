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

$hulop.screen_filter = function() {
	var history = [], last;

	function onUpdateLocation(crd) {
		var start_timer = $hulop.config.SCREEN_FILTER_START_TIMER;
		var walk_speed = $hulop.config.SCREEN_FILTER_SPEED;
		if (!(start_timer && walk_speed && crd.provider == 'bleloc')) {
			return;
		}
		var stop_timer = $hulop.config.SCREEN_FILTER_STOP_TIMER || (start_timer / 2);
		var visible = $('#screen_filter').size() > 0;
		var timer = visible ? stop_timer : start_timer;
		if (last) {
			crd.distance = Math.min($hulop.util.computeDistanceBetween([ crd.longitude, crd.latitude ], [ last.longitude,
					last.latitude ]), 8 * walk_speed * (crd.timestamp - last.timestamp) / 1000);
		} else {
			crd.distance = 0;
		}
		history.push(last = crd);
		var distance = 0
		history = history.filter(function(data) {
			if (data.timestamp + timer * 1000 > crd.timestamp) {
				distance += data.distance;
				return true;
			}
			return false;
		});
		var show = distance > walk_speed * timer;
		if (show != visible) {
			filter(show ? {} : null)
		}
	}
	
	function filter(options) {
		console.log([ 'filter', options ]);
		if (options) {
			var color = options.color || 'black';
			var opacity = isNaN(options.opacity) ? 0.75 : options.opacity;
			var css = {
				'position' : 'fixed',
				'top' : '0px',
				'left' : '0px',
				'height' : '100%',
				'width' : '100%',
				'z-index' : 9999,
				'background-color' : color,
				'filter' : 'alpha(opacity=' + (opacity * 100) + ')',
				'-moz-opacity' : opacity,
				'opacity' : opacity
			};
			if ($('#screen_filter').size() == 0) {
				$('<div>', {
					'id' : 'screen_filter',
					'on' : {
						'click' : function(event) {
							console.log([ 'click', event ])
							filter();
						}
					}
				}).appendTo($('body'));
			}
			$('#screen_filter').css(css);
		} else {
			$('#screen_filter').remove();
			history = [];
		}
	}

	return {
		'filter' : filter,
		'onUpdateLocation' : onUpdateLocation
	}
}();
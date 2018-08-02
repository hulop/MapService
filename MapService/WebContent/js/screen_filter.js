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
	var button, a;

	function onUpdateLocation(crd) {
		var start_timer = $hulop.config.SCREEN_FILTER_START_TIMER;
		var walk_speed = $hulop.config.SCREEN_FILTER_SPEED;
		if (!(start_timer && walk_speed && crd.provider == 'bleloc')) {
			return;
		}
		if (isPopupOpen()) {
			return;
		}
		$hulop.config.SCREEN_FILTER_NO_BUTTON || button || showButton();
		if (!use_filter()) {
			filter();
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
	
	function showButton() {
		var map = $hulop.map.getMap();
		button = $('<div>', {
			'class' : 'ol-unselectable ol-control TOP',
			'css' : {
				'z-index' : 10000
			}
		});
		a = $('<a>', {
			'href' : '#',
			'class' : 'ui-btn ui-mini ui-shadow ui-corner-all ui-btn-icon-top',
			'css' : {
				'margin' : '0px',
				'width' : '22px'
			},
			'on' : {
				'click' : function(e) {
					e.preventDefault();
					e.target.blur();
					a.toggleClass('ui-icon-forbidden');
					a.toggleClass('ui-icon-alert');
					localStorage.setItem('screen_filter', use_filter());
					use_filter() || showPopup('歩きスマホ防止機能：解除時メッセージ', 3 * 1000);
				}
			}
		}).appendTo(button);
		a.addClass(localStorage.getItem('screen_filter') == 'false' ? 'ui-icon-forbidden' : 'ui-icon-alert');
		map.addControl(new ol.control.Control({
			'element' : button[0]
		}));
		showPopup('歩きスマホ防止機能：起動時メッセージ', 10 * 1000);
	}

	function use_filter() {
		return a && a.hasClass('ui-icon-alert');
	}

	function showPopup(text, timeout) {
		$('#popupText').text(text);
		$('#popupDialog').css({
			'z-index' : 10000
		});
		$('#popupDialog').popup('open');
		timeout && setTimeout(function() {
			$('#popupDialog').popup('close');
		}, timeout);
	}

	function isPopupOpen() {
		$('#popupDialog').parent().hasClass("ui-popup-active");
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
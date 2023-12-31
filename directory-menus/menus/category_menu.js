/*******************************************************************************
 * Copyright (c) 2014, 2023 IBM Corporation, Carnegie Mellon University and
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

$hulop.category_menu = function() {

	var messages = {};
	var defaultLang = $hulop.messages.defaultLang;
	var directory, currentLatLng, currentDist;
	var showSectionIndex = true;
	var landmarkNodes;

	function M(text) {
		if (text.startsWith('$')) {
			text = text.substr(1);
			return messages[text] || text;
		}
		return text;
	}

	function loadMessages(language) {
		$.ajax({
			'type' : 'get',
			'url' : 'menus/messages_' + language + '.json',
			'dataType' : 'json',
			'success' : function(data) {
				messages = data;
				console.log('messages loaded ' + language);
				console.log(messages);
			},
			'error' : function(XMLHttpRequest, textStatus, errorThrown) {
				console.error(textStatus + ' (' + XMLHttpRequest.status + '): ' + errorThrown);
				if (XMLHttpRequest.status == 404 && language != 'en') {
					loadMessages('en');
				}
			}
		});
	}
	loadMessages(defaultLang);

	function show(nodes) {
		$('#category_menu').empty();
		var url = $hulop.config.QUERY_SERVICE;
		if (!url) {
			return false;
		}
		landmarkNodes = nodes;
		var center = $hulop.map.getCenter();
		var dist = Number($('#dist').val());
		if (dist != currentDist || !currentLatLng || $hulop.util.computeDistanceBetween(center, currentLatLng) > dist * 0.9) {
			currentLatLng = center;
			currentDist = dist;
			var user = ($hulop.logging && $hulop.logging.getClientId()) || new Date().getTime();
			$hulop.util.loading(true);
			$.ajax({
				'type' : 'get',
				'url' : url+"directory",
				'data' : {
					'user' : user,
					'lang' : defaultLang,
					'lat' : center[1],
					'lng' : center[0],
					'dist' : dist
				},
				'dataType' : 'json',
				'success' : function(data) {
					directory = data;
					$hulop.util.loading(false);
					show_directory(directory) || $('.basic_menu').show();
				},
				'error' : function(XMLHttpRequest, textStatus, errorThrown) {
					console.error(textStatus + ' (' + XMLHttpRequest.status + '): ' + errorThrown);
					$hulop.util.loading(false);
					$('.basic_menu').show();
				}
			});
			return true;
		} else {
			return show_directory(directory);
		}
	}
	
	var $search, lastSearch;

	function show_directory(directory) {
		if (!directory) {
			return false;
		}
		$.mobile.listview.prototype.options.header = '<div data-role="header"><h1></h1><a href="#" data-rel="back" data-icon="back" class="ui-btn-right">'
			+ M('$BACK') + '</a></div>';
		var parent = $('<ul>', {
			'data-filter': true,
			'css' : {
				'margin' : '0'
			}
		});
		
		if (!$search) {
//			$search = $('<input id="search" name="search" type="search"/>');
			$search = $('<input id="search" name="search" type="text" data-type="search">');
			$search.insertBefore($("#category_menu"));
			$search.textinput().keyup(function() {
				var url = $hulop.config.QUERY_SERVICE;
				if (!url) {
					return false;
				}
				var user = ($hulop.logging && $hulop.logging.getClientId()) || new Date().getTime();
				var query = $search.val();
				lastSearch = query;
				if (query == "") {
					show_directory(directory)
				} else {
					$.ajax({
						'type' : 'get',
						'url' : url+"search",
						'data' : {
							'user' : user,
							'lang' : defaultLang,
							'q' : query
						},
						'dataType' : 'json',
						'success' : function(data) {
							if (lastSearch != query) {
								return;
							}
							show_directory(data) || show_directory(directory) || $('.basic_menu').show();
						},
						'error' : function(XMLHttpRequest, textStatus, errorThrown) {
							if (lastSearch != query) {
								return;
							}
							console.error(textStatus + ' (' + XMLHttpRequest.status + '): ' + errorThrown);
							show_directory(directory) || $('.basic_menu').show();
						}
					});
				}
			});
		}
		return _show_directory(directory, parent, false);
	}
	
	function _show_directory(directory, parent, filter) {
		directory.sections.forEach(function(section) {
			parent.append($('<li>', {
				'data-role' : 'list-divider'
			}).append($('<h1>', {
				'text' : section.title
			})));
			if (!section.items) {
				return;
			}
			section.items.forEach(function(item) {
				if (item.content) {
					var list = $('<ul>', {
						'data-filter': true
					});
					if (item.content) {
						_show_directory(item.content, list, true);
					}
					parent.append($('<li>', {
						'text' : item.title
					}).append(list));
				} else {
					createLink(item, parent);
				}
			});
		});
		$('#category_menu').html(parent.listview({
			'dividerTheme' : 'a',
			'countTheme' : 'b',
			'childPages' : true,
			'inset' : false
		}));
		return true;
	}
	
	function createLink(item, parent) {
		var $li = $('<li>', {
			'onclick' : 'javascript:$hulop.map.doSearch(false, "' + item.nodeID + '")'
		}).addClass("ui-btn").appendTo(parent);
		var title = $('<h3>', {
			'text' : item.title || item.nodeID
		}).appendTo($li);
		item.subtitle && $('<p>', {
			'text' : item.subtitle
		}).appendTo($li);
		item.nodeID.split('|').filter(function(id) {
			var node = landmarkNodes[id];
			return node && !node.disable;
		}).length > 0 || $li.addClass('ui-disabled');
	}
	
	return {
		'show' : show
	}
	
}();

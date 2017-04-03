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
var $hulop_audit = function() {
	$(document).ready(function() {
		$.ajax({
			'type' : 'get',
			'url' : 'api/log',
			'data' : {
				'action' : 'stats'
			},
			'success' : function(data) {
				console.log(data);
				showDeviceList(data, $('#logList'));
			},
			'error' : function(XMLHttpRequest, textStatus, errorThrown) {
				console.error(textStatus + ' (' + XMLHttpRequest.status + '): ' + errorThrown);
			}
		});
		$.ajax({
			'type' : 'get',
			'url' : 'api/log',
			'data' : {
				'action' : 'last'
			},
			'success' : function(data) {
				showLastLogs(data, $('#lastLogs'));
			},
			'error' : function(XMLHttpRequest, textStatus, errorThrown) {
				console.error(textStatus + ' (' + XMLHttpRequest.status + '): ' + errorThrown);
			}
		});
		$.ajax({
			'type' : 'get',
			'url' : 'api/log',
			'data' : {
				'action' : 'get_agreements'
			},
			'success' : function(data) {
				showEntries(data, $('#entryList'));
			},
			'error' : function(XMLHttpRequest, textStatus, errorThrown) {
				console.error(textStatus + ' (' + XMLHttpRequest.status + '): ' + errorThrown);
			}
		});
		$('#download').on({
			'click' : function() {
				try {
					var start = new Date($('#logDate').val()).getTime();
					var end = start + 24 * 60 * 60 * 1000;
					location.href = 'api/log?action=get&skip=0&fileName=logs.json&start=' + start + '&end=' + end;

				} catch (e) {
					console.error(e);
				}
			}
		});
	});

	function showDeviceList(deviceList, parent, action) {
		var table = $('<table>', {
			'border' : 1
		});
		var thead = $('<thead>').appendTo(table);
		var cols = [ $('<th>', {
			'text' : '#'
		}), $('<th>', {
			'text' : 'device'
		}), $('<th>', {
			'text' : 'count'
		}), $('<th>', {
			'text' : 'date start'
		}), $('<th>', {
			'text' : 'date end'
		}), $('<th>', {
			'text' : 'locations'
		}), $('<th>', {
			'text' : 'logs'
		}) ];
		thead.append($('<tr>').append(cols));
		var tbody = $('<tbody>').appendTo(table);
		deviceList.forEach(function(device, i) {
			var cols = [ $('<td>', {
				'text' : i + 1
			}), $('<td>', {
				'text' : device.clientId
			}), $('<td>', {
				'text' : device.stats.count
			}), $('<td>', {
				'text' : toDate(device.stats.min)
			}), $('<td>', {
				'text' : toDate(device.stats.max)
			}), $('<td>').append($('<button>', {
				'text' : 'plot',
				'on' : {
					'click' : function() {
						plot(device.clientId);
					}
				}
			})), $('<td>').append($('<button>', {
				'text' : 'download',
				'on' : {
					'click' : function() {
						getLog(device.clientId);
					}
				}
			})) ];
			tbody.append($('<tr>').append(cols));
		});
		parent.append(table);
	}

	function showLastLogs(logs, parent) {
		console.log(logs);
		var table = $('<table>', {
			'border' : 1
		});
		var thead = $('<thead>').appendTo(table);
		var cols = [ $('<th>', {
			'text' : '#'
		}), $('<th>', {
			'text' : 'device'
		}), $('<th>', {
			'text' : 'lat'
		}), $('<th>', {
			'text' : 'lng'
		}), $('<th>', {
			'text' : 'floor'
		}), $('<th>', {
			'text' : 'building'
		}), $('<th>', {
			'text' : 'date'
		}) ];
		thead.append($('<tr>').append(cols));
		var tbody = $('<tbody>').appendTo(table);
		var i = 0;
		for ( var clientId in logs) {
			var log = logs[clientId];
			if (log.event == 'location') {
				var cols = [ $('<td>', {
					'text' : ++i
				}), $('<td>', {
					'text' : clientId
				}), $('<td>', {
					'text' : log.latitude
				}), $('<td>', {
					'text' : log.longitude
				}), $('<td>', {
					'text' : log.floor
				}), $('<td>', {
					'text' : log.building || ''
				}), $('<td>', {
					'text' : new Date(log.timestamp).toLocaleString()
				}) ];
				tbody.append($('<tr>').append(cols));
			}
		}
		parent.append(table);
	}

	function showEntries(entries, parent) {
		console.log(entries);
		var table = $('<table>', {
			'border' : 1
		});
		var thead = $('<thead>').appendTo(table);
		var cols = [ $('<th>', {
			'text' : '#'
		}), $('<th>', {
			'text' : 'device'
		}), $('<th>', {
			'text' : 'agreed'
		}), $('<th>', {
			'text' : 'profile'
		}), $('<th>', {
			'text' : 'locations'
		}), $('<th>', {
			'text' : 'enquetes'
		}) ];
		thead.append($('<tr>').append(cols));
		var tbody = $('<tbody>').appendTo(table);
		entries.forEach(function(entry, i) {
			var profile = $('<table>');
			for ( var key in entry.answers) {
				var row = $('<tr>').appendTo(profile);
				row.append($('<td>').text(key));
				if (key == 'timestamp') {
					row.append($('<td>').text(new Date(Number(entry.answers[key])).toLocaleString()));
				} else {
					row.append($('<td>').text(entry.answers[key]));
				}
			}
			var cols = [ $('<td>', {
				'text' : i + 1
			}), $('<td>', {
				'text' : entry._id
			}), $('<td>', {
				'text' : entry.agreed
			}), $('<td>', {
				'html' : profile
			}), $('<td>').append($('<button>', {
				'text' : 'plot',
				'on' : {
					'click' : function() {
						plot(entry._id);
					}
				}
			})), $('<td>').append($('<button>', {
				'text' : 'download',
				'on' : {
					'click' : function() {
						getAnswers(entry._id);
					}
				}
			})) ];
			tbody.append($('<tr>').append(cols));
		});
		parent.append(table);
	}

	function toDate(time) {
		return new Date(time).toLocaleString().split(' ')[0];
	}

	function getLog(clientId) {
		location.href = 'api/log?action=get&skip=0&fileName=logs.json&clientId=' + clientId;
		/*
		 * $.ajax({ 'type' : 'get', 'url' : 'api/log', 'data' : { 'action' :
		 * 'get', 'skip' : '0', 'device' : clientId }, 'success' :
		 * function(data) { console.log(data); }, 'error' :
		 * function(XMLHttpRequest, textStatus, errorThrown) {
		 * console.error(textStatus + ' (' + XMLHttpRequest.status + '): ' +
		 * errorThrown); } });
		 */
	}

	function getAnswers(clientId) {
		location.href = 'api/log?action=get_answers&skip=0&fileName=answerss.json&clientId=' + clientId;
	}
	function plot(clientId) {
		window.open('locationlog.jsp?plot=' + clientId, "plot");
	}
	return {};
}();
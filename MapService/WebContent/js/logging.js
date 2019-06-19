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

$hulop.logging = function() {
	var intervalId, clientId, logData = [], agreed;

	function start() {
		if (intervalId) {
			return;
		}
		getClientId();
		clientId && console.log('clientId=' + clientId);
		$.ajax({
			'type' : 'POST',
			'url' : 'api/check_agreement',
			'data' : {
				'id' : clientId
			},
			'success' : function(data) {
				console.log(data);
				agreed = true;// data.agreed;
				if (agreed) {
					intervalId = setInterval(function() {
						flush();
					}, 1 * 60 * 1000);
					var user_mode = $hulop.mobile && $hulop.mobile.getPreference('user_mode');
					user_mode && onData({
						'event' : 'start',
						'user_mode' : user_mode,
						'lang' : $hulop.messages.defaultLang,
						'timestamp' : new Date().getTime()
					});
				}
			}
		});
	}

	function flush() {
		if (agreed && logData.length > 0) {
			console.log(logData);
			$.ajax({
				'type' : 'POST',
				'url' : 'api/log',
				'data' : {
					'action' : 'insert',
					'data' : JSON.stringify(logData)
				},
				'success' : function(data) {
					console.log('success: ' + data);
					logData = [];
				}
			});
		}
	}

	function stop() {
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}
	}

	function getClientId() {
		var deviceId;
		location.search.substr(1).split('&').forEach(function(arg) {
			if (arg) {
				var kv = arg.split('=');
				if (kv[0] == 'id') {
					deviceId = kv[1];
				}
			}
		});
		var localId = localStorage.getItem('clientId');
		var randomId = Math.floor((new Date().getTime() + Math.random()) * 256).toString(16).toUpperCase();
		localStorage.setItem('clientId', clientId = deviceId || localId || randomId);
		return clientId;
	}

	function onData(data) {
		$hulop.indoor && $hulop.indoor.onLog(data);
		if (clientId && intervalId) {
			data.client = clientId;
			logData.push(data);
			if (logData.length > 1000) {
				logData.shift();
			}
		}
	}

	return {
		'getClientId' : function() {
			return clientId;
		},
		'start' : start,
		'stop' : stop,
		'flush' : flush,
		'onData' : onData
	};
}();

$(window).load(function() {
	$hulop.logging.start();
});

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

$hulop.messages = function() {
	var messages = {};
	var defaultLang = ((navigator.languages && navigator.languages[0]) || navigator.browserLanguage || navigator.language || navigator.userLanguage || 'en')
			.substr(0, 2);

	function loadMessages(language) {
		$.ajax({
			'type' : 'get',
			'url' : 'messages/' + language + '.json',
			'dataType' : 'json',
			'success' : function(data) {
				messages[language] = data;
				console.log('messages loaded ' + language);
				convertHTML();
			},
			'error' : function(XMLHttpRequest, textStatus, errorThrown) {
				console.error(textStatus + ' (' + XMLHttpRequest.status + '): ' + errorThrown);
				(XMLHttpRequest.status == 404) && (messages[language] = {});
			}
		});
	}

	function get() {
		var text;
		for (var i = 0; i < arguments.length; i++) {
			text = (i > 0) ? text.replace('%' + i, arguments[i]) : ((messages[defaultLang] || {})[arguments[i]] || arguments[i]);
		}
		return text;
	}

	function convertHTML() {
		if (!messages[defaultLang]) {
			return;
		}
		$('[i18n]').each(function() {
			var e = $(this);
			var text = get(e.text());
			if (text) {
				e.text(text);
				e.removeAttr('i18n');
			} else if (e.attr('i18n')) {
				console.log('"' + e.attr('i18n') + '" : "' + e.text() + '",');
			}
		})
	}

	loadMessages(defaultLang);
	$(document).on('pageinit', convertHTML);
	window.$m = get;

	return {
		'ready' : function() {
			return !!messages[defaultLang];
		},
		'defaultLang' : defaultLang,
		'get' : get
	};

}();
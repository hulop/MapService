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
var $hulop_admin = function() {
	$(document).ready(function() {
		$('#add-user').on('submit', function(event) {
			event.preventDefault();
			var user = $('#add-user [name=user]').val();
			var password = $('#add-user [name=password]').val();
			var password2 = $('#add-user [name=password2]').val();
			var roles = $('#add-user [name=role]:checked').val();
			if (user && password && (password == password2) && roles) {
				var $form = $(this);
				$.ajax({
					'url' : $form.attr('action'),
					'type' : $form.attr('method'),
					'data' : $form.serialize(),
					'success' : function(data) {
						location.reload();
					},
					'error' : function(XMLHttpRequest, textStatus, errorThrown) {
						console.error(textStatus + ' (' + XMLHttpRequest.status + '): ' + errorThrown);
					}
				});
			}
		});
		$.ajax({
			'type' : 'get',
			'url' : 'api/admin',
			'data' : {
				'action' : 'list-files'
			},
			'success' : function(data) {
				var fileList = data.split(/[\r\n]+/).filter(function(line) {
					return line.indexOf('.') != -1;
				});
				showFileList(fileList, $('#fileList'), 'remove-file');
			},
			'error' : function(XMLHttpRequest, textStatus, errorThrown) {
				console.error(textStatus + ' (' + XMLHttpRequest.status + '): ' + errorThrown);
			}
		});
		$.ajax({
			'type' : 'get',
			'url' : 'api/admin',
			'data' : {
				'action' : 'list-attachments'
			},
			'success' : function(data) {
				var fileList = data.split(/[\r\n]+/).filter(function(line) {
					return line.indexOf('.') != -1;
				});
				showFileList(fileList, $('#attachmentList'), 'remove-attachment');
			},
			'error' : function(XMLHttpRequest, textStatus, errorThrown) {
				console.error(textStatus + ' (' + XMLHttpRequest.status + '): ' + errorThrown);
			}
		});
		$.ajax({
			'type' : 'get',
			'url' : 'api/user',
			'data' : {
				'action' : 'list-users'
			},
			'success' : function(data) {
				showUserList(data);
			},
			'error' : function(XMLHttpRequest, textStatus, errorThrown) {
				console.error(textStatus + ' (' + XMLHttpRequest.status + '): ' + errorThrown);
			}
		});

		$('#delete_all_attachments').on({
			'click' : function() {
				removeFile('*', 'remove-attachment');
			}
		});

	});

	function showFileList(fileList, parent, action) {
		var table = $('<table>', {
			'border' : 1
		});
		var thead = $('<thead>').appendTo(table);
		var cols = [ $('<th>', {
			'text' : '#'
		}), $('<th>', {
			'text' : 'file'
		}), $('<th>', {
			'text' : 'action'
		}) ];
		thead.append($('<tr>').append(cols));
		var tbody = $('<tbody>').appendTo(table);
		fileList.forEach(function(file, i) {
			var cols = [ $('<td>', {
				'text' : i + 1
			}), $('<td>', {
				'text' : file
			}), $('<td>').append($('<button>', {
				'text' : 'remove',
				'on' : {
					'click' : function() {
						removeFile(file, action);
					}
				}
			})) ];
			tbody.append($('<tr>').append(cols));
		});
		parent.append(table);
	}

	function showUserList(userList) {
		var table = $('<table>', {
			'border' : 1
		});
		var thead = $('<thead>').appendTo(table);
		var cols = [ $('<th>', {
			'text' : '#'
		}), $('<th>', {
			'text' : 'user'
		}), $('<th>', {
			'text' : 'roles'
		}), $('<th>', {
			'text' : 'action'
		}) ];
		thead.append($('<tr>').append(cols));
		var tbody = $('<tbody>').appendTo(table);
		userList.forEach(function(user, i) {
			var cols = [ $('<td>', {
				'text' : i + 1
			}), $('<td>', {
				'text' : user._id
			}), $('<td>', {
				'text' : user.roles
			}), $('<td>').append($('<button>', {
				'text' : 'remove',
				'on' : {
					'click' : function() {
						removeUser(user);
					}
				}
			}), $('<button>', {
				'text' : 'edit',
				'on' : {
					'click' : function() {
						editUser(user);
					}
				}
			})) ];
			tbody.append($('<tr>').append(cols));
		});
		$('#userList').append(table);
	}

	function removeFile(file, action) {
		if (!confirm('remove "' + file + '"?')) {
			return;
		}
		$.ajax({
			'type' : 'get',
			'url' : 'api/admin',
			'data' : {
				'action' : action,
				'file' : file
			},
			'success' : function(data) {
				location.reload();
			},
			'error' : function(XMLHttpRequest, textStatus, errorThrown) {
				console.error(textStatus + ' (' + XMLHttpRequest.status + '): ' + errorThrown);
			}
		});
	}

	function removeUser(user) {
		if (!confirm('remove "' + user._id + '"?')) {
			return;
		}
		$.ajax({
			'type' : 'get',
			'url' : 'api/user',
			'data' : {
				'action' : 'remove-user',
				'user' : JSON.stringify(user)
			},
			'success' : function(data) {
				location.reload();
			},
			'error' : function(XMLHttpRequest, textStatus, errorThrown) {
				console.error(textStatus + ' (' + XMLHttpRequest.status + '): ' + errorThrown);
			}
		});
	}

	function editUser(user) {
		location.href = 'edit_profile.jsp?redirect_url=admin.jsp&edit_user=' + user._id;
	}

	return {};
}();
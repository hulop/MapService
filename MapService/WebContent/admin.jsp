<%@page import="org.apache.wink.json4j.JSONArray"%>
<%@page import="org.apache.wink.json4j.JSONObject"%>
<jsp:useBean id="authBean" scope="request"
	class="hulop.hokoukukan.bean.AuthBean" />
<%@ page language="java" contentType="text/html; charset=UTF-8"
	pageEncoding="UTF-8"%>
<%
	if (!authBean.supportRole("admin")) {
		response.sendError(HttpServletResponse.SC_FORBIDDEN);
		return;
	}
	Object profile = authBean.getProfile(request);
	if (profile == null || !authBean.hasRole(request, "admin")) {
		response.sendRedirect("login.jsp?logout=true&redirect_url=admin.jsp");
		return;
	}
	String user =  ((JSONObject) profile).getString("user");
%>
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
<meta name="copyright" content="Copyright (c) IBM Corporation and others 2014, 2017. This page is made available under MIT license.">
<meta charset="UTF-8">
<script type="text/javascript" src="jquery/jquery-1.11.3.min.js"></script>
<script type="text/javascript" src="js/admin.js"></script>
<script type="text/javascript" src="js/login-monitor.js"></script>
<title>Map admin</title>
</head>
<body>
	<%=user%> <a href="admin.jsp?logout=true">Log out</a> | <a href="edit_password.jsp?redirect_url=admin.jsp">Change password</a>
	<fieldset>
		<legend>Import Hokoukukan gml.zip file</legend>
		<form method="post" action="api/admin?action=import&type=gml.zip"
			enctype="multipart/form-data">
			<input type="file" size="50" name="file" /> <input type="submit"
				value="Import zip file">
		</form>
	</fieldset>
	<fieldset>
		<legend>Import NavCog json file</legend>
		<form method="post" action="api/admin?action=import&type=navcog.json"
			enctype="multipart/form-data">
			<input type="file" size="50" name="file" /> <input type="submit"
				value="Import json file">
		</form>
	</fieldset>
	<fieldset>
		<legend>Imported files</legend>
		<div id="fileList"></div>
	</fieldset>
	<fieldset>
		<legend>Import Attachment zip file</legend>
		<form method="post" action="api/admin?action=import&type=attachment.zip"
			enctype="multipart/form-data">
			<input type="file" size="50" name="file" /> <input type="submit"
				value="Import zip file">
		</form>
	</fieldset>
	<fieldset>
		<legend>Attachments</legend>
		<div id="attachmentList"></div>
		<button id="zip_all_attachments">ZIP all attachments</button>
		|
		<button id="delete_all_attachments">Delete all attachments</button>
	</fieldset>
	<fieldset>
		<legend>Add a user</legend>
		<form method="post" id="add-user" action="api/user?action=add-user">
		<table>
			<tbody>
				<tr>
					<td>user: </td>
					<td><input type="text" name="user" /></td>
				</tr>
				<tr>
					<td>password: </td>
					<td><input type="password" name="password" /></td>
				</tr>
				<tr>
					<td>confirm password: </td>
					<td><input type="password" name="password2" /></td>
				</tr>
				<tr>
					<td>roles: </td>
					<td>
						<input type="checkbox" name="role" value="admin">admin<br>
						<input type="checkbox" name="role" value="auditor">auditor<br>
						<input type="checkbox" name="role" value="editor">editor
					</td>
				</tr>
				<tr>
					<td colspan="2" align="right"><input type="submit" value="Add a user"></td>
				</tr>
			</tbody>
		</table>
		</form>
	</fieldset>
	<fieldset>
		<legend>Users</legend>
		<div id="userList"></div>
	</fieldset>
</body>
</html>
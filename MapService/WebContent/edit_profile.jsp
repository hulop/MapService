<%@page import="org.apache.wink.json4j.JSONArray"%>
<%@page import="org.apache.wink.json4j.JSONObject"%>
<jsp:useBean id="authBean" scope="request"
	class="hulop.hokoukukan.bean.AuthBean" />
<%@ page language="java" contentType="text/html; charset=UTF-8"
	pageEncoding="UTF-8"%>
<%
	String user = request.getParameter("edit_user");
	String redirect_url = request.getParameter("redirect_url");
	if (user == null || redirect_url == null || !authBean.hasRole(request, "admin")) {
		response.sendError(HttpServletResponse.SC_FORBIDDEN);
		return;
	}
	JSONObject obj = authBean.findUser(user);
	if (obj == null) {
		response.sendError(HttpServletResponse.SC_FORBIDDEN);
		return;
	}
	JSONArray objRoles = obj.getJSONArray("roles");
	if (objRoles == null) {
		objRoles = new JSONArray();
	}
	String message = "";
	String password = request.getParameter("password");
	String password2 = request.getParameter("password2");

	String savePassword = null;
	String[] saveRoles = request.getParameterValues("role");
	if (password != null && password.length() > 0) {
		if (password.equals(password2)) {
			savePassword = password;
		} else {
			message = "Please enter same password";
		}
	}
	if (savePassword != null || saveRoles != null) {
		authBean.updateUser(user, savePassword, saveRoles);
		response.sendRedirect(redirect_url);
		return;
	}
%>
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
<meta name="copyright"
	content="Copyright (c) IBM Corporation and others 2014, 2017. This page is made available under MIT license.">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<title>Change user profile</title>
</head>
<body>
	<div>
		<form method="post" id="add-user" action="edit_profile.jsp">
			<input type="hidden" name="edit_user" value="<%=user%>"> <input
				type="hidden" name="redirect_url" value="<%=redirect_url%>">
			<table>
				<tbody>
					<tr>
						<td>password:</td>
						<td><input type="password" name="password" /></td>
					</tr>
					<tr>
						<td>confirm password:</td>
						<td><input type="password" name="password2" /></td>
					</tr>
					<tr>
						<td>roles:</td>
						<td><input type="checkbox" name="role" value="admin"
							<%=objRoles.indexOf("admin") != -1 ? "checked" : ""%> />admin<br>
							<input type="checkbox" name="role" value="auditor"
							<%=objRoles.indexOf("auditor") != -1 ? "checked" : ""%> />auditor<br>
							<input type="checkbox" name="role" value="editor"
							<%=objRoles.indexOf("editor") != -1 ? "checked" : ""%> />editor</td>
					</tr>
					<tr>
						<td colspan="2" align="right">
							<button onclick="location.href='<%=redirect_url%>';return false;">Cancel</button>
							<input type="submit" value="Save">
						</td>
					</tr>
				</tbody>
			</table>
		</form>
	</div>
</body>
</html>
<%@page import="org.apache.wink.json4j.JSONObject"%>
<jsp:useBean id="authBean" scope="request"
	class="hulop.hokoukukan.bean.AuthBean" />
<%@ page language="java" contentType="text/html; charset=UTF-8"
	pageEncoding="UTF-8"%>
<%
	Object profile = authBean.getProfile(request);
	String redirect_url = request.getParameter("redirect_url");
	if (profile == null || redirect_url == null) {
		response.sendError(HttpServletResponse.SC_FORBIDDEN);
		return;
	}
	String message = "";
	String user = ((JSONObject) profile).getString("user");
	String password = request.getParameter("password");
	String password2 = request.getParameter("password2");
	if (password != null && password.length() > 0) {
		if (password.equals(password2)) {
			authBean.updateUser(user, password, null);
			response.sendRedirect(redirect_url);
			return;
		} else {
			message = "Please enter same password";
		}
	}
%>
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
<meta name="copyright" content="Copyright (c) IBM Corporation and others 2014, 2017. This page is made available under MIT license.">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<title>Change password</title>
</head>
<body>
	<div>
		<form method="post" id="add-user" action="edit_password.jsp">
			<input type="hidden" name="redirect_url" value="<%=redirect_url%>">
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
						<td colspan="2" align="right">
						<button onclick="location.href='<%=redirect_url%>';return false;">Cancel</button>
						<input type="submit" value="Save"></td>
					</tr>
				</tbody>
			</table>
			<p>
				<%=message%>
			</p>
		</form>
	</div>
</body>
</html>
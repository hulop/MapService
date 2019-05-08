<%@page import="org.apache.wink.json4j.JSONObject"%>
<jsp:useBean id="authBean" scope="request"
	class="hulop.hokoukukan.bean.AuthBean" />
<%@ page language="java" contentType="text/html; charset=UTF-8"
	pageEncoding="UTF-8"%>
<%
	if (!authBean.supportRole("auditor")) {
		response.sendError(HttpServletResponse.SC_FORBIDDEN);
		return;
	}
	Object profile = authBean.getProfile(request);
	if (profile == null || !authBean.hasRole(request, "auditor")) {
		response.sendRedirect("login.jsp?logout=true&redirect_url=logview.jsp");
		return;
	}
	String user =  ((JSONObject) profile).getString("user");
%>
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
<meta name="copyright" content="Copyright (c) IBM Corporation and others 2014, 2017. This page is made available under MIT license.">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<script type="text/javascript" src="jquery/jquery-1.11.3.min.js"></script>
<script type="text/javascript" src="js/audit.js"></script>
<script type="text/javascript" src="js/login-monitor.js"></script>
<title>Log viewer</title>
</head>
<body>
	<div id="banner"><%=user%> <a href="logview.jsp?logout=true">Log out</a> | <a href="edit_password.jsp?redirect_url=logview.jsp">Change password</a></div>

	<fieldset>
		<legend>Recent Locations</legend>
		<div id="lastLogs"></div>
	</fieldset>
	<fieldset>
		<legend>Entries</legend>
		<div id="entryList"></div>
	</fieldset>
	<fieldset>
		<legend>Logs</legend>
		<div id="logList"></div>
	</fieldset>
</body>
</html>
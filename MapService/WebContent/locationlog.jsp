<%@page import="java.util.Iterator"%>
<%@page import="org.apache.wink.json4j.JSONArray"%>
<%@page import="org.apache.wink.json4j.JSONObject"%>
<jsp:useBean id="authBean" scope="request"
	class="hulop.hokoukukan.bean.AuthBean" />
<jsp:useBean id="agreeBean" scope="request" class="hulop.hokoukukan.bean.AgreementBean" />
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%
	Object profile = authBean.getProfile(request);
	if (profile == null || !authBean.hasRole(request, "auditor")) {
		response.sendRedirect("login.jsp?logout=true&redirect_url=locationlog.jsp");
		return;
	}
	String user =  ((JSONObject) profile).getString("user");
	String plot = request.getParameter("plot");
	Object answers = null;
	if (plot != null) {
		answers = agreeBean.getAnswers(plot);
	}
%>
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
<meta name="copyright" content="Copyright (c) IBM Corporation and others 2014, 2017. This page is made available under MIT license.">
<meta charset="UTF-8">
<link rel="stylesheet" href="css/locationlog.css">
<link rel="stylesheet" href="css/ol3.css">
<link rel="stylesheet" href="openlayers/v3.20.1/ol.css">
<link rel="stylesheet" href="jquery/jquery.mobile-1.4.5.min.css"/>
<script type="text/javascript" src="jquery/jquery-1.11.3.min.js"></script>
<script src="openlayers/v3.20.1/ol.js"></script>
<script type="text/javascript" src="js/messages.js"></script>
<script type="text/javascript" src="js/hokoukukan.js"></script>
<script type="text/javascript" src="js/util.js"></script>
<script type="text/javascript" src="js/maps.js"></script>
<script type="text/javascript" src="js/FloorPlanOverlay.js"></script>
<script type="text/javascript" src="js/indoor.js"></script>
<script type="text/javascript" src="js/locationlog.js"></script>
<script type="text/javascript" src="js/login-monitor.js"></script>
<script type="text/javascript">
	$(document).ready(function(){
		console.log("Map init");
		$hulop.map.init();
	});
</script>
<title>Location log viewer</title>
</head>
<body>
	<div id="control">
		<input class="date" id="date" type="text" placeholder="yyyy/mm/dd-yyyy/mm/dd" size="25" />
		<button class="date" id="load">load</button>
		<input class="device" style="display:none; width:55%;" id="time" type="range" value="0" />
		<span id="message"></span>
		<label class="device" style="display:none;"><input type="checkbox" id="pause" />pause</label>
		<label class="device" style="display:none;"><input type="checkbox" id="plot_all" checked />plot all</label>
		<label><input type="checkbox" id="heatmap" />heat map</label>
		<label class="plot" style="display:none;"><input type="checkbox" id="show_info" />information</label>
	</div>
	<% if (answers instanceof JSONObject) { %>
	<div id="answers" style="display: none;">
		<table>
			<tr>
			<td>device</td>
			<td><%=plot%></td>
			</tr>
		<% 
		JSONObject obj = (JSONObject)answers;
		for (Iterator<String> it = obj.keys(); it.hasNext(); ) {
			String key = it.next();
			if ("timestamp".equals(key)) {
				continue;
			}
			String value = obj.getString(key);
			%>
			<tr>
			<td><%=key%></td>
			<td><%=value%></td>
			</tr>
			<%	
		}
		%>
		</table>
	</div>
	<% }%>
	<div id="map" class="ui-page-theme-a"></div>
</body>
</html>
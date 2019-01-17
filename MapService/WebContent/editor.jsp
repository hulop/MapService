<%@page import="org.apache.wink.json4j.JSONArray"%>
<%@page import="org.apache.wink.json4j.JSONObject"%>
<jsp:useBean id="authBean" scope="request"
	class="hulop.hokoukukan.bean.AuthBean" />
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%
	if (!authBean.supportRole("editor")) {
		response.sendError(HttpServletResponse.SC_FORBIDDEN);
		return;
	}
	Object profile = authBean.getProfile(request);
	if (profile == null || !authBean.hasRole(request, "editor")) {
		response.sendRedirect("login.jsp?logout=true&redirect_url=editor.jsp");
		return;
	}
	String user =  ((JSONObject) profile).getString("user");
%>
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
<meta name="copyright" content="Copyright (c) IBM Corporation and others 2014, 2017. This page is made available under MIT license.">
<meta charset="UTF-8">
<link rel="stylesheet" href="css/editor.css">
<link rel="stylesheet" href="css/ol3.css">
<link rel="stylesheet" href="openlayers/v4.6.5/ol.css">
<link rel="stylesheet" href="jquery/jquery.mobile-1.4.5.min.css"/>
<script type="text/javascript" src="jquery/jquery-1.11.3.min.js"></script>
<script type="text/javascript" src="js/messages.js"></script>
<script src="openlayers/v4.6.5/ol.js"></script>
<script type="text/javascript" src="js/hokoukukan.js"></script>
<script type="text/javascript" src="js/util.js"></script>
<script type="text/javascript" src="js/maps.js"></script>
<script type="text/javascript" src="js/FloorPlanOverlay.js"></script>
<script type="text/javascript" src="js/indoor.js"></script>
<script type="text/javascript" src="js/area-edit.js"></script>
<script type="text/javascript" src="js/editor.js"></script>
<script type="text/javascript" src="js/login-monitor.js"></script>
<script type="text/javascript" src="js/editor_ext.js"></script>
<script type="text/javascript">
	$(document).ready(function(){
		console.log("Map init");
		$hulop.map.init();
	});
</script>
<title>Network Route Editor</title>
</head>
<body>
	<div class="left row1 scroll">
		<div id="help" class="inner">
			<%=user%> <a href="editor.jsp?logout=true">Log out</a> | <a href="edit_password.jsp?redirect_url=editor.jsp">Change password</a>
			<fieldset>
				<legend>(i18n_LOAD_DATA)</legend>
				(i18n_MOVE_POINTER)
				<br>
				Use <button onclick="$hulop.editor.prepareData($hulop.map.getCenter(), $hulop.config.MAX_RADIUS || 500)">load all</button> for easy operation.
			</fieldset>
			<fieldset>
				<legend>(i18n_ADD_ELEMENTS)</legend>
				<strong>(i18n_NODE)</strong>: (i18n_A_CLICK)<br>
				<strong>(i18n_LINK)</strong>: (i18n_SHIFT_NODE_CLICK)<br> 
				<strong>(i18n_POI)</strong>: (i18n_DFGH_CLICK)<br>
				<li>"D" <strong>(i18n_FACILITY)</strong></li>
				<li>"F" <strong>(i18n_HOSPITAL)</strong></li>
				<li>"G" <strong>(i18n_TOILET)</strong></li>
				<li>"H" <strong>(i18n_SHELTER)</strong></li>
				<strong>(i18n_EXIT)</strong>: (i18n_SHIFT_POI_CLICK)<br> 
				<strong>(i18n_COPY_POI)</strong>
				<li>(i18n_COPY_POI1)</li>
				<li>(i18n_COPY_POI2)</li>
				<strong>(i18n_VERTEX)</strong>
				<li>(i18n_CLICK_LINK)</li>
				<li>(i18n_ADD_VERTEX)</li>
				<li>(i18n_DEL_VERTEX)</li>
				<strong>(i18n_CHANGE_NODE_CONNECT)</strong>
				<li>(i18n_CLICK_LINK)</li>
				<li>(i18n_OPT_CLICK)</li>
				<li>(i18n_OPT_CLICK2)</li>
				<strong>(i18n_SPLIT_LINK)</strong>
				<li>(i18n_SPLIT_LINK1)</li>
				<strong>(i18n_EDIT_ELEVATOR)</strong>
				<li>(i18n_EDIT_ELEVATOR1)</li>
				<li>(i18n_EDIT_ELEVATOR2)</li>
				<strong>(i18n_ALIGN_LINKS)</strong>
				<li>(i18n_ALIGN_LINKS1)</li>
			</fieldset>
			<fieldset>
				<legend>More tools</legend>
				Click <button onclick="$hulop.area.addInteraction()">add area</button> then draw polygon on the map. See <strong>(i18n_VERTEX)</strong> to edit vertex.
				<hr>
				Click <button onclick="$hulop.area.clone($hulop.editor.editingFeature)">clone area</button> to clone selected area to current floor.
				<hr>
				Use <button onclick="window.open('facil_name_editor.html','facil_name_editor','width=1600,height=900,resizable=yes,scrollbars=yes');">facility name editor</button> for translation.
				<hr>
				Create a node, then click <button onclick="$hulop.editor.ext.createElevator($hulop.editor.editingFeature)">create elevator</button> to create elevator links.
				<hr>
				Select an elevator link, then click <button onclick="$hulop.editor.ext.changeElevator($hulop.editor.editingFeature,0)">change elevator type</button> or 
				<button onclick="$hulop.editor.ext.changeElevator($hulop.editor.editingFeature,1)">change elevator equipments</button> to replace all elevator properties.
			</fieldset>
			<fieldset class="modified" style="display:none">
				<legend>(i18n_SAVE_MAP)</legend>
				<button id="save_button">(i18n_SAVE_YES)</button>
				<button id="restore_button">(i18n_SAVE_NO)</button>
			</fieldset>
		</div>
		<div id="list" class="inner"></div>
		<div class="inner">
			<fieldset>
				<legend>GeoJSON</legend>
				<button id="export_button">Export</button><hr>
				<input type="file" id="import_file">
				<button id="import_button">Import</button>
			</fieldset>
			<fieldset>
				<legend>Special</legend>
				<button id="delete_button">Delete All</button>
			</fieldset>
		</div>
	</div>
	<div class="left row2 scroll"></div>
	<div class="left bottom scroll">
		<div id="properties" class="inner"></div>
	</div>
	<div id="map" class="ui-page-theme-a"></div>
</body>
</html>
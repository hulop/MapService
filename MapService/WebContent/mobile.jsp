<jsp:useBean id="agreeBean" scope="request" class="hulop.hokoukukan.bean.AgreementBean" />
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%
String id = request.getParameter("id");
if (id == null || (agreeBean.isAgreementSupported() && !agreeBean.getAgreed(id))) {
	response.sendError(HttpServletResponse.SC_FORBIDDEN);
	return;
}
%>
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
<meta name="copyright" content="Copyright (c) IBM Corporation and others 2014, 2017. This page is made available under MIT license.">
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
<link rel="stylesheet" href="css/mobile.css">
<link rel="stylesheet" href="jquery/jquery.mobile-1.4.5.min.css"/>
<link rel="stylesheet" href="css/mobilelist.css">
<link rel="stylesheet" href="css/ol3.css">
<link rel="stylesheet" href="openlayers/v4.0.1/ol.css">
<script src="jquery/jquery-1.11.3.min.js"></script>
<script src="jquery/jquery.mobile-1.4.5.min.js"></script>
<script src="jquery/jquery.mobile.nestedlists.js"></script>
<script type="text/javascript" src="js/messages.js"></script>
<script src="openlayers/v4.0.1/ol.js"></script>
<script type="text/javascript" src="js/mobile.js"></script>
<script type="text/javascript" src="js/location.js"></script>
<script type="text/javascript" src="js/hokoukukan.js"></script>
<script type="text/javascript" src="js/util.js"></script>
<script type="text/javascript" src="js/maps.js"></script>
<script type="text/javascript" src="js/FloorPlanOverlay.js"></script>
<script type="text/javascript" src="js/indoor.js"></script>
<script type="text/javascript" src="js/logging.js"></script>
<script type="text/javascript" src="mobile_ext.js"></script>
<script type="text/javascript">
	$(document).ready(function(){
		$hulop.map.init();
	});
	console.log("mobile.html started");
</script>
</head>
<body>
	<div data-role="popup" data-dismissible="false" id="popupDialog" data-theme="a">
		<div role="main" class="ui-content">
			<p id="popupText"></p>
			<a href="#" class="ui-btn ui-corner-all ui-shadow" data-rel="back">OK</a>
		</div>
	</div>
	<div data-role="page" id="map-page" data-theme="a">
		<div data-role="header" id="map-page-header" data-position="fixed">
			<div class="ui-btn-left">
				<a href="#control" class="mobile_search" data-role="button" data-icon="search" i18n>SEARCH</a>
				<a href="#" class="result" id="end_navi" data-role="button" data-icon="back" style="display: none;" i18n>END_NAVIGATION</a>
				<a href="#playback" id="playback_button" data-role="button" data-icon="bars" style="display: none;">Play log</a>
			</div>
	        <span class="ui-title">
	        </span>
			<div class="ui-btn-right">
				<a href="#settings" class="mobile_search" data-role="button" data-icon="gear" i18n>SEARCH_SETTINGS</a>
			</div>
			<div id="route_result" class="result" style="display: none"></div>
		</div>
		<div role="main" class="ui-content" id="map-container">
			<div id="map">
			<!-- map loads here... -->
			</div>
			<img id="map-center" class="my_location" src="images/round-blue.png" />
			<img id="map-center-heading" src="images/heading-blue.png" />
		</div>
	</div>
	<div data-role="page" id="control" data-theme="a">
		<div data-role="header" data-position="fixed">
			<a href="#" data-role="button" id="refresh_to" data-icon="refresh" i18n>REFRESH_TO</a>
			<h1 i18n>ROUTE_SEARCH</h1>
			<a href="#map-page" data-rel="close" data-icon="delete" i18n>CLOSE</a>
		</div>
		<div role="main" class="ui-content" style="padding: 0">
			<div id="category_menu"></div>
			<table>
				<tbody>
					<tr style="display: none">
						<td><label for="from" i18n>FROM</label></td>
						<td><select data-mini="true" id="from" name='from'></select></td>
					</tr>
					<tr class="basic_menu">
						<td><label for="to" i18n>TO</label></td>
						<td><select data-mini="true" id="to" name='to'></select></td>
					</tr>
					<tr class="basic_menu">
						<td colspan="2">
							<button data-mini="true" id="search" data-icon="search" i18n>CONFIRM_ROUTE</button>
						</td>
					</tr>
					<!--<tr>
						<td colspan="2">
							<button data-mini="true" id="showAll" i18n>SHOW_ALL</button>
						</td>
					</tr>-->
				</tbody>
			</table>
		</div>
	</div>
	<div data-role="page" id="category" data-theme="a">
		<div data-role="header" data-position="fixed">
			<h1 i18n>ROUTE_SEARCH</h1>
			<a href="#map-page" data-rel="close" data-icon="delete" class="ui-btn-right" i18n>CLOSE</a>
		</div>
		<div role="main" class="ui-content" style="padding: 0">
		</div>
	</div>
	<div data-role="page" id="confirm" data-theme="a">
		<div data-role="header" data-position="fixed">
			<a href="#map-page" id="confirm_no" data-rel="close" data-icon="delete" class="ui-btn-right" i18n>CLOSE</a>
			<h1 i18n>CONFIRM_ROUTE</h1>
		</div>
		<div role="main" class="ui-content">
			<table>
				<tbody>
					<tr>
						<td>
							<div id="route_summary"></div>
						</td>
					</tr>
					<tr>
						<td>
							<button data-mini="true" id="confirm_yes" data-icon="search" i18n>START</button>
						</td>
					</tr>
					<tr>
						<td id="route_instructions"></td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
	<div data-role="page" id="confirm_floor" data-theme="a">
		<div data-role="header" data-position="fixed">
			<a href="#map-page" id="confirm_no" data-rel="close" data-icon="delete" class="ui-btn-right" i18n>CLOSE</a>
			<h1 i18n>CONFIRM_ROUTE</h1>
		</div>
		<div role="main" class="ui-content">
			<table>
				<tbody>
					<tr>
						<td id="floor_instructions"></td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
	<div data-role="page" id="settings" data-theme="a">
		<div data-role="header" data-position="fixed">
			<a href="#map-page" data-rel="close" data-icon="delete" class="ui-btn-right" i18n>CLOSE</a>
			<h1 i18n>SEARCH_SETTINGS</h1>
		</div>
		<div role="main" class="ui-content">
			<label for="dist" i18n>DIST</label>
			<select data-mini="true" id="dist" name='dist'>
					<option value="250" i18n>DIST_250</option>
					<option value="500" i18n selected>DIST_500</option>
					<option value="750" i18n>DIST_750</option>
					<option value="4000">4km</option>
			</select>

			<label for="preset" i18n>PRESET</label>
			<select data-mini="true" id="preset" name='preset'>
					<option value="1" i18n selected>HEALTHY</option>
					<option value="2" i18n>WHEELCHAIR</option>
					<option value="9" i18n>CUSTOM</option>
			</select>
			<div class="custom_menues">
			<label for='min_width' i18n>MIN_WIDTH</label>
			<select data-mini="true" id="min_width" name="min_width">
					<option value="1" i18n>MIN_WIDTH_1</option>
					<option value="2" i18n>MIN_WIDTH_2</option>
					<option value="3" i18n>MIN_WIDTH_3</option>
					<!--option value="8" i18n>MIN_WIDTH_8</option-->
					<option value="9" i18n selected>MIN_WIDTH_9</option>
			</select>

			<label for='slope' i18n>SLOPE</label>
			<select data-mini="true" id="slope" name="slope">
					<option value="1" i18n>SLOPE_1</option>
					<option value="2" i18n>SLOPE_2</option>
					<option value="8" i18n>SLOPE_8</option>
					<option value="9" i18n selected>SLOPE_9</option>
			</select>

			<label for="road_condition" i18n>ROAD_CONDITION</label>
			<select data-mini="true" id="road_condition" name="road_condition">
					<option value="1" i18n>ROAD_CONDITION_1</option>
					<option value="8" i18n>ROAD_CONDITION_8</option>
					<option value="9" i18n selected>ROAD_CONDITION_9</option>
			</select>

			<label for="deff_LV" i18n>DEFF_LV</label>
			<select data-mini="true" id="deff_LV" name="deff_LV">
					<option value="1" i18n>DEFF_LV_1</option>
					<option value="2" i18n>DEFF_LV_2</option>
					<option value="3" i18n>DEFF_LV_3</option>
					<option value="8" i18n>DEFF_LV_8</option>
					<option value="9" i18n selected>DEFF_LV_9</option>
			</select>

			<label for="stairs" i18n>STAIRS</label>
			<select data-mini="true" id="stairs" name="stairs">
					<option value="1" i18n>STAIRS_1</option>
					<option value="2" i18n>STAIRS_2</option>
					<!--option value="8" i18n>STAIRS_8</option-->
					<option value="9" i18n selected>STAIRS_9</option>
			</select>

			<label for="esc" i18n>ESC</label>
			<select data-mini="true" id="esc" name="esc">
					<option value="1" i18n>ESC_1</option>
					<!--option value="8" i18n>ESC_8</option-->
					<option value="9" i18n selected>ESC_9</option>
			</select>

			<label for="mvw" i18n>MVW</label>
			<select data-mini="true" id="mvw" name="mvw">
					<option value="1" i18n>MVW_1</option>
					<!--option value="8" i18n>MVW_8</option-->
					<option value="9" i18n selected>MVW_9</option>
			</select>

			<label for="elv" i18n>ELV</label>
			<select data-mini="true" id="elv" name="elv">
					<option value="1" i18n>ELV_1</option>
					<option value="2" i18n>ELV_2</option>
					<!--option value="8" i18n>ELV_8</option-->
					<option value="9" i18n selected>ELV_9</option>
			</select>
			</div>

			<!--label for="test">Test:</label>
			<select data-mini="true" id="test" name="test">
					<option value="">Online mode</option>
					<option value="offline">Offline mode</option>
			</select-->
		</div>
	</div>
	<div data-role="page" id="playback" data-theme="a">
		<div data-role="header" data-position="fixed">
			<a href="#map-page" data-rel="close" data-icon="delete" class="ui-btn-right" i18n>CLOSE</a>
			<h1>Play log</h1>
		</div>
		<div role="main" class="ui-content">
			<label for="file-chooser">Log file: </label><input type="file" id="file-chooser">
			<button data-mini="true" id="play_file" data-icon="arrow-r">Play log</button>
		</div>
	</div>
</body>
</html>

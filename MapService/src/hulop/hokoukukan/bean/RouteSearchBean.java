/*******************************************************************************
 * Copyright (c) 2014, 2017  IBM Corporation, Carnegie Mellon University and others
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
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *******************************************************************************/
package hulop.hokoukukan.bean;

import java.awt.geom.Line2D;
import java.awt.geom.Point2D;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.apache.wink.json4j.JSONArray;
import org.apache.wink.json4j.JSONException;
import org.apache.wink.json4j.JSONObject;
import org.jgrapht.WeightedGraph;
import org.jgrapht.alg.DijkstraShortestPath;
import org.jgrapht.graph.DefaultWeightedEdge;
import org.jgrapht.graph.SimpleDirectedWeightedGraph;

import hulop.hokoukukan.utils.DBAdapter;

public class RouteSearchBean {

	public static final DBAdapter adapter = DatabaseBean.adapter;
	private static final double WEIGHT_IGNORE = Double.MAX_VALUE;
	private static final double ESCALATOR_WEIGHT = 100, STAIR_WEIGHT = 300, ELEVATOR_WEIGHT = 300;
	private String mLang;
	private long mLastInit;
	private JSONObject mNodeMap;
	private JSONArray mFeatures, mLandmarks, mDoors;
	private Set<String> elevatorNodes;

	public RouteSearchBean() {
	}

	public void init(double[] point, double distance, String lang) throws JSONException {
		mLang = lang;
		System.out.println("RouteSearchBean init lang=" + lang);
		adapter.getGeometry(point, distance, mNodeMap = new JSONObject(), mFeatures = new JSONArray(), null);
		elevatorNodes = new HashSet<String>();
		for (Object feature : mFeatures) {
			JSONObject properties = ((JSONObject) feature).getJSONObject("properties");
			if ("リンクの情報".equals(properties.getString("category")) && "10".equals(properties.getString("経路の種類"))) {
				elevatorNodes.add(properties.getString("起点ノードID"));
				elevatorNodes.add(properties.getString("終点ノードID"));
			}
		}
		mLandmarks = initLandmarks(mFeatures);
		mLastInit = System.currentTimeMillis();
	}

	public long getLastInit() {
		return mLastInit;
	}

	public JSONObject getNodeMap() {
		return mNodeMap;
	}

	public JSONArray getFeatures() {
		return mFeatures;
	}

	public JSONArray getLandmarks() {
		return mLandmarks;
	}

	private JSONArray initLandmarks(JSONArray features) throws JSONException {
		JSONObject exitNodes = new JSONObject();
		mDoors = new JSONArray();
		for (Object feature : features) {
			JSONObject node = (JSONObject) feature;
			JSONObject properties = node.getJSONObject("properties");
			if ("出入口情報".equals(properties.getString("category"))) {
				if (properties.has("対応施設ID")) {
					exitNodes.append(properties.getString("対応施設ID"), node);
				}
				if (properties.has("対応ノードID") && properties.has("扉の種類")) {
					String door = properties.getString("扉の種類");
					switch (door) {
					case "":
					case "0":
						break;
					default:
						mDoors.add(properties);
					}
				}
			}
		}

		JSONArray result = new JSONArray();
		for (Object feature : features) {
			JSONObject json = (JSONObject) feature;
			JSONObject properties = json.getJSONObject("properties");
			String category = properties.getString("category"), name = null, name_pron = null;
			Object node = null;
			switch (category) {
			case "出入口情報":
				if (hasI18n(properties, "出入口の名称") && properties.has("対応ノードID") && !properties.has("対応施設ID")) {
					name = getI18n(properties, "出入口の名称");
					name_pron = getI18nPron(properties, "出入口の名称");
					node = properties.getString("対応ノードID");
					result.add(new JSONObject().put("category", category).put("name", name).put("name_pron", name_pron)
							.put("node", node));
				}
				break;
			default:
				if (properties.has("施設ID")) {
					name = getI18n(properties, "名称");
					name_pron = getI18nPron(properties, "名称");
					String siteId = properties.getString("施設ID");
					if (exitNodes.has(siteId)) {
						node = exitNodes.get(siteId);
						for (JSONObject obj : (List<JSONObject>) node) {
							JSONObject p = obj.getJSONObject("properties");
							String n = null;
							if (p.has("対応ノードID")) {
								n = p.getString("対応ノードID");
							} else if (p.has("出入口ノード")) {
								n = p.getString("出入口ノード");
							}
							if (n != null) {
								JSONObject poi = new JSONObject().put("category", category).put("name", name)
										.put("name_pron", name_pron).put("node", n).put("properties", properties);
								poi.put("geometry", json.get("geometry"));
								if (hasI18n(p, "出入口の名称")) {
									String exit = getI18n(p, "出入口の名称");
									String exit_pron = getI18nPron(p, "出入口の名称");
									if (!"#".equals(exit)) {
										poi.put("exit", exit).put("exit_pron", exit_pron);
										result.add(poi);
									}
								} else {
									result.add(poi);
								}
							}
						}
					}
				}
				break;
			}
		}
		for (int i = 0; i < result.length(); i++) {
			JSONObject obj = result.getJSONObject(i);
			try {
				JSONObject node = mNodeMap.getJSONObject(obj.getString("node"));
				obj.put("node_coordinates", node.getJSONObject("geometry").getJSONArray("coordinates"));
				obj.put("node_height",
						Float.parseFloat(node.getJSONObject("properties").getString("高さ").replace("B", "-")));
			} catch (Exception e) {
				e.printStackTrace();
			}
		}
		return result;
	}

	public Object getDirection(String from, String to, Map<String, String> conditions) throws JSONException {
		mLastInit = System.currentTimeMillis();
		removeTempLinks();
		JSONObject fromPoint = getPoint(from), toPoint = getPoint(to);
		if (fromPoint != null) {
			from = findNearestLink(fromPoint);
			if (from == null) {
				return null;
			}
			if (!mNodeMap.has(from)) {
				for (Object feature : mFeatures) {
					JSONObject json = (JSONObject) feature;
					if (from.equals(json.get("_id"))) {
						try {
							from = createTempLinks(fromPoint, json);
						} catch (Exception e) {
							e.printStackTrace();
						}
						break;
					}
				}
			}
		} else {
			from = extractNode(from);
		}
		if (toPoint != null) {
			to = adapter.findNearestNode(new double[] { toPoint.getDouble("lng"), toPoint.getDouble("lat") },
					toPoint.has("floors") ? toPoint.getJSONArray("floors") : null);
		}
		if (from != null && from.equals(extractNode(to))) {
			return new JSONObject().put("error", "zero-distance");
		}
		WeightedGraph<String, DefaultWeightedEdge> g = new SimpleDirectedWeightedGraph<String, DefaultWeightedEdge>(
				DefaultWeightedEdge.class);
		Map<Object, JSONObject> linkMap = new HashMap<Object, JSONObject>();
		JSONArray result = new JSONArray();
		for (Object feature : mFeatures) {
			JSONObject json = (JSONObject) feature;
			JSONObject properties = json.getJSONObject("properties");
			switch (properties.getString("category")) {
			case "リンクの情報":
				if (!properties.has("起点ノードID") || !properties.has("終点ノードID")) {
					break;
				}
				String start = properties.getString("起点ノードID");
				String end = properties.getString("終点ノードID");
				double weight = properties.has("リンク延長") ? Double.parseDouble(properties.getString("リンク延長")) : 10.0f;
				weight = adjustAccWeight(properties, conditions, weight);
				if (weight == WEIGHT_IGNORE) {
					break;
				}
				if (from == null) {
					try {
						properties.put("sourceHeight", getHeight(start));
						properties.put("targetHeight", getHeight(end));
					} catch (Exception e) {
					}
					result.add(json);
					break;
				}
				g.addVertex(start);
				g.addVertex(end);

				DefaultWeightedEdge startEnd = null, endStart = null;
				switch (properties.getString("方向性")) {
				case "1":
					startEnd = g.addEdge(start, end);
					break;
				case "2":
					endStart = g.addEdge(end, start);
					break;
				default:
					startEnd = g.addEdge(start, end);
					endStart = g.addEdge(end, start);
					break;
				}
				if (startEnd != null) {
					double add = !elevatorNodes.contains(start) && elevatorNodes.contains(end) ? ELEVATOR_WEIGHT : 0;
					g.setEdgeWeight(startEnd, weight + add);
					linkMap.put(startEnd, json);
				}
				if (endStart != null) {
					double add = elevatorNodes.contains(start) && !elevatorNodes.contains(end) ? ELEVATOR_WEIGHT : 0;
					g.setEdgeWeight(endStart, weight + add);
					linkMap.put(endStart, json);
				}
				break;
			}
		}
		if (from != null) {
			try {
				// System.out.println(from + " - " + to + " - " + g.toString());
				double lastWeight = Double.MAX_VALUE;
				List<DefaultWeightedEdge> path = null;
				for (String t : to.split("\\|")) {
					t = t.trim();
					if (t.length() > 0) {
						try {
							List<DefaultWeightedEdge> p = DijkstraShortestPath.findPathBetween(g, from, extractNode(t));
							if (p != null && p.size() > 0) {
								double totalWeight = 0;
								for (DefaultWeightedEdge edge : p) {
									totalWeight += g.getEdgeWeight(edge);
								}
								if (lastWeight > totalWeight) {
									lastWeight = totalWeight;
									path = p;
									to = t;
								}
							}
						} catch (Exception e) {
							System.err.println("No route to " + t);
						}
					}
				}
				if (path != null && path.size() > 0) {
					JSONObject fromNode = (JSONObject) mNodeMap.getJSONObject(from).clone();
					result.add(fromNode);
					for (DefaultWeightedEdge edge : path) {
						JSONObject link = linkMap.get(edge);
						try {
							JSONObject properties = link.getJSONObject("properties");
							String edgeSource = g.getEdgeSource(edge);
							String edgeTarget = g.getEdgeTarget(edge);
							String sourceDoor = getDoor(edgeSource);
							String targetDoor = getDoor(edgeTarget);
							properties.put("sourceNode", edgeSource);
							properties.put("targetNode", edgeTarget);
							properties.put("sourceHeight", getHeight(edgeSource));
							properties.put("targetHeight", getHeight(edgeTarget));
							if (sourceDoor != null) {
								properties.put("sourceDoor", sourceDoor);
							} else {
								properties.remove("sourceDoor");
							}
							if (targetDoor != null) {
								properties.put("targetDoor", targetDoor);
							} else {
								properties.remove("targetDoor");
							}
						} catch (Exception e) {
							e.printStackTrace();
						}
						result.add(link);
					}
					JSONObject toNode = (JSONObject) mNodeMap.getJSONObject(extractNode(to)).clone();
					toNode.put("_id", to);
					result.add(toNode);
				}
				// System.out.println(new KShortestPaths(g, from,
				// 3).getPaths(to));
			} catch (Exception e) {
				e.printStackTrace();
			}
		}
		return result;
	}

	private String extractNode(String id) {
		return id != null ? id.split(":")[0] : null;
	}

	private double adjustAccWeight(JSONObject properties, Map<String, String> conditions, double weight)
			throws JSONException {

		String linkType = properties.has("経路の種類") ? properties.getString("経路の種類") : "";
		switch (linkType) {
		case "10": // Elevator
			weight = 0.0f;
			break;
		case "7": // Moving walkway
			weight *= 0.5f;
			break;
		case "11": // Escalator
			weight = ESCALATOR_WEIGHT;
			break;
		case "12": // Stairs
			weight = STAIR_WEIGHT;
			break;
		}
		double penarty = Math.max(weight, 10.0f) * 9;

		String width = properties.has("有効幅員") ? properties.getString("有効幅員") : "";
		// 0: less than 1m,
		// 1: >1m & <1.5m,
		// 2: >1.5m & <2m,
		// 3: >2m
		// 9: unknown
		switch (conditions.get("min_width")) {
		case "1": // >2m
			if (width.equals("0") || width.equals("1") || width.equals("2") || width.equals("9")) {
				return WEIGHT_IGNORE;
			}
			break;
		case "2": // >1.5m
			if (width.equals("0") || width.equals("1") || width.equals("9")) {
				return WEIGHT_IGNORE;
			}
			break;
		case "3": // >1.0m
			if (width.equals("0") || width.equals("9")) {
				return WEIGHT_IGNORE;
			}
			break;
		case "8": // Avoid
			if (width.equals("0") || width.equals("1") || width.equals("2") || width.equals("9")) {
				weight += penarty;
			}
			break;
		}

		float slope = properties.has("縦断勾配1") ? Float.parseFloat(properties.getString("縦断勾配1")) : 0;
		// Maximum slope value (%) along the link
		switch (conditions.get("slope")) {
		case "1": // <8%
			if (slope >= 8.0) {
				return WEIGHT_IGNORE;
			}
			break;
		case "2": // <10%
			if (slope >= 10.0) {
				return WEIGHT_IGNORE;
			}
			break;
		case "8": // Avoid
			if (slope >= 8.0) {
				weight += penarty;
			}
			break;
		}

		String road = properties.has("路面状況") ? properties.getString("路面状況") : "";
		// 0: no problem, 1: dirt, 2: gravel, 3: other, 9: unknown
		switch (conditions.get("road_condition")) {
		case "1": // No problem
			if (road.equals("1") || road.equals("2") || road.equals("3") || road.equals("9")) {
				return WEIGHT_IGNORE;
			}
			break;
		case "8": // Avoid
			if (road.equals("1") || road.equals("2") || road.equals("3") || road.equals("9")) {
				weight += penarty;
			}
			break;
		}

		String bump = properties.has("段差") ? properties.getString("段差") : "";
		// 0: less than 2cm, 1: 2~5cm, 2: 5~10cm, 3: more than 10cm, 9: unknown
		// (assign max bump height for whole link)
		switch (conditions.get("deff_LV")) {
		case "1": // <2cm
			if (bump.equals("1") || bump.equals("2") || bump.equals("3") || bump.equals("9")) {
				return WEIGHT_IGNORE;
			}
			break;
		case "2": // <5cm
			if (bump.equals("2") || bump.equals("3") || bump.equals("9")) {
				return WEIGHT_IGNORE;
			}
			break;
		case "3": // <10cm
			if (bump.equals("3") || bump.equals("9")) {
				return WEIGHT_IGNORE;
			}
			break;
		case "8": // Avoid
			if (bump.equals("1") || bump.equals("2") || bump.equals("3") || bump.equals("9")) {
				weight += penarty;
			}
			break;
		}

		int steps = properties.has("最小階段段数") ? Integer.parseInt(properties.getString("最小階段段数")) : 0;
		// number of steps along a stairway
		// if (linkType.equals("12") && steps == 0) {
		// System.out.println("Error: steps should > 0");
		// }
		String rail = properties.has("手すり") ? properties.getString("手すり") : "";
		// 0: no, 1: on the right, 2: on the left, 3: both sides, 9: unknown
		// (link direction - start node to end node)
		switch (conditions.get("stairs")) {
		case "1": // Do not use
			if (steps > 0) {
				return WEIGHT_IGNORE;
			}
			break;
		case "2": // Use with hand rail
			if (steps > 0 && !(rail.equals("1") || rail.equals("2") || rail.equals("3"))) {
				return WEIGHT_IGNORE;
			}
			break;
		case "8": // Avoid
			if (steps > 0) {
				weight += penarty;
			}
			break;
		}

		String elevator = properties.has("エレベーター種別") ? properties.getString("エレベーター種別") : "";
		// 0: not included, 1: braille and audio, 2: wheelchair, 3: 1&2, 9:
		// unknown
		switch (conditions.get("elv")) {
		case "1": // Do not use
			if (elevator.equals("0") || elevator.equals("1") || elevator.equals("2") || elevator.equals("3")
					|| elevator.equals("9")) {
				return WEIGHT_IGNORE;
			}
		case "2": // Wheel chair supported
			if (elevator.equals("0") || elevator.equals("1") || elevator.equals("9")) {
				return WEIGHT_IGNORE;
			}
		case "8": // Avoid
			if (elevator.equals("0") || elevator.equals("1") || elevator.equals("9")) {
				weight += penarty;
			}
			break;
		}

		switch (conditions.get("esc")) {
		case "1": // Do not use
			if (linkType.equals("11")) {
				return WEIGHT_IGNORE;
			}
		case "8": // Avoid
			if (linkType.equals("11")) {
				weight += penarty;
			}
			break;
		}

		if (properties.has("視覚障害者誘導用ブロック") && "1".equals(properties.getString("視覚障害者誘導用ブロック"))) {
			// 0: no, 1: yes, 9: unknown (tactile paving along the path/link)
			if ("1".equals(conditions.get("tactile_paving"))) {
				weight = weight / 3;
			}
		}
		return weight;
	}

	private JSONObject getPoint(String node) {
		if (node != null) {
			String[] params = node.split(":");
			if (params.length >= 3 && params[0].equals("latlng")) {
				JSONObject point = new JSONObject();
				try {
					if (params.length > 3) {
						List<String> floors = new ArrayList<String>();
						floors.add(params[3]);
						if (params[3].equals("1")) {
							floors.add("0");
						}
						point.put("floors", floors);
					}
					return point.put("lat", Double.parseDouble(params[1])).put("lng", Double.parseDouble(params[2]));
				} catch (JSONException e) {
					e.printStackTrace();
				}
			}
		}
		return null;
	}

	private float getHeight(String node) throws NumberFormatException, JSONException {
		return Float
				.parseFloat(mNodeMap.getJSONObject(node).getJSONObject("properties").getString("高さ").replace("B", "-"));

	}

	private String getDoor(String node) throws JSONException {
		if (countLinks(node) <= 2) {
			for (Object p : mDoors) {
				JSONObject properties = (JSONObject) p;
				if (node.equals(properties.getString("対応ノードID"))) {
					return properties.getString("扉の種類");
				}
			}
		}
		return null;
	}

	private int countLinks(String node) {
		try {
			int count = 0;
			JSONObject properties = mNodeMap.getJSONObject(node).getJSONObject("properties");
			for (int i = 1; i <= 10; i++) {
				if (properties.has("接続リンクID" + i)) {
					count++;
				}
			}
			return count;
		} catch (Exception e) {
			e.printStackTrace();
		}
		return 0;
	}

	private boolean hasI18n(JSONObject properties, String key) {
		return hasLangString(properties, key) || properties.has(key);
	}

	private String getI18n(JSONObject properties, String key) throws JSONException {
		return hasLangString(properties, key) ? properties.getString(key + ":" + mLang)
				: properties.has(key) ? properties.getString(key) : "";
	}

	private boolean hasLangString(JSONObject properties, String key) {
		try {
			return properties.has(key + ":" + mLang) && properties.getString(key + ":" + mLang).length() > 0;
		} catch (JSONException e) {
			e.printStackTrace();
		}
		return false;
	}

	private String getI18nPron(JSONObject properties, String key) throws JSONException {
		return hasPronString(properties, key) ? properties.getString(key + ":" + mLang + "-Pron")
				: getI18n(properties, key);
	}

	private boolean hasPronString(JSONObject properties, String key) {
		try {
			return properties.has(key + ":" + mLang + "-Pron")
					&& properties.getString(key + ":" + mLang + "-Pron").length() > 0;
		} catch (JSONException e) {
			e.printStackTrace();
		}
		return false;
	}

	private static final double METERS_PER_DEGREE = 60.0 * 1.1515 * 1.609344 * 1000;

	private static double deg2rad(double deg) {
		return (deg * Math.PI / 180.0);
	}

	private static double calcDistance(double[] point1, double[] point2) {
		double theta = deg2rad(point1[0] - point2[0]);
		double lat1 = deg2rad(point1[1]), lat2 = deg2rad(point2[1]);
		double dist = Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(theta);
		return METERS_PER_DEGREE * Math.acos(dist) * 180.0 / Math.PI;
	}

	static String INVALID_LINKS = "|7|10|11|";

	private String findNearestLink(JSONObject fromPoint) {
		try {
			List<String> floors = fromPoint.has("floors") ? fromPoint.getJSONArray("floors") : null;
			List<JSONObject> links = new ArrayList<JSONObject>();
			for (Object feature : mFeatures) {
				JSONObject json = (JSONObject) feature;
				JSONObject properties = json.getJSONObject("properties");
				if (properties.has("起点ノードID") && properties.has("終点ノードID")
						&& INVALID_LINKS.indexOf("|" + properties.getString("経路の種類") + "|") == -1) {
					String startID = properties.getString("起点ノードID");
					String endID = properties.getString("終点ノードID");
					if (mNodeMap.has(startID) && mNodeMap.has(endID)) {
						if (floors == null) {
							links.add(json);
						} else {
							String startHeight = mNodeMap.getJSONObject(startID).getJSONObject("properties")
									.getString("高さ");
							String endHeight = mNodeMap.getJSONObject(endID).getJSONObject("properties")
									.getString("高さ");
							if (floors.indexOf(startHeight) != -1 && floors.indexOf(endHeight) != -1) {
								links.add(json);
							}
						}
					}
				}
			}
			if (links.size() > 0) {
				final Point2D.Double pt = new Point2D.Double(fromPoint.getDouble("lng"), fromPoint.getDouble("lat"));
				links.sort(new Comparator<JSONObject>() {
					@Override
					public int compare(JSONObject o1, JSONObject o2) {
						try {
							double dist1 = calc2Ddistance(o1.getJSONObject("geometry").getJSONArray("coordinates"), pt,
									null);
							double dist2 = calc2Ddistance(o2.getJSONObject("geometry").getJSONArray("coordinates"), pt,
									null);
							if (dist1 != dist2) {
								return dist1 < dist2 ? -1 : 1;
							}
						} catch (Exception e) {
							e.printStackTrace();
						}
						return 0;
					}
				});
				return links.get(0).getString("_id");
			}
		} catch (JSONException e) {
			e.printStackTrace();
		}
		return null;
	}

	private double calc2Ddistance(JSONArray coordinates, Point2D.Double pt, int[] seg) throws Exception {
		double result = -1;
		Point2D.Double from = get2DPoint(coordinates, 0);
		for (int i = 1; i < coordinates.size() && result != 0.0; i++) {
			Point2D.Double to = get2DPoint(coordinates, i);
			double dist = Line2D.ptSegDist(from.x, from.y, to.x, to.y, pt.x, pt.y);
			from = to;
			if (result < 0 || dist < result) {
				result = dist;
				if (seg != null) {
					seg[0] = i - 1;
				}
			}
		}
		return result;
	}

	private static Point2D.Double get2DPoint(JSONArray coordinates, int index) throws Exception {
		JSONArray coord = coordinates.getJSONArray(index);
		return new Point2D.Double(coord.getDouble(0), coord.getDouble(1));
	}

	static final String tempNodeID = "_TEMP_NODE_", tempLink1ID = "_TEMP_LINK1_", tempLink2ID = "_TEMP_LINK2_";

	private void removeTempLinks() {
		try {
			while (mFeatures.length() > 0) {
				int lastIndex = mFeatures.length() - 1;
				String id = mFeatures.getJSONObject(lastIndex).getString("_id");
				if (tempLink1ID.equals(id) || tempLink2ID.equals(id)) {
					mFeatures.remove(lastIndex);
				} else {
					break;
				}
			}
		} catch (JSONException e) {
			e.printStackTrace();
		}
	}

	private String createTempLinks(JSONObject point, JSONObject link) throws Exception {
		JSONArray linkCoords = link.getJSONObject("geometry").getJSONArray("coordinates");
		JSONArray nodeCoord = new JSONArray().put(point.getDouble("lng")).put(point.getDouble("lat"));
		Object pos = getOrthoCenter(linkCoords, nodeCoord, link.getJSONObject("properties"));
		int lineSeg = 0;
		if (pos instanceof String) {
			return (String) pos;
		} else if (pos instanceof JSONObject) {
			JSONObject o = (JSONObject) pos;
			nodeCoord = new JSONArray().put(o.getDouble("x")).put(o.getDouble("y"));
			lineSeg = o.getInt("seg");
		}

		// Create temp node
		String tempFloor = point.has("floors") ? point.getJSONArray("floors").getString(0) : "0";
		final JSONObject tempNode = new JSONObject();
		final JSONObject geometry = new JSONObject();
		final JSONObject nodeProp = new JSONObject();
		geometry.put("type", "Point");
		geometry.put("coordinates", nodeCoord);
		nodeProp.put("category", "ノード情報");
		nodeProp.put("ノードID", tempNodeID);
		nodeProp.put("高さ", tempFloor);
		nodeProp.put("接続リンクID1", tempLink1ID);
		nodeProp.put("接続リンクID2", tempLink2ID);
		tempNode.put("_id", tempNodeID);
		tempNode.put("type", "Feature");
		tempNode.put("geometry", geometry);
		tempNode.put("properties", nodeProp);
		// System.out.println(tempNode.toString(4));

		// Create temp links
		final JSONObject tempLink1 = new JSONObject(link.toString()), tempLink2 = new JSONObject(link.toString());
		tempLink1.put("_id", tempLink1ID);
		tempLink2.put("_id", tempLink2ID);
		final JSONObject link1Geo = tempLink1.getJSONObject("geometry"), link2Geo = tempLink2.getJSONObject("geometry");
		JSONArray link1Coords = link1Geo.getJSONArray("coordinates");
		JSONArray link2Coords = link2Geo.getJSONArray("coordinates");
		for (int i = 0; i < linkCoords.length(); i++) {
			if (i > lineSeg) {
				link1Coords.remove(link1Coords.length() - 1);
			} else {
				link2Coords.remove(0);
			}
		}
		JSONArray link1Last = link1Coords.getJSONArray(link1Coords.length() - 1);
		if (!link1Last.equals(nodeCoord)) {
			link1Coords.add(nodeCoord);
		}
		JSONArray link2first = link2Coords.getJSONArray(0);
		if (!link2first.equals(nodeCoord)) {
			link2Coords.add(0, nodeCoord);
		}

		final JSONObject link1Prop = tempLink1.getJSONObject("properties"),
				link2Prop = tempLink2.getJSONObject("properties");
		link1Prop.put("リンクID", tempLink1ID);
		link1Prop.put("終点ノードID", tempNodeID);
		link2Prop.put("リンクID", tempLink2ID);
		link2Prop.put("起点ノードID", tempNodeID);
		setLength(tempLink1);
		setLength(tempLink2);
		mNodeMap.put(tempNodeID, tempNode);
		mFeatures.add(tempLink1);
		mFeatures.add(tempLink2);
		return tempNodeID;
	}

	private void setLength(JSONObject link) throws Exception {
		JSONArray linkCoords = link.getJSONObject("geometry").getJSONArray("coordinates");
		double length = 0;
		for (int i = 0; i < linkCoords.length() - 1; i++) {
			JSONArray from = linkCoords.getJSONArray(i);
			JSONArray to = linkCoords.getJSONArray(i + 1);
			length += calcDistance(new double[] { from.getDouble(0), from.getDouble(1) },
					new double[] { to.getDouble(0), to.getDouble(1) });
		}
		link.getJSONObject("properties").put("リンク延長", Double.toString(length));
	}

	private Object getOrthoCenter(JSONArray line, JSONArray point, JSONObject linkProp) throws Exception {
		Point2D.Double c = new Point2D.Double(point.getDouble(0), point.getDouble(1));
		int[] seg = new int[] { 0 };
		calc2Ddistance(line, c, seg);
		JSONArray start = line.getJSONArray(seg[0]);
		JSONArray end = line.getJSONArray(seg[0] + 1);
		Point2D.Double a = new Point2D.Double(start.getDouble(0), start.getDouble(1));
		Point2D.Double b = new Point2D.Double(end.getDouble(0), end.getDouble(1));

		double distCA = Point2D.distance(a.x, a.y, c.x, c.y);
		double distCB = Point2D.distance(b.x, b.y, c.x, c.y);
		double distCX = Line2D.ptSegDist(a.x, a.y, b.x, b.y, c.x, c.y);

		if (distCA <= distCX && seg[0] == 0) {
			return linkProp.getString("起点ノードID");
		} else if (distCB <= distCX && seg[0] == line.length() - 2) {
			return linkProp.getString("終点ノードID");
		} else {
			double distAB = Point2D.distance(a.x, a.y, b.x, b.y);
			double distAX = Math.sqrt(distCA * distCA - distCX * distCX);
			double timeAX = Math.max(0, Math.min(distAX / distAB, 1));

			double x = (b.x - a.x) * timeAX + a.x;
			double y = (b.y - a.y) * timeAX + a.y;
			return new JSONObject().put("x", x).put("y", y).put("seg", seg[0]);
		}
	}

	static double[] CURRENT_POINT = { 139.77392703294754, 35.68662700502585 };
	static double MAX_DISTANCE = 500;

	public static void main(String[] args) {
		try {
			RouteSearchBean search = new RouteSearchBean();
			search.init(CURRENT_POINT, MAX_DISTANCE, "en");
			String from = "latlng:" + CURRENT_POINT[0] + ":" + CURRENT_POINT[1];
			JSONArray landmarks = search.getLandmarks();
			JSONObject toNode = landmarks.getJSONObject((int) ((Math.random() / 2 + 0.25) * landmarks.length()));
			String to = toNode.getString("node");
			Object direction = search.getDirection(from, to, new HashMap<String, String>());
			System.out.println(direction.toString());
			System.out.println(from + " to " + toNode.getString("name"));
		} catch (JSONException e) {
			e.printStackTrace();
		}
	}
}

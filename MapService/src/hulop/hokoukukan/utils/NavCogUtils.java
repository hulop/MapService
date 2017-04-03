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
package hulop.hokoukukan.utils;

import java.io.File;
import java.io.FileInputStream;
import java.util.Set;

import org.apache.wink.json4j.JSON;
import org.apache.wink.json4j.JSONArray;
import org.apache.wink.json4j.JSONException;
import org.apache.wink.json4j.JSONObject;

import hulop.hokoukukan.utils.GmlUtils.JSONListener;

public class NavCogUtils {

	private final JSONObject obj, layers;
	private final File file;
	private final JSONListener listener;
	private final String fileName, node_prefix, link_prefix, exit_prefix;
	private final double unit;
	private static final String[] NODE_KEYS = new String[] { "building", "name" };
	private static final String[] EDGE_KEYS = new String[] { "infoFromNode1", "infoFromNode2", "infoAtNode1",
			"infoAtNode2" };

	public NavCogUtils(JSONObject obj, File file, JSONListener listener) throws JSONException {
		this.obj = obj;
		this.file = file;
		this.listener = listener;
		fileName = file.getName();
		String prefix = fileName.replace(".json", "_").replaceAll("[^A-Za-z0-9_]", "_");
		node_prefix = prefix + "node_";
		link_prefix = prefix + "link_";
		exit_prefix = prefix + "exit_";
		layers = obj.getJSONObject("layers");
		unit = obj.has("unit") && obj.getString("unit").equals("meter") ? 1 : 0.3048;
	}

	public void convert() throws Exception {
		JSONObject transitMap = convertTransit();
		System.out.println(transitMap.keySet());
		for (String key : (Set<String>) transitMap.keySet()) {
			listener.onJSON(transitMap.get(key));
		}
		for (String layerName : (Set<String>) layers.keySet()) {
			final JSONObject layer = layers.getJSONObject(layerName);
			final JSONObject nodes = layer.getJSONObject("nodes");
			for (String key : (Set<String>) nodes.keySet()) {
				final JSONObject node = nodes.getJSONObject(key);
				System.out.println(node.toString(4));
				final String node_id = node.getString("id");
				final JSONObject geometry = new JSONObject();
				geometry.put("type", "Point");
				geometry.put("coordinates", getCoordinate(node));
				final JSONObject out = new JSONObject();
				out.put("type", "Feature");
				out.put("geometry", geometry);
				{
					final JSONObject properties = new JSONObject();
					properties.put("file", fileName);
					properties.put("category", "ノード情報");
					properties.put("ノードID", node_prefix + node_id);
					properties.put("高さ", layerName);
					final JSONArray links = new JSONArray();
					if (node.has("infoFromEdges")) {
						final JSONObject infoFromEdges = node.getJSONObject("infoFromEdges");
						for (String k : (Set<String>) infoFromEdges.keySet()) {
							final JSONObject info = infoFromEdges.getJSONObject(k);
							links.add(link_prefix + info.getString("edgeID"));
						}
					}
					for (String pair : (Set<String>) transitMap.keySet()) {
						String[] from_to = pair.split("_");
						if (node_id.equals(from_to[0]) || node_id.equals(from_to[1])) {
							links.add(link_prefix + pair);
						}
					}
					for (int i = 0; i < links.length(); i++) {
						properties.put("接続リンクID" + (i + 1), links.getString(i));
					}
					copyKeys(node, properties, NODE_KEYS);
					out.put("properties", properties);
					listener.onJSON(out);
				}
				if (node.getString("name").length() > 0) {
					{
						final JSONObject properties = new JSONObject();
						properties.put("file", fileName);
						properties.put("category", "出入口情報");
						properties.put("出入口ID", exit_prefix + node_id);
						properties.put("対応ノードID", node_prefix + node_id);
						properties.put("出入口の名称", node.getString("name"));
						out.put("properties", properties);
						listener.onJSON(out);
					}
				}
			}
			final JSONObject edges = layer.getJSONObject("edges");
			for (String key : (Set<String>) edges.keySet()) {
				final JSONObject edge = edges.getJSONObject(key);
				System.out.println(edge.toString(4));
				final String edge_id = edge.getString("id");
				final String node1_id = edge.getString("node1");
				final String node2_id = edge.getString("node2");
				final JSONObject node1 = nodes.getJSONObject(node1_id);
				final JSONObject node2 = nodes.getJSONObject(node2_id);
				final JSONObject info_at_node1 = getInfoAtNode(node1, edge_id);
				final JSONObject info_at_node2 = getInfoAtNode(node2, edge_id);
				if (info_at_node1 != null) {
					edge.put("infoAtNode1", info_at_node1);
				}
				if (info_at_node2 != null) {
					edge.put("infoAtNode2", info_at_node2);
				}
				Double[][] coordinates;
				if (edge.has("path")) {
					final JSONArray path = edge.getJSONArray("path");
					coordinates = new Double[path.length()][];
					for (int i = 0; i < path.length(); i++) {
						coordinates[i] = getCoordinate(path.getJSONObject(i));
					}
				} else {
					coordinates = new Double[][] { getCoordinate(node1), getCoordinate(node2) };
				}
				final JSONObject geometry = new JSONObject();
				geometry.put("type", "LineString");
				geometry.put("coordinates", coordinates);
				final JSONObject out = new JSONObject();
				out.put("type", "Feature");
				out.put("geometry", geometry);
				{
					final JSONObject properties = new JSONObject();
					properties.put("file", fileName);
					properties.put("category", "リンクの情報");
					properties.put("方向性", "0");
					properties.put("経路の種類", "8");
					properties.put("リンクID", link_prefix + edge_id);
					properties.put("起点ノードID", node_prefix + node1_id);
					properties.put("終点ノードID", node_prefix + node2_id);
					properties.put("リンク延長", "" + (double) Math.round(edge.getDouble("len") * unit * 10) / 10);
					copyKeys(edge, properties, EDGE_KEYS);
					out.put("properties", properties);
					listener.onJSON(out);
				}
			}
		}
	}

	private JSONObject convertTransit() throws Exception {
		JSONObject transitMap = new JSONObject();
		for (String layerName : (Set<String>) layers.keySet()) {
			final JSONObject nodes = layers.getJSONObject(layerName).getJSONObject("nodes");
			for (String key : (Set<String>) nodes.keySet()) {
				final JSONObject node1 = nodes.getJSONObject(key);
				if (node1.has("transitInfo")) {
					final String node1_id = node1.getString("id");
					final JSONObject transitInfo1 = node1.getJSONObject("transitInfo");
					for (String layer : (Set<String>) transitInfo1.keySet()) {
						final JSONObject info = transitInfo1.getJSONObject(layer);
						if (info.getBoolean("enabled")) {
							final String node2_id = info.getString("node");
							final JSONObject node2 = layers.getJSONObject(layer).getJSONObject("nodes")
									.getJSONObject(node2_id);
							final Double[][] coordinates = new Double[][] { getCoordinate(node1),
									getCoordinate(node2) };
							final JSONObject geometry = new JSONObject();
							if (coordinates[0][0] == coordinates[1][0] && coordinates[0][1] == coordinates[1][1]) {
								geometry.put("type", "Point");
								geometry.put("coordinates", coordinates[0]);
							} else {
								geometry.put("type", "LineString");
								geometry.put("coordinates", coordinates);
							}
							if (transitMap.has(node2_id + "_" + node1_id)) {
								final JSONObject out = transitMap.getJSONObject(node2_id + "_" + node1_id);
								final JSONObject properties = out.getJSONObject("properties");
								properties.put("方向性", "0");
								if (info.has("info")) {
									properties.put("_NAVCOG_infoFromNode2", info.get("info"));
								}
							} else {
								final JSONObject out = new JSONObject();
								transitMap.put(node1_id + "_" + node2_id, out);
								out.put("type", "Feature");
								out.put("geometry", geometry);
								final JSONObject properties = new JSONObject();
								properties.put("file", fileName);
								properties.put("category", "リンクの情報");
								properties.put("方向性", "1");
								properties.put("リンクID", link_prefix + node1_id + "_" + node2_id);
								properties.put("起点ノードID", node_prefix + node1_id);
								properties.put("終点ノードID", node_prefix + node2_id);
								switch (node1.getInt("type")) {
								case 1: // Door
									properties.put("経路の種類", "8");
									properties.put("リンク延長", "10");
									break;
								case 2: // Stair
									properties.put("経路の種類", "12");
									properties.put("最小階段段数", "10");
									properties.put("リンク延長", "10");
									properties.put("手すり", "3"); // both sides
									break;
								case 3: // Elevator
									properties.put("経路の種類", "10");
									properties.put("エレベーター種別", "3"); // braille/audio/wheelchair
									properties.put("リンク延長", "0");
									break;
								default:
									properties.put("経路の種類", "99");
									properties.put("リンク延長", "0");
									break;
								}
								if (info.has("info")) {
									properties.put("_NAVCOG_infoFromNode1", info.get("info"));
								}
								out.put("properties", properties);
							}
						}
					}
				}
			}
		}
		return transitMap;
	}

	private static Double[] getCoordinate(JSONObject obj) throws JSONException {
		return new Double[] { new Double(obj.getDouble("lng")), new Double(obj.getDouble("lat")) };
	}

	private static void copyKeys(JSONObject from, JSONObject to, String[] copyKeys) throws JSONException {
		JSONObject target = null;
		for (String key : copyKeys) {
			if (from.has(key)) {
				target = filterCopy(target, key, from.get(key));
			}
		}
		if (target != null) {
			for (String k : (Set<String>) target.keySet()) {
				to.put("_NAVCOG_" + k, target.get(k).toString());
			}
			System.out.println(from.toString(4));
			System.out.println(target.toString(4));
		}
	}

	private static JSONObject filterCopy(JSONObject target, String key, Object value) throws JSONException {
		if (value instanceof String && "".equals(value)) {
			return target;
		}
		// if (value instanceof Boolean && !(Boolean) value) {
		// return target;
		// }
		if (target == null) {
			target = new JSONObject();
		}
		if (value instanceof JSONObject) {
			JSONObject obj = (JSONObject) value;
			value = new JSONObject();
			for (String k : (Set<String>) obj.keySet()) {
				filterCopy((JSONObject) value, k, obj.get(k));
			}
		}
		target.put(key, value);
		return target;
	}

	private static JSONObject getInfoAtNode(JSONObject node, String edge_id) throws JSONException {
		if (node.has("infoFromEdges")) {
			JSONObject info = node.getJSONObject("infoFromEdges");
			if (info.has(edge_id)) {
				JSONObject result = info.getJSONObject(edge_id);
				for (String key : new String[] { "edgeID", "x", "y" }) {
					if (result.has(key)) {
						result.remove(key);
					}
				}
				return result;
			}
		}
		return null;
	}

	public static void main(String[] args) throws Exception {
		if (args.length > 0) {
			File file = new File(args[0]);
			if (file.exists()) {
				JSONObject obj = (JSONObject) JSON.parse(new FileInputStream(file));
				new NavCogUtils(obj, file, new JSONListener() {
					@Override
					public void onJSON(Object json) {
						System.out.println(json);
					}
				}).convert();
			}
		}
	}

}

/*******************************************************************************
 * Copyright (c) 2014, 2023  IBM Corporation, Carnegie Mellon University and others
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
package hulop.directory;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.wink.json4j.JSONArray;
import org.apache.wink.json4j.JSONException;
import org.apache.wink.json4j.JSONObject;

public class Directory {
	private final String lang;
	private final JSONObject document, templates, messages = new JSONObject();
	private final List<Facility> facilities = new ArrayList<Facility>();
	private final Map<String, List<Facility>> catalog = new HashMap<String, List<Facility>>();

	public Directory(JSONArray landmarks, String lang, boolean noLandmarks, boolean categories) throws Exception {
		this.lang = lang;
		String messages_dirs = System.getenv("messages");
		String directory_json = System.getenv("directory.json");
		if (directory_json == null) {
			directory_json = "directory.json";
		}
		putMessages("messages");
		putMessages("categories");
		putMessages("buildings");
		if (messages_dirs != null) {
			for (String dir : messages_dirs.split(",")) {
				putMessages(dir.trim());
			}
		}
		for (Object landmark : landmarks) {
			Facility facil = new Facility((JSONObject) landmark);
			facilities.add(facil);
			for (String key : facil.keySet()) {
				List<Facility> list = catalog.get(key);
				if (list == null) {
					catalog.put(key, list = new ArrayList<Facility>());
				}
				list.add(facil);
			}
		}
		templates = Utils.load("templates.json");
		traverse(document = Utils.load(directory_json));
		// System.out.println(document.toString(4));
		if (!noLandmarks) {
			document.put("landmarks", landmarks);
		}
		if (categories) {
			final JSONObject major_category_map, sub_category_map, minor_category_map, tags_map;
			document.put("major_categories", major_category_map = new JSONObject());
			document.put("sub_categories", sub_category_map = new JSONObject());
			document.put("minor_categories", minor_category_map = new JSONObject());
			document.put("tags", tags_map = new JSONObject());
			final JSONObject building_map;
			final Map<String, Pattern> filters = getFilters();
			document.put("building_floors", building_map = new JSONObject());
			final JSONObject group_map;
			document.put("building_group", group_map = new JSONObject());
			for (Facility facil : getFacilities()) {
				facil.addTitle(major_category_map, facil.major_category);
				facil.addTitle(sub_category_map, facil.sub_category);
				facil.addTitle(minor_category_map, facil.minor_category);
				facil.addTitle(tags_map, facil.tags);
				if (checkFilter(filters.get("major_category"), facil.major_category) &&
					checkFilter(filters.get("sub_category"), facil.sub_category) &&
					checkFilter(filters.get("minor_category"), facil.minor_category) &&
					checkFilter(filters.get("tags"), facil.tags)) {
					facil.addTitleNode(building_map);
					facil.addGroupTitle(group_map, "major_categories", facil.major_category);
					facil.addGroupTitle(group_map, "sub_categories", facil.sub_category);
					facil.addGroupTitle(group_map, "minor_categories", facil.minor_category);
					facil.addGroupTitle(group_map, "tags", facil.tags);
				}
			}
		}
	}

	public void putMessages(String path) {
		try {
			JSONObject m;
			try {
				m = Utils.load(String.format("%s/%s.json", path, lang));
			} catch (Exception e) {
				m = Utils.load(String.format("%s/%s.json", path, "en"));
			}
			for (Iterator<String> it = m.keys(); it.hasNext();) {
				String key = it.next();
				messages.put(key, m.getString(key));
			}
		} catch (Exception e) {
		}
	}

	public JSONObject getDocument() {
		return document;
	}

	public List<Facility> getFacilities() {
		return facilities;
	}

	private boolean traverse(Object e) throws JSONException {
		if (e instanceof JSONArray) {
			for (Iterator<Object> it = ((JSONArray) e).iterator(); it.hasNext();) {
				Object next = it.next();
				boolean remove = traverse(next);
				try {
					if (!remove && next instanceof JSONObject && ((JSONObject) next).has("content")) {
						remove = ((JSONObject) next).getJSONObject("content").getJSONArray("sections").isEmpty();
					}
				} catch (Exception e1) {
					e1.printStackTrace();
				}
				if (remove) {
					it.remove();
				}
			}
		} else if (e instanceof JSONObject) {
			JSONObject obj = ((JSONObject) e);
			for (Iterator<String> it = obj.keys(); it.hasNext();) {
				String key = it.next();
				Object value = obj.get(key);
				if (value instanceof String) {
					String s = (String) value;
					if (s.startsWith("$") && messages.has(s.substring(1))) {
						obj.put(key, messages.getString(s.substring(1)));
					}
				} else {
					traverse(value);
				}
			}
			Object $add_items = getAddItems(obj);
			if ($add_items != null) {
				JSONArray items = new JSONArray();
				obj.put("items", items);
				if ($add_items instanceof JSONArray) {
					for (Object options : (JSONArray) $add_items) {
						addItems(items, (JSONObject) options);
					}
				} else {
					addItems(items, (JSONObject) $add_items);
					items.sort(compareItem);
				}
				return items.isEmpty();
			}
			Object $building_items = obj.remove("$building_items");
			if ($building_items instanceof JSONObject) {
				Set<String> buildings = new TreeSet<String>();
				Set<Float> floors = new TreeSet<Float>();
				boolean other = false;
				for (String key : catalog.keySet()) {
					Matcher m = Pattern.compile("building/(.*)/(.+)").matcher(key);
					if (m.matches()) {
						if (m.group(1).length() > 0) {
							buildings.add(m.group(1));
						} else {
							other = true;
						}
						floors.add(new Float(m.group(2)));
					}
				}
				JSONArray items = new JSONArray();
				obj.put("items", items);
				JSONObject template = (JSONObject) $building_items;
				String OTHERS = template.has("OTHERS") ? (String) template.remove("OTHERS") : "OTHERS";
				for (Iterator<String> it = buildings.iterator(); it.hasNext();) {
					String building = it.next();
					items.add(buildingItem(template, building, building, floors));
				}
				if (other) {
					items.add(buildingItem(template, "", OTHERS, floors));
				}
			}
		}
		return false;
	}

	private JSONObject buildingItem(JSONObject template, String building, String titleKey, Set<Float> floors)
			throws JSONException {
		JSONObject item = new JSONObject(template.toString());
		item.put("title", messages.has(titleKey) ? messages.getString(titleKey) : building);
		JSONArray sections = new JSONArray();
		item.getJSONObject("content").put("sections", sections);
		for (Iterator<Float> it = floors.iterator(); it.hasNext();) {
			float floor = it.next();
			JSONArray items = new JSONArray();
			addItems(items, new JSONObject().put("key", "building/" + building + "/" + floor));
			if (items.length() > 0) {
				items.sort(compareItem);
				String title = ((floor < 0 ? "B" + (-floor) : floor) + "F").replace(".0", "");
				sections.add(new JSONObject().put("title", messages.has(title) ? messages.getString(title) : title)
						.put("items", items));
			}
		}
		return item;
	}

	private Object getAddItems(JSONObject obj) {
		Object $add_items = obj.remove("$add_items");
		if ($add_items == null) {
			for (Iterator<String> it = templates.keys(); it.hasNext();) {
				String key = it.next();
				Object newValue = obj.remove(key);
				if (newValue != null) {
					try {
						return replaceValue(new JSONObject(templates.getJSONObject(key).toString()), newValue);
					} catch (JSONException e) {
						e.printStackTrace();
					}
				}
			}
		}
		return $add_items;
	}

	private JSONObject replaceValue(JSONObject template, Object newValue) throws JSONException {
		for (Iterator<String> it = template.keys(); it.hasNext();) {
			String key = it.next();
			Object value = template.get(key);
			if ("$value".equals(value)) {
				template.put(key, newValue);
			} else if (value instanceof JSONObject) {
				replaceValue((JSONObject) value, newValue);
			}
		}
		return template;
	}

	private void addItems(JSONArray target, JSONObject options) throws JSONException {
		List<Facility> list;
		String key_pattern = options.getString("key");
		if (key_pattern.startsWith("^")) {
			Pattern pattern = Pattern.compile(key_pattern);
			list = new ArrayList<Facility>();
			for (String key : catalog.keySet()) {
				if (pattern.matcher(key).matches() && catalog.containsKey(key)) {
					list.addAll(catalog.get(key));
				}
			}
			// System.out.println(list.size() + " items for " + pattern);
		} else {
			list = catalog.get(key_pattern);
		}
		if (list != null) {
			for (Facility facil : list) {
				facil.copyTo(target, options);
			}
		}
	}

	// static functions

	public static Comparator<JSONObject> compareItem = new Comparator<JSONObject>() {
		@Override
		public int compare(JSONObject o1, JSONObject o2) {
			try {
				int t1 = o1.getInt("toilet");
				int t2 = o2.getInt("toilet");
				if (t1 != t2) {
					return t1 - t2;
				}
			} catch (JSONException e) {
			}
			try {
				String t1 = Utils.kana2hira(o1.getString("titlePron"));
				String t2 = Utils.kana2hira(o2.getString("titlePron"));
				int rc = t1.compareToIgnoreCase(t2);
				if (rc != 0) {
					return rc;
				}
			} catch (JSONException e) {
			}
			try {
				String t1 = Utils.kana2hira(o1.getString("subtitlePron"));
				String t2 = Utils.kana2hira(o2.getString("subtitlePron"));
				int rc = t1.compareToIgnoreCase(t2);
				if (rc != 0) {
					return rc;
				}
			} catch (JSONException e) {
			}
			return 0;
		}
	};

	private static Object pget(JSONObject properties, String key, Object _default) {
		try {
			return properties.get(key);
		} catch (Exception e) {
		}
		return _default;
	}

	private static Map<String, Pattern> getFilters() {
		Map<String, Pattern> map = new HashMap<>();
		String env = System.getenv("BUILDING_FILTERS");
		try {
			JSONObject obj = new JSONObject(env != null ? env : "{\"major_category\":\".+\"}");
			for (Iterator<String> it = obj.keys(); it.hasNext();) {
				String key = it.next();
				map.put(key, Pattern.compile(obj.getString(key)));
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
		return map;
	}

	private static boolean checkFilter(Pattern pattern, String input) {
		return pattern == null || pattern.matcher(input).matches();
	}

	// inner classes

	public class Facility {
		public int toilet_gender = -1;
		public boolean toilet_accessible = false, toilet_diap = false, toilet_osto = false;
		public String nodeID, name, exit, name_pron, exit_pron, building, building_name, floor_name, major_category,
				sub_category, minor_category, short_description, tags, title, title_pron, all_text;
		Double floor;
		public Object exit_brr;

		public Facility(JSONObject landmark) throws JSONException {
			nodeID = (String) pget(landmark, "node", "");
			name = (String) pget(landmark, "name", "");
			short_description = (String) pget(landmark, "short_description", "");
			exit = (String) pget(landmark, "exit", "");
			name_pron = (String) pget(landmark, "name_pron", name);
			exit_pron = (String) pget(landmark, "exit_pron", exit);
			floor = (Double) pget(landmark, "node_height", null);
			// TODO map middle floor (Ex: 1.6 -> 1.5)
			JSONObject properties = landmark.getJSONObject("properties");
			boolean h30 = properties.has("facil_id");
			building = (String) pget(properties, h30 ? "hulop_building" : "building", "");
			major_category = (String) pget(properties, h30 ? "hulop_major_category" : "major_category", "");
			sub_category = (String) pget(properties, h30 ? "hulop_sub_category" : "sub_category", "");
			minor_category = (String) pget(properties, h30 ? "hulop_minor_category" : "minor_category", "");
			tags = (String) pget(properties, h30 ? "hulop_tags" : "tags", "");
			Object t_type = pget(properties, h30 ? "facil_type" : "category", null);
			Object t_sex = pget(properties, h30 ? "sex" : "男女別", null);
			Object t_toilet = pget(properties, h30 ? "toilet" : "多目的トイレ", null);
			if (h30) {
				if (t_type instanceof Integer && t_type.equals(10)) {
					toilet_gender = 0;
					if (t_sex instanceof Integer) {
						toilet_gender = ((Integer) t_sex).intValue();
					}
					if (t_toilet instanceof Integer) {
						switch ((Integer) t_toilet) {
						case 3:
							toilet_accessible = true;
							break;
						case 4:
							toilet_accessible = true;
							toilet_osto = true;
							break;
						case 5:
							toilet_accessible = true;
							toilet_diap = true;
							break;
						case 6:
							toilet_accessible = true;
							toilet_diap = true;
							toilet_osto = true;
							break;
						}
					}
				}
			} else {
				if ("公共用トイレの情報".equals(t_type)) {
					toilet_gender = 0;
					if (t_sex instanceof String) {
						toilet_gender = Integer.parseInt((String) t_sex);
					}
					if (t_toilet instanceof String) {
						switch ((String) t_toilet) {
						case "2":
							toilet_osto = true;
						case "1":
							toilet_accessible = true;
							break;
						}
					}
					toilet_diap = "1".equals(pget(properties, "ベビーベッド", ""));
				}
			}
			if (name.isEmpty() && toilet_gender != -1) {
				name = name_pron = messages.optString("CAT_" + getToiletCategory(), getToiletCategory());
			}
			try {
				building_name = messages.getString(building);
			} catch (Exception e) {
				building_name = building;
			}
			try {
				floor_name = (floor < 0 ? "B" : "") + (int) Math.abs(floor) + "F";
			} catch (Exception e) {
				floor_name = "";
			}
			title = (name + " " + exit).trim();
			title_pron = (name_pron + " " + exit_pron).trim();
			all_text = (title + "\f" + title_pron + "\f" + (building_name + " " + floor_name).trim()).toLowerCase();
			exit_brr = landmark.opt("exit_brr");
		}

		public Set<String> keySet() throws JSONException {
			Set<String> keys = new HashSet<String>();
			keys.add("building/" + building + "/" + floor);
			if (major_category.length() > 0) {
				// for (String item : sub_category.split(",")) {
				// keys.add("category/" + major_category + "/" + item.trim());
				// }
				for (String major : major_category.split(",")) {
					for (String sub : sub_category.split(",")) {
						keys.add("category/" + major.trim() + "/" + sub.trim());
					}
				}
			}
			if (toilet_gender != -1) {
				keys.add("category/TOIL/" + getToiletCategory());
				if (toilet_diap) {
					keys.add("category/OTER/DIAP");
				}
			}
			if (keys.isEmpty()) {
				keys.add("category//");
			}
			return keys;
		}

		public void copyTo(JSONArray target, JSONObject options) throws JSONException {
			JSONObject item = new JSONObject().put("nodeID", nodeID);
			if (options.has("title")) {
				item.put("title", options.getString("title"));
				item.put("titlePron", options.getString("title"));
			} else {
				item.put("title", title);
				item.put("titlePron", title_pron);
			}
			if (options.has("subtitle")) {
				String subtitle = options.getString("subtitle");
				subtitle = subtitle.replace("{B}", building_name);
				subtitle = subtitle.replace("{F}", floor_name).trim();
				item.put("subtitle", subtitle);
				item.put("subtitlePron", subtitle);
			}
			if (!options.has("nogroup")) {
				String title = item.getString("title");
				String st = item.optString("subtitle");
				for (Object t : target) {
					JSONObject toobj = (JSONObject) t;
					if (title.equals(toobj.getString("title"))) {
						if (st != null && toobj.has("subtitle") && !st.equals(toobj.getString("subtitle"))) {
							continue;
						}
						toobj.put("nodeID", toobj.getString("nodeID") + "|" + nodeID);
						return;
					}
				}
			}
			if (short_description.length() > 0) {
				item.put("short_description", short_description);
			}
			switch (toilet_gender) {
			case -1:
			case 1:
			case 2:
				item.put("toilet", toilet_gender);
				break;
			default:
				item.put("toilet", 0);
				break;
			}
			if (exit_brr != null) {
				if (exit_brr.equals("2")) { // 5 to 10cm
					item.put("user_wheelchair", false);
				} else if (exit_brr.equals("3") || exit_brr.equals(1)) { // over 10cm or wheelchair inaccessible
					item.put("user_stroller", false);
					item.put("user_wheelchair", false);
				}
			}
			target.add(item);
		}

		public void addTitle(JSONObject map, String tags) throws JSONException {
			for (String key : tags.split(",")) {
				JSONArray array = map.optJSONArray(key = key.trim());
				if (array == null) {
					map.put(key, array = new JSONArray());
				} else if (array.contains(title)) {
					continue;
				}
				array.add(title);
			}
		}

		public void addTitleNode(JSONObject map) throws JSONException {
			JSONObject floor_map = map.optJSONObject(building);
			if (floor_map == null) {
				map.put(building, floor_map = new JSONObject());
			}
			String strFloor = "0";
			if (floor != null && (floor < 0 || 1 <= floor)) {
				strFloor = Double.toString(floor < 0 ? floor : floor - 1).replace(".0", "");
			}
			JSONArray array = floor_map.optJSONArray(strFloor);
			if (array == null) {
				floor_map.put(strFloor, array = new JSONArray());
			}
			array.put(new JSONObject().put("title", title).put("node", nodeID));
		}

		public void addGroupTitle(JSONObject map, String tag_name, String tags) throws JSONException {
			JSONObject group_map = map.optJSONObject(building);
			if (group_map == null) {
				map.put(building, group_map = new JSONObject());
			}
			JSONObject tag_map = group_map.optJSONObject(tag_name);
			if (tag_map == null) {
				group_map.put(tag_name, tag_map = new JSONObject());
			}
			for (String key : tags.split(",")) {
				JSONArray array = tag_map.optJSONArray(key = key.trim());
				if (array == null) {
					tag_map.put(key, array = new JSONArray());
				}
				if (!array.contains(title)) {
					array.add(title);
				}
			}
		}

		public boolean query(String q) {
			return all_text.indexOf(q.toLowerCase()) != -1;
		}

		private String getToiletCategory() {
			if (toilet_accessible) {
				if (toilet_osto) {
					if (toilet_gender == 1) {
						return "TOIL_OM";
					} else if (toilet_gender == 2) {
						return "TOIL_OF";
					}
					return "TOIL_O";
				} else if (toilet_gender == 1) {
					return "TOIL_AM";
				} else if (toilet_gender == 2) {
					return "TOIL_AF";
				} else {
					return "TOIL_A";
				}
			} else if (toilet_gender == 1) {
				return "TOIL_M";
			} else if (toilet_gender == 2) {
				return "TOIL_F";
			} else {
				return "TOIL";
			}
		}
	}
}

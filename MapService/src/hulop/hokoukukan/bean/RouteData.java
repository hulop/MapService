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

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.apache.wink.json4j.JSONArray;
import org.apache.wink.json4j.JSONException;
import org.apache.wink.json4j.JSONObject;

import hulop.hokoukukan.utils.DBAdapter;

public class RouteData {

	public static final String VERSION = null;

	private static final long CACHE_EXPIRE = 60 * 60 * 1000;
	private static final DBAdapter adapter = DatabaseBean.adapter;
	private final JSONObject mNodeMap, mNodeFacilities, mFacilEntrances;
	private final JSONArray mFeatures, mDoors;
	private final Map<String, JSONArray> mLandMarks;
	private final Set<String> mElevatorNodes;
	private final double[] mCenter;
	private final double mRange;
	protected long mLastRef;

	private static List<RouteData> gRouteCache = new ArrayList<RouteData>();
	private static long gNextCheck = 0;
	private static String gLastUpdated = null;

	public static RouteData getCache(double[] center, double range) throws JSONException {
		long now = System.currentTimeMillis();
		if (now > gNextCheck) {
			gNextCheck = now + 60 * 1000;
			try {
				JSONObject updated_obj = getLastUpdated();
				if (updated_obj != null && !updated_obj.toString().equals(gLastUpdated)) {
					clearRouteCache();
				}
			} catch (Exception e) {
				e.printStackTrace();
			}
		}
		synchronized (gRouteCache) {
			RouteData cache = null;
			for (Iterator<RouteData> it = gRouteCache.iterator(); it.hasNext();) {
				RouteData rd = it.next();
				if (rd.mLastRef < System.currentTimeMillis() - CACHE_EXPIRE) {
					it.remove();
					System.out.println("remove " + rd);
				} else if (cache == null && rd.includes(center, range)) {
					cache = rd;
				}
			}
			if (cache != null) {
				cache.mLastRef = System.currentTimeMillis();
				System.out.println("reuse " + cache);
			} else {
				gRouteCache.add(cache = new RouteData(center, range * 1.5));
				System.out.println("new " + cache);
			}
			System.out.println(gRouteCache.size() + " RouteData");
			return cache;
		}
	}

	public static void onUpdate() {
		try {
			JSONObject obj = getLastUpdated();
			if (obj == null) {
				obj = new JSONObject().put("_id", "last_updated");
			}
			adapter.setOBJ(obj.put("timestamp", System.currentTimeMillis()));
			clearRouteCache();
		} catch (JSONException e) {
			e.printStackTrace();
		}
	}

	private static void clearRouteCache() {
		synchronized (gRouteCache) {
			gRouteCache.clear();
		}
		try {
			gLastUpdated = getLastUpdated().toString();
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	public static JSONObject getLastUpdated() {
		return adapter.find("last_updated");
	}

	public static boolean isCacheValid(RouteData rd) {
		return gRouteCache.contains(rd);
	}

	public RouteData(double[] center, double distance) throws JSONException {
		mCenter = center;
		mRange = distance;
		mNodeMap = new JSONObject();
		mNodeFacilities = new JSONObject();
		mFacilEntrances = new JSONObject();
		mFeatures = new JSONArray();
		mDoors = new JSONArray();
		mLandMarks = new HashMap<String, JSONArray>();
		mElevatorNodes = new HashSet<String>();
		adapter.getGeometry(center, distance, mNodeMap, mFeatures);
		JSONObject facilProperties = new JSONObject();
		for (Object feature : mFeatures) {
			try {
				JSONObject properties = ((JSONObject) feature).getJSONObject("properties");
				if (properties.has("施設ID")) {
					facilProperties.put(properties.getString("施設ID"), properties);
				}
			} catch (Exception e) {
				e.printStackTrace();
			}
		}
		for (Object feature : mFeatures) {
			try {
				JSONObject properties = ((JSONObject) feature).getJSONObject("properties");
				if (properties.has("リンクID")) {
					if ("10".equals(properties.getString("経路の種類"))) {
						mElevatorNodes.add(properties.getString("起点ノードID"));
						mElevatorNodes.add(properties.getString("終点ノードID"));
					}
				} else if (properties.has("出入口ID")) {
					if (properties.has("対応施設ID")) {
						String facil_id = properties.getString("対応施設ID");
						mFacilEntrances.append(facil_id, properties);
						if (properties.has("対応ノードID") && facilProperties.has(facil_id)) {
							mNodeFacilities.append(properties.getString("対応ノードID"), facilProperties.getJSONObject(facil_id));
						}
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
			} catch (Exception e) {
				e.printStackTrace();
			}
		}
		mLastRef = System.currentTimeMillis();
	}

	@Override
	public String toString() {
		return String.format("RouteData(center=%f,%f distance=%f %d features)", mCenter[0], mCenter[1], mRange,
				mFeatures.size());
	}

	public JSONObject getNodeMap() {
		return mNodeMap;
	}

	public JSONObject getNodeFacilities() {
		return mNodeFacilities;
	}

	public JSONArray getFeatures() {
		return mFeatures;
	}

	public Set<String> getElevatorNodes() {
		return mElevatorNodes;
	}

	public JSONArray getDoors() {
		return mDoors;
	}

	public JSONArray getLandmarks(String lang) {
		JSONArray landMarks = mLandMarks.get(lang);
		if (landMarks == null) {
			try {
				mLandMarks.put(lang, landMarks = initLandmarks(lang));
			} catch (JSONException e) {
				e.printStackTrace();
			}
		}
		return landMarks;
	}

	public boolean includes(double[] center, double range) {
		return RouteSearchBean.calcDistance(center, mCenter) + range < mRange;
	}

	private JSONArray initLandmarks(String lang) throws JSONException {
		I18Util i18 = new I18Util(lang);
		JSONArray result = new JSONArray();
		for (Object feature : mFeatures) {
			JSONObject json = (JSONObject) feature;
			JSONObject properties = json.getJSONObject("properties");
			String category = properties.getString("category");
			if (properties.has("出入口ID")) {
				if (i18.hasI18n(properties, "出入口の名称") && properties.has("対応ノードID") && !properties.has("対応施設ID")) {
					String name = i18.getI18n(properties, "出入口の名称");
					String name_pron = i18.getI18nPron(properties, "出入口の名称");
					String node = properties.getString("対応ノードID");
					result.add(new JSONObject().put("category", category).put("name", name).put("name_pron", name_pron)
							.put("node", node));
				}
			} else if (properties.has("施設ID")) {
				String name = i18.getI18n(properties, "名称");
				String short_description = i18.getI18n(properties, "short_description");
				String name_pron = i18.getI18nPron(properties, "名称");
				String facil_id = properties.getString("施設ID");
				if (mFacilEntrances.has(facil_id)) {
					for (JSONObject p : (List<JSONObject>) mFacilEntrances.get(facil_id)) {
						String n = null;
						if (p.has("対応ノードID")) {
							n = p.getString("対応ノードID");
						} else if (p.has("出入口ノード")) {
							n = p.getString("出入口ノード");
						}
						if (n != null) {
							JSONObject poi = new JSONObject().put("category", category).put("name", name)
									.put("name_pron", name_pron).put("node", n).put("properties", properties);
							if (short_description.length() > 0) {
								poi.put("short_description", short_description);
							}
							poi.put("geometry", json.get("geometry"));
							if (i18.hasI18n(p, "出入口の名称")) {
								String exit = i18.getI18n(p, "出入口の名称");
								String exit_pron = i18.getI18nPron(p, "出入口の名称");
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

	private class I18Util {

		private String mLang;

		public I18Util(String lang) {
			mLang = lang;
		}

		public boolean hasI18n(JSONObject properties, String key) {
			return hasLangString(properties, key) || properties.has(key);
		}

		public String getI18n(JSONObject properties, String key) throws JSONException {
			return hasLangString(properties, key) ? properties.getString(key + ":" + mLang)
					: properties.has(key) ? properties.getString(key) : "";
		}

		public boolean hasLangString(JSONObject properties, String key) {
			try {
				return properties.has(key + ":" + mLang) && properties.getString(key + ":" + mLang).length() > 0;
			} catch (JSONException e) {
				e.printStackTrace();
			}
			return false;
		}

		public String getI18nPron(JSONObject properties, String key) throws JSONException {
			return hasPronString(properties, key) ? properties.getString(key + ":" + mLang + "-Pron")
					: getI18n(properties, key);
		}

		public boolean hasPronString(JSONObject properties, String key) {
			try {
				return properties.has(key + ":" + mLang + "-Pron")
						&& properties.getString(key + ":" + mLang + "-Pron").length() > 0;
			} catch (JSONException e) {
				e.printStackTrace();
			}
			return false;
		}
	}
}

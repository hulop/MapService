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
import hulop.hokoukukan.utils.Hokoukukan;

public class RouteData {

	private static final long CACHE_EXPIRE = 60 * 60 * 1000;
	private static final DBAdapter adapter = DatabaseBean.adapter;
	private final JSONObject mNodeMap;
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
				JSONObject updated_obj = adapter.find("last_updated");
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
			JSONObject obj = adapter.find("last_updated");
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
			gLastUpdated = adapter.find("last_updated").toString();
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	public RouteData(double[] center, double distance) throws JSONException {
		mCenter = center;
		mRange = distance;
		mNodeMap = new JSONObject();
		mFeatures = new JSONArray();
		mDoors = new JSONArray();
		mLandMarks = new HashMap<String, JSONArray>();
		mElevatorNodes = new HashSet<String>();
		adapter.getGeometry(center, distance, mNodeMap, mFeatures, false);
		for (Object feature : mFeatures) {
			try {
				JSONObject properties = ((JSONObject) feature).getJSONObject("properties");
				switch (Hokoukukan.getCategory(properties)) {
				case Hokoukukan.CATEGORY_LINK:
					if (properties.getInt("route_type") == 3) {
						mElevatorNodes.add(properties.getString("start_id"));
						mElevatorNodes.add(properties.getString("end_id"));
					}
					break;
				case Hokoukukan.CATEGORY_FACILITY:
					for (String ent_ : Hokoukukan.listEntrances(properties)) {
						String ent_d = ent_ + "d";
						if (properties.has(ent_d)) {
							int door = properties.getInt(ent_d);
							switch (door) {
							case 0:
							case 99:
								break;
							default:
								mDoors.add(new JSONObject().append("node", properties.getString(ent_ + "node"))
										.append("door", door));
								break;
							}
						}
					}
					break;
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
			String name = null, name_pron = null;
			Object node = null;
			switch (Hokoukukan.getCategory(properties)) {
			case Hokoukukan.CATEGORY_FACILITY:
				name = i18.getI18n(properties, "name");
				name_pron = i18.getI18nPron(properties, "name");
				for (String ent_ : Hokoukukan.listEntrances(properties)) {
					String ent_n = ent_ + "n";
					JSONObject poi = new JSONObject().put("name", name).put("name_pron", name_pron)
							.put("node", properties.getString(ent_ + "node")).put("properties", properties);
					poi.put("geometry", json.get("geometry"));
					if (i18.hasI18n(properties, ent_n)) {
						String exit = i18.getI18n(properties, ent_n);
						String exit_pron = i18.getI18nPron(properties, ent_n);
						if (!"#".equals(exit)) {
							poi.put("exit", exit).put("exit_pron", exit_pron);
							result.add(poi);
						}
					} else {
						result.add(poi);
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
				obj.put("node_height", node.getJSONObject("properties").getDouble("floor"));
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
			return hasLangString(properties, key) ? properties.getString(key + "_" + mLang)
					: properties.has(key) ? properties.getString(key) : "";
		}

		public boolean hasLangString(JSONObject properties, String key) {
			try {
				return properties.has(key + "_" + mLang) && properties.getString(key + "_" + mLang).length() > 0;
			} catch (JSONException e) {
				e.printStackTrace();
			}
			return false;
		}

		public String getI18nPron(JSONObject properties, String key) throws JSONException {
			return hasPronString(properties, key) ? properties.getString(key + "_hira") : getI18n(properties, key);
		}

		public boolean hasPronString(JSONObject properties, String key) {
			try {
				return properties.has(key + "_hira") && properties.getString(key + "_hira").length() > 0;
			} catch (JSONException e) {
				e.printStackTrace();
			}
			return false;
		}
	}
}

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
import java.io.InputStream;

import javax.xml.parsers.SAXParserFactory;

import org.apache.wink.json4j.JSONArray;
import org.apache.wink.json4j.JSONException;
import org.apache.wink.json4j.JSONObject;
import org.xml.sax.Attributes;
import org.xml.sax.SAXException;
import org.xml.sax.helpers.DefaultHandler;

//import com.jhlabs.map.proj.Projection;
//import com.jhlabs.map.proj.ProjectionFactory;

public class GmlUtils {

	private static final String[] NAMESPACES = new String[] { "ns:", "fme:" };
	private static final String LOWERCORNER = "gml:lowerCorner";
	private static final String UPPERCORNER = "gml:upperCorner";
	private static final String FEATUREMEMBER = "gml:featureMember";
	private static final String CURVEPROPERTY = "gml:curveProperty";
	private static final String POINTPROPERTY = "gml:pointProperty";
	private static final String LINESTRING = "gml:LineString";
	private static final String POINT = "gml:Point";
	private static final String POSLIST = "gml:posList";
	private static final String COORDINATES = "gml:coordinates";
	private static final String POS = "gml:pos";
//	private static final Map<String, Projection> projectionCache = new HashMap<String, Projection>();

	public interface JSONListener {
		public void onJSON(Object json);
	}

	public static void toJSON(InputStream is, final File file, final JSONListener listener) throws Exception {
		final String category = getCategory(file);
		System.out.print("GML to JSON: fileName=" + file.getPath() + ", category=" + category + "  ...");
		if (category == null) {
			System.out.println(" skipped");
			return;
		}
		final StringBuilder sb = new StringBuilder();
		final JSONObject properties = new JSONObject();
		final JSONObject geometry = new JSONObject();
		final String[] srsName = { null };

		SAXParserFactory.newInstance().newSAXParser().parse(is, new DefaultHandler() {
			int nest = -2;

			@Override
			public void startElement(final String uri, final String localName, final String qName,
					final Attributes attributes) throws SAXException {
				nest++;
				sb.setLength(0);
				try {
					switch (qName) {
					case FEATUREMEMBER:
						properties.clear();
						geometry.clear();
						properties.put("category", category);
						properties.put("file", file.getPath());
						break;
					case LINESTRING:
						geometry.put("type", "LineString");
						srsName[0] = attributes.getValue("srsName");
						break;
					case POINT:
						geometry.put("type", "Point");
						srsName[0] = attributes.getValue("srsName");
						break;
					}
				} catch (JSONException e) {
					e.printStackTrace();
				}
			}

			@Override
			public void endElement(final String uri, final String localName, final String qName) throws SAXException {
				String value = sb.toString().trim();
				try {
					switch (qName) {
					case FEATUREMEMBER:
						JSONObject feature = new JSONObject();
						feature.put("type", "Feature");
						feature.put("geometry", fixGeometry(geometry, properties, srsName[0]));
						feature.put("properties", properties);
						listener.onJSON(feature);
						break;
					case POS:
					case POSLIST:
					case COORDINATES: {
						Double[][] coords = getCoordinates(value);
						if (coords != null) {
							if (coords.length > 1) {
								geometry.put("coordinates", coords);
							} else if (coords.length == 1) {
								geometry.put("coordinates", coords[0]);
							}
						}
					}
						break;
					case LOWERCORNER:
					case UPPERCORNER:
					case CURVEPROPERTY:
					case POINTPROPERTY:
					case LINESTRING:
					case POINT:
						break;
					default:
						if (nest < 2) {
							break;
						}
						boolean ok = false;
						for (String ns : NAMESPACES) {
							if (qName.startsWith(ns)) {
								if (value.length() > 0) {
									properties.put(qName.substring(ns.length()), value);
								}
								ok = true;
								break;
							}
						}
						if (!ok) {
							System.err.println(nest + ". UNKNOWN ELEMENT " + qName + "='" + value + "'");
						}
						break;
					}
					nest--;
				} catch (JSONException e) {
					e.printStackTrace();
				}
			}

			@Override
			public void characters(final char ch[], final int start, final int length) throws SAXException {
				sb.append(new String(ch, start, length));
			}
		});
	}

	private static String getCategory(File file) {
		String name = file.getName().split("\\.")[0];
		switch (name) {
		case "ノード":
		case "ノード":
			return "ノード情報";
		case "リンク":
		case "リンク情報":
			return "リンクの情報";
		case "出入口":
			return "出入口情報";
		case "公共施設":
		case "公共施設情報":
			return "公共施設の情報";
		case "トイレ":
		case "公共用トイレ情報":
			return "公共用トイレの情報";
		case "病院":
			return "病院の情報";
		case "経路":
		case "経路情報":
			return null;
		default:
			return name;
		}
	}

	private static Double[][] getCoordinates(String params) {
		String[] coords = params.split("[ ,]+");
		if (coords.length % 2 == 0) {
			Double[][] result = new Double[coords.length / 2][];
			for (int i = 0; i < coords.length; i += 2) {
				result[i / 2] = new Double[] { new Double(coords[i]), new Double(coords[i + 1]) };
			}
			return result;
		}
		return null;
	}

	private static JSONObject fixGeometry(JSONObject geometry, JSONObject properties, String srsName)
			throws JSONException {
		switch (geometry.getString("type")) {
		case "LineString":
			JSONArray coord = geometry.getJSONArray("coordinates");
			if (coord.length() == 2) {
				JSONArray c0 = coord.getJSONArray(0), c1 = coord.getJSONArray(1);
				if (c0.getDouble(0) == c1.getDouble(0) && c0.getDouble(1) == c1.getDouble(1)) {
					geometry.put("type", "Point");
					geometry.put("coordinates", c0);
				}
			}
			break;
		}
//		if (srsName == null) {
//			if (properties.getString("file").startsWith("nagoya")) {
//				srsName = "epsg:2449";
//			} else {
//				return geometry;
//			}
//		} else {
//			srsName = srsName.toLowerCase();
//		}
//		switch (srsName) {
//		case "epsg:4353":
//		case "epsg:4326":
//			break;
//		default:
//		// System.out.println("srsName: " + srsName);
//		// System.out.println(obj.toString(2));
//		{
//			Projection proj = projectionCache.get(srsName);
//			if (proj == null) {
//				projectionCache.put(srsName, proj = ProjectionFactory.getNamedPROJ4CoordinateSystem(srsName));
//			}
//			if (proj != null) {
//				// System.out.println(geometry.toString(2));
//				transform(geometry.getJSONArray("coordinates"), proj);
//				// System.out.println(geometry.toString(2));
//			}
//		}
//			break;
//		}
		return geometry;
	}

//	private static void transform(JSONArray coord, Projection proj) throws JSONException {
//		if (coord.isEmpty()) {
//			return;
//		} else if (coord.get(0) instanceof JSONArray) {
//			for (JSONArray a : (List<JSONArray>) coord) {
//				transform(a, proj);
//			}
//		} else if (coord.length() == 2) {
//			Point2D.Double src = new Point2D.Double(coord.getDouble(0), coord.getDouble(1)), dst = new Point2D.Double();
//			proj.inverseTransform(src, dst);
//			// System.out.println(src + " => " + dst);
//			coord.set(0, dst.x);
//			coord.set(1, dst.y);
//		} else {
//			System.out.print("Unknown coord data");
//			System.out.print(coord.toString(2));
//		}
//	}
}

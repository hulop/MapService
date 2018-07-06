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

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.wink.json4j.JSONObject;

public class Hokoukukan {

	public static final String CATEGORY_NODE = "node";
	public static final String CATEGORY_LINK = "link";
	public static final String CATEGORY_FACILITY = "facility";

	private static final Pattern ENT_NODE = Pattern.compile("^(ent\\d+_)node$");

	public static List<String> listEntrances(JSONObject properties) {
		List<String> entrances = new ArrayList<String>();
		for (Iterator<String> it = properties.keys(); it.hasNext();) {
			Matcher m = ENT_NODE.matcher(it.next());
			if (m.matches()) {
				entrances.add(m.group(1));
			}
		}
		return entrances;
	}

	public static String getCategory(JSONObject properties) {
		try {
			if (properties.getString("node_id").length() > 0) {
				return CATEGORY_NODE;
			}
		} catch (Exception e) {
		}
		try {
			if (properties.getString("link_id").length() > 0) {
				return CATEGORY_LINK;
			}
		} catch (Exception e) {
		}
		try {
			if (properties.getString("facil_id").length() > 0) {
				return CATEGORY_FACILITY;
			}
		} catch (Exception e) {
		}
		return "";
	}

}

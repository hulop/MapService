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

import java.text.SimpleDateFormat;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.wink.json4j.JSONArray;
import org.apache.wink.json4j.JSONException;
import org.apache.wink.json4j.JSONObject;

public class Hokoukukan {

	private static final String no_serv_d = "no_serv_d", start_time = "start_time", end_time = "end_time",
			start_date = "start_date", end_date = "end_date", business_hours = "hulop_business_hours";
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

	private static int SERVICE_TIME_DIFF = Integer.MAX_VALUE;
	static {
		try {
			SERVICE_TIME_DIFF = Integer.parseInt(System.getenv("SERVICE_TIME_DIFF"));
			System.out.println("OffsetDateTime: " + OffsetDateTime.now(ZoneOffset.ofTotalSeconds(SERVICE_TIME_DIFF * 60)));
		} catch (Exception e) {
		}
	}
	private static final Pattern PAT_TIME = Pattern.compile("^(\\d{2})-?(\\d{2})$");
	private static final Pattern PAT_DAYS = Pattern.compile("^(\\d+)$");
	private static final Pattern PAT_DATE = Pattern.compile("^(\\d{4})[ -](\\d{1,2})[ -](\\d{1,2})$");

	public static boolean available(JSONObject properties) {
		if (SERVICE_TIME_DIFF < Integer.MAX_VALUE) {
			OffsetDateTime dt = OffsetDateTime.now(ZoneOffset.ofTotalSeconds(SERVICE_TIME_DIFF * 60));
			try {
				Calendar today = Calendar.getInstance();
				today.set(dt.getYear(), dt.getMonthValue(), dt.getDayOfMonth());
				if (properties.has(start_date)) {
					Matcher m = PAT_DATE.matcher(properties.getString(start_date));
					if (m.matches()) {
						Calendar start = Calendar.getInstance();
						start.set(Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2)), Integer.parseInt(m.group(3)));
						if (today.compareTo(start) < 0) {
							return false;
						}
					}
				}
				if (properties.has(end_date)) {
					Matcher m = PAT_DATE.matcher(properties.getString(end_date));
					if (m.matches()) {
						Calendar end = Calendar.getInstance();
						end.set(Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2)), Integer.parseInt(m.group(3)));
						if (today.compareTo(end) > 0) {
							return false;
						}
					}
				}
				for (int i = 0; i < holidaySuffix.length; i++) {
					String name = business_hours + holidaySuffix[i];
					if (properties.has(name)) {
						String date_times = properties.getString(name).trim();
						if (i > 0) {
							String[] times = date_times.split(",");
							date_times = "";
							for (String date : i == 1 ? before_holidays : holidays) {
								for (String time : times) {
									if (date_times.length() > 0) {
										date_times += ",";
									}
									date_times += date + "_" + time.trim();
								}
							}
						}
						Boolean result = checkBusinessHour(dt, 0, date_times);
						if (result != null) {
							return result;
						}
					}
				}
				for (int i = 1; i < daySuffix.length; i++) {
					String name = business_hours + daySuffix[i];
					if (properties.has(name)) {
						Boolean result = checkBusinessHour(dt, i, properties.getString(name));
						if (result != null) {
							return result;
						}
					}
				}
				if (properties.has(no_serv_d)) {
					Matcher m = PAT_DAYS.matcher(properties.getString(no_serv_d));
					if (m.matches() && m.group(1).indexOf('0' + dt.getDayOfWeek().getValue()) >= 0) {
						return false;
					}
				}
				int now = dt.getHour() * 60 + dt.getMinute();
				if (properties.has(start_time)) {
					Matcher m = PAT_TIME.matcher(properties.getString(start_time));
					if (m.matches() && now < Integer.parseInt(m.group(1)) * 60 + Integer.parseInt(m.group(2))) {
						return false;
					}
				}
				if (properties.has(end_time)) {
					Matcher m = PAT_TIME.matcher(properties.getString(end_time));
					if (m.matches() && now >= Integer.parseInt(m.group(1)) * 60 + Integer.parseInt(m.group(2))) {
						return false;
					}
				}
			} catch (Exception e) {
				e.printStackTrace();
			}
		}
		return true;
	}

	public static boolean availableAll(List<JSONObject> list) {
		for (JSONObject properties : list) {
			if (!available(properties)) {
				return false;
			}
		}
		return true;
	}

	public static boolean availableAny(List<JSONObject> list) {
		for (JSONObject properties : list) {
			if (available(properties)) {
				return true;
			}
		}
		return false;
	}

	private static final String daySuffix[] = new String[] { "", "_Mon", "_Tue", "_Wed", "_Thu", "_Fri", "_Sat", "_Sun" };
	private static final Pattern PAT_DATES = Pattern.compile("^(\\d{4})/(\\d{1,2})/(\\d{1,2})_(\\d{1,2}):(\\d{1,2})-(\\d{1,2}):(\\d{1,2})$");
	private static final Pattern PAT_TIMES = Pattern.compile("^(\\d{1,2}):(\\d{1,2})-(\\d{1,2}):(\\d{1,2})$");

	private static Boolean checkBusinessHour(OffsetDateTime dt, int dayOfWeek, String items) {
		int now = dt.getHour() * 60 + dt.getMinute();
		Boolean result = null;
		for (String item : items.split(",")) {
			item = item.trim();
			try {
				if (dayOfWeek == 0) {
					Matcher m = PAT_DATES.matcher(item);
					if (m.matches() && dt.getYear() == Integer.parseInt(m.group(1))
							&& dt.getMonthValue() == Integer.parseInt(m.group(2))
							&& dt.getDayOfMonth() == Integer.parseInt(m.group(3))) {
						result = now >= Integer.parseInt(m.group(4)) * 60 + Integer.parseInt(m.group(5))
								&& now < Integer.parseInt(m.group(6)) * 60 + Integer.parseInt(m.group(7));
					}
				} else if (dayOfWeek == dt.getDayOfWeek().getValue()) {
					Matcher m = PAT_TIMES.matcher(item);
					if (m.matches()) {
						result = now >= Integer.parseInt(m.group(1)) * 60 + Integer.parseInt(m.group(2))
								&& now < Integer.parseInt(m.group(3)) * 60 + Integer.parseInt(m.group(4));
					}
				}
				if (Boolean.TRUE.equals(result)) {
					return result;
				}
			} catch (Exception e) {
				e.printStackTrace();
			}
		}
		return result;
	}

	// Holidays
	private static final SimpleDateFormat DF = new SimpleDateFormat("yyyy/MM/dd");
	private static final String holidaySuffix[] = { "", "_PreHoliday", "_Holiday" };
	private static final String[] holidays = getHolidays();
	private static final String[] before_holidays = adjustDays(holidays, -24 * 60 * 60 * 1000);

	private static String[] adjustDays(String[] from, long val) {
		String[] to = new String[from.length];
		for (int i = 0; i < from.length; i++) {
			try {
				to[i] = DF.format(new Date(DF.parse(to[i] = from[i]).getTime() + val));
			} catch (Exception e) {
				e.printStackTrace();
			}
			System.out.println(to[i] + " < " + from[i]);
		}
		return to;
	}

	private static String[] getHolidays() {
		try {
			Object[] objArray = new JSONArray(System.getenv("HULOP_HOLIDAYS")).toArray();
			return Arrays.asList(objArray).toArray(new String[objArray.length]);
		} catch(JSONException e) {
			e.printStackTrace();
		} catch(Exception e) {
		}
		return new String[] {};
	}

	public static void main(String[] args) throws Exception {
		if (args.length > 0) {
			SERVICE_TIME_DIFF = 540;
			for (Object feature : new JSONObject(new java.io.FileInputStream(args[0])).getJSONArray("features")) {
				JSONObject properties = ((JSONObject)feature).getJSONObject("properties");
				System.out.println(available(properties) + " " + properties);
			}
		}
	}
}

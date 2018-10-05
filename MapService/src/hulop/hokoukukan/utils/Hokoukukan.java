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

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.wink.json4j.JSONObject;

public class Hokoukukan {

	private static final String no_serv_d = "供用制限曜日", start_time = "供用開始時間", end_time = "供用終了時間";

	private static int SERVICE_TIME_DIFF = Integer.MAX_VALUE;
	static {
		try {
			SERVICE_TIME_DIFF = Integer.parseInt(System.getenv("SERVICE_TIME_DIFF"));
			System.out.println("OffsetDateTime: " + OffsetDateTime.now(ZoneOffset.ofTotalSeconds(SERVICE_TIME_DIFF * 60)));
		} catch (Exception e) {
		}
	}
	private static final Pattern PAT_TIME = Pattern.compile("^(\\d\\d)-?(\\d\\d)$");
	private static final Pattern PAT_DATE = Pattern.compile("^(\\d+)$");

	public static boolean available(JSONObject properties) {
		if (SERVICE_TIME_DIFF < Integer.MAX_VALUE) {
			OffsetDateTime dt = OffsetDateTime.now(ZoneOffset.ofTotalSeconds(SERVICE_TIME_DIFF * 60));
			int date = dt.getDayOfWeek().getValue();
			int hour = dt.getHour();
			int min = dt.getMinute();
			try {
				if (properties.has(no_serv_d)) {
					Matcher m = PAT_DATE.matcher(properties.getString(no_serv_d));
					if (m.matches()) {
						for (char ch : m.group(1).toCharArray()) {
							if (date == Character.getNumericValue(ch)) {
								return false;
							}
						}
					}
				}
				if (properties.has(start_time)) {
					Matcher m = PAT_TIME.matcher(properties.getString(start_time));
					if (m.matches()) {
						int hh = Integer.parseInt(m.group(1));
						if (hour < hh || (hour == hh && min < Integer.parseInt(m.group(2)))) {
							return false;
						}
					}
				}
				if (properties.has(end_time)) {
					Matcher m = PAT_TIME.matcher(properties.getString(end_time));
					if (m.matches()) {
						int hh = Integer.parseInt(m.group(1));
						if (hour > hh || (hour == hh && min >= Integer.parseInt(m.group(2)))) {
							return false;
						}
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
}

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
import java.io.FileOutputStream;
import java.util.Set;

import org.apache.commons.codec.binary.Base64;
import org.apache.wink.json4j.JSON;
import org.apache.wink.json4j.JSONArray;
import org.apache.wink.json4j.JSONObject;

public class DecodeDataURI {

	public static void main(String[] args) throws Exception {
		if (args.length > 0) {
			File file = new File(args[0]);
			if (file.exists()) {
				JSONObject obj = (JSONObject) JSON.parse(new FileInputStream(file));
				JSONObject layers = obj.getJSONObject("layers");
				for (String layerName : (Set<String>) layers.keySet()) {
					JSONObject layer = layers.getJSONObject(layerName);
					JSONObject regions = layer.getJSONObject("regions");
					for (String regionName : (Set<String>) regions.keySet()) {
						JSONObject region = regions.getJSONObject(regionName);
						String[] image = region.getString("image").split(",");
						if (image.length == 2) {
							String imgFilename = null;
							if ("data:image/png;base64".equals(image[0])) {
								imgFilename = regionName + ".png";
							} else if ("data:image/svg+xml;base64".equals(image[0])) {
								imgFilename = regionName + ".svg";
							}
							if (imgFilename != null) {
								byte[] bin = Base64.decodeBase64(image[1]);
								File imgFile = new File(file.getParentFile(), imgFilename);
								System.out.println(imgFile);
								new FileOutputStream(imgFile).write(bin);
								region.put("image", imgFilename);
								System.out.println(region.toString(4));
							}
						}
					}
				}
				if (obj.has("localizations")) {
					JSONArray array = obj.getJSONArray("localizations");
					for (int i = 0; i < array.length(); i++) {
						JSONObject localization = array.getJSONObject(i);
						if (localization.has("dataFile")) {
							System.out.println("========");
							String dataFileName = localization.has("dataFileName")
									? localization.getString("dataFileName") : "datafile.json";
							new FileOutputStream(new File(file.getParentFile(), dataFileName))
									.write(((String) localization.remove("dataFile")).getBytes("UTF-8"));
							System.out.println(localization.toString(4));
							new FileOutputStream(new File(file.getParentFile(), "localization.json"))
									.write(localization.toString(4).getBytes("UTF-8"));
						}
					}

				}

			}
		}
	}

}

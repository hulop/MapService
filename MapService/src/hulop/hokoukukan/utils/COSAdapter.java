package hulop.hokoukukan.utils;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

import org.apache.wink.json4j.JSON;
import org.apache.wink.json4j.JSONObject;

public class COSAdapter {

	public static COSAdapter getInstance() {
		String vcap = System.getenv("HULOP_VCAP_SERVICES");
		String bucketName = System.getenv("COS_BUCKETNAME");
		if (vcap == null) {
			vcap = System.getenv("VCAP_SERVICES");
		}
		if (vcap != null && bucketName != null) {
			try {
				JSONObject json = (JSONObject) JSON.parse(vcap);
				if (json.has("cloud-object-storage")) {
					JSONObject credentials = json.getJSONArray("cloud-object-storage").getJSONObject(0).getJSONObject("credentials");
					
				}
			} catch (Exception e) {
				e.printStackTrace();
			}
		}
		return null;
	}

	public void saveAttachment(String path, InputStream is) {
	}

	public InputStream getAttachment(String path) {
		return null;
	}

	public List<String> listAttachment() {
		List<String> files = new ArrayList<String>();
		return files;
	}

	public void deleteAttachment(String path) {
	}
}

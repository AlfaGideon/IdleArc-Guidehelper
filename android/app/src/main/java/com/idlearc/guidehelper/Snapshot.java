package com.idlearc.guidehelper;

import org.json.JSONObject;
import java.util.LinkedHashMap;
import java.util.Map;

/** Only allowlisted numeric fields cross from the game page to the Android UI. */
final class Snapshot {
    static final String[] KEYS = {"Level", "Monster Level", "HP", "Attack Damage", "Defense", "Crit Chance", "Gold"};
    final Map<String, String> values = new LinkedHashMap<>();

    static Snapshot parse(String json) {
        Snapshot result = new Snapshot();
        try {
            // evaluateJavascript serializes the JS return value as a JSON string.
            String payload = new org.json.JSONTokener(json).nextValue().toString();
            JSONObject data = new JSONObject(payload);
            for (String key : KEYS) {
                String value = data.optString(key, "");
                if (value.matches("[0-9][0-9,. %]{0,23}")) result.values.put(key, value.trim());
            }
        } catch (Exception ignored) { /* Unknown layout or navigation in progress. */ }
        return result;
    }
}

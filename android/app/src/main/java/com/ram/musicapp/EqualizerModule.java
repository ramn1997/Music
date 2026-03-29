package com.ram.musicapp;

import android.media.audiofx.Equalizer;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.util.ArrayList;
import java.util.List;

public class EqualizerModule extends ReactContextBaseJavaModule {
    private static final String TAG = "EqualizerModule";
    private Equalizer equalizer;

    public EqualizerModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "EqualizerModule";
    }

    @ReactMethod
    public void initializeEqualizer(int sessionId, Promise promise) {
        try {
            if (equalizer != null) {
                equalizer.release();
            }
            // Priority: 0, sessionId: from TrackPlayer
            equalizer = new Equalizer(0, sessionId);
            equalizer.setEnabled(true);
            
            WritableMap result = Arguments.createMap();
            result.putInt("numberOfBands", equalizer.getNumberOfBands());
            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize Equalizer", e);
            promise.reject("E_EQUALIZER_INIT", e.getMessage());
        }
    }

    @ReactMethod
    public void getBandLevelRange(Promise promise) {
        if (equalizer == null) {
            promise.reject("E_NOT_INIT", "Equalizer not initialized");
            return;
        }
        short[] range = equalizer.getBandLevelRange();
        WritableArray array = Arguments.createArray();
        array.pushInt(range[0]);
        array.pushInt(range[1]);
        promise.resolve(array);
    }

    @ReactMethod
    public void setBandLevel(int band, int level, Promise promise) {
        if (equalizer == null) {
            promise.reject("E_NOT_INIT", "Equalizer not initialized");
            return;
        }
        try {
            equalizer.setBandLevel((short) band, (short) level);
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("E_SET_LEVEL", e.getMessage());
        }
    }

    @ReactMethod
    public void getBandCenterFreq(int band, Promise promise) {
        if (equalizer == null) {
            promise.reject("E_NOT_INIT", "Equalizer not initialized");
            return;
        }
        promise.resolve(equalizer.getCenterFreq((short) band));
    }

    @ReactMethod
    public void getPresets(Promise promise) {
        if (equalizer == null) {
            promise.reject("E_NOT_INIT", "Equalizer not initialized");
            return;
        }
        WritableArray presets = Arguments.createArray();
        short numPresets = equalizer.getNumberOfPresets();
        for (short i = 0; i < numPresets; i++) {
            presets.pushString(equalizer.getPresetName(i));
        }
        promise.resolve(presets);
    }

    @ReactMethod
    public void applyPreset(int index, Promise promise) {
        if (equalizer == null) {
            promise.reject("E_NOT_INIT", "Equalizer not initialized");
            return;
        }
        try {
            equalizer.usePreset((short) index);
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("E_APPLY_PRESET", e.getMessage());
        }
    }

    @ReactMethod
    public void setEnabled(boolean enabled, Promise promise) {
        if (equalizer == null) {
            promise.reject("E_NOT_INIT", "Equalizer not initialized");
            return;
        }
        equalizer.setEnabled(enabled);
        promise.resolve(enabled);
    }

    @ReactMethod
    public void getBandLevels(Promise promise) {
        if (equalizer == null) {
            promise.reject("E_NOT_INIT", "Equalizer not initialized");
            return;
        }
        WritableArray levels = Arguments.createArray();
        short numBands = equalizer.getNumberOfBands();
        for (short i = 0; i < numBands; i++) {
            levels.pushInt(equalizer.getBandLevel(i));
        }
        promise.resolve(levels);
    }

    @ReactMethod
    public void release(Promise promise) {
        if (equalizer != null) {
            equalizer.release();
            equalizer = null;
        }
        promise.resolve(null);
    }

    @Override
    public void onCatalystInstanceDestroy() {
        if (equalizer != null) {
            equalizer.release();
            equalizer = null;
        }
    }
}

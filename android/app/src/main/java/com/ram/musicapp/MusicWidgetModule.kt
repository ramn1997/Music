package com.ram.musicapp

import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class MusicWidgetModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    init {
        instance = this
    }

    companion object {
        var instance: MusicWidgetModule? = null

        fun sendEvent(eventName: String) {
            instance?.reactContext
                ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(eventName, null)
        }
    }

    override fun getName(): String {
        return "MusicWidget"
    }

    @ReactMethod
    fun updateWidget(data: ReadableMap) {
        val sharedPref = reactApplicationContext.getSharedPreferences("WidgetData", Context.MODE_PRIVATE)
        val editor = sharedPref.edit()

        if (data.hasKey("title")) editor.putString("title", data.getString("title"))
        if (data.hasKey("artist")) editor.putString("artist", data.getString("artist"))
        if (data.hasKey("artwork")) editor.putString("artwork", data.getString("artwork"))
        if (data.hasKey("isPlaying")) editor.putBoolean("isPlaying", data.getBoolean("isPlaying"))
        if (data.hasKey("isLiked")) editor.putBoolean("isLiked", data.getBoolean("isLiked"))
        if (data.hasKey("progress")) editor.putFloat("progress", data.getDouble("progress").toFloat())
        if (data.hasKey("duration")) editor.putFloat("duration", data.getDouble("duration").toFloat())
        editor.apply()

        // Send broadcast to update both widgets
        val updateIntent = Intent("com.ram.musicapp.UPDATE_WIDGET")
        updateIntent.setPackage(reactApplicationContext.packageName)
        reactApplicationContext.sendBroadcast(updateIntent)
    }

    // Required for React Native event emitter
    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}

package com.ram.musicapp

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.BroadcastReceiver
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class WidgetModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var receiver: BroadcastReceiver? = null

    override fun getName(): String {
        return "WidgetModule"
    }

    @ReactMethod
    fun updateWidget(title: String, artist: String, isPlaying: Boolean, artworkPath: String?) {
        val context = reactApplicationContext
        val prefs = context.getSharedPreferences("MusicWidget", Context.MODE_PRIVATE)
        prefs.edit().apply {
            putString("title", title)
            putString("artist", artist)
            putBoolean("isPlaying", isPlaying)
            putString("artworkPath", artworkPath)
            apply()
        }
        MusicWidget.updateAllWidgets(context)
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}

    init {
        val filter = IntentFilter("com.ram.musicapp.WIDGET_CONTROL")
        receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                val command = intent.getStringExtra("command")
                if (command != null) {
                    reactApplicationContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("onWidgetCommand", command)
                }
            }
        }
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            reactContext.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            reactContext.registerReceiver(receiver, filter)
        }
    }
}

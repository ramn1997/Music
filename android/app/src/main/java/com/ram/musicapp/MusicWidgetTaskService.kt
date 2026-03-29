package com.ram.musicapp

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

class MusicWidgetTaskService : HeadlessJsTaskService() {
    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
        val extras = intent?.extras
        return if (extras != null) {
            HeadlessJsTaskConfig(
                "MusicWidgetTask",
                Arguments.fromBundle(extras),
                5000, // Timeout in ms
                true // Allowed in foreground
            )
        } else {
            null
        }
    }
}

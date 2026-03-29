package com.ram.musicapp.ai

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

class AudioAITaskService : HeadlessJsTaskService() {

    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig {
        return HeadlessJsTaskConfig(
            "AudioAITask",
            Arguments.createMap(),
            1000 * 60 * 60, // Allow 1 hour of timeout under charging+idle
            true // true for allowing in foreground
        )
    }
}

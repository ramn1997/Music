package com.ram.musicapp.ai

import androidx.work.*
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import java.util.concurrent.TimeUnit

class AudioAIModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "AudioAIModule"
    }

    @ReactMethod
    fun scheduleBackgroundIndexing(promise: Promise) {
        try {
            // "Trigger indexing only when the device is charging and idle to preserve battery."
            val constraints = Constraints.Builder()
                .setRequiresCharging(true)
                .setRequiresDeviceIdle(true)
                .build()

            // Run this maintenance task periodically, or whenever conditions are met
            val aiWorkRequest = PeriodicWorkRequestBuilder<AudioAIWorker>(
                1, TimeUnit.HOURS, // Runs at most once an hour when conditions met
                15, TimeUnit.MINUTES)
                .setConstraints(constraints)
                .build()

            WorkManager.getInstance(reactApplicationContext).enqueueUniquePeriodicWork(
                "AudioAIWorkerTask",
                ExistingPeriodicWorkPolicy.KEEP,
                aiWorkRequest
            )
            
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("AI_SCHEDULING_ERROR", e.message)
        }
    }
}

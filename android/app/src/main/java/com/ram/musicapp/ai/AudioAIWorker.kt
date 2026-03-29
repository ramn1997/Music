package com.ram.musicapp.ai

import android.content.Context
import android.content.Intent
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import androidx.work.ListenableWorker

class AudioAIWorker(
    context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result {
        return try {
            val intent = Intent(applicationContext, AudioAITaskService::class.java)
            // Start the headless task service
            applicationContext.startService(intent)
            
            // Note: Since this invokes a Headless JS Task which happens asynchronously,
            // we return success immediately. The Headless JS task handles its own lifecycle.
            // Android allows this under charging/idle conditions.
            Result.success()
        } catch (e: Exception) {
            Result.failure()
        }
    }
}

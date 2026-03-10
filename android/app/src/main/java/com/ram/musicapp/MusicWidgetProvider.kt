package com.ram.musicapp

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import android.util.Log
import android.widget.RemoteViews
import java.io.File
import java.net.URL
import kotlin.concurrent.thread

class MusicWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        Log.d("MusicWidget", "onUpdate called for ${appWidgetIds.size} widgets")
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        Log.d("MusicWidget", "onReceive action: ${intent.action}")
        
        // Handle custom update action
        if (intent.action == "com.ram.musicapp.UPDATE_WIDGET") {
            val pendingResult = goAsync()
            thread {
                try {
                    val appWidgetManager = AppWidgetManager.getInstance(context)
                    val thisAppWidget = ComponentName(context, MusicWidgetProvider::class.java)
                    val appWidgetIds = appWidgetManager.getAppWidgetIds(thisAppWidget)
                    
                    // First immediate update
                    for (appWidgetId in appWidgetIds) {
                        updateAppWidget(context, appWidgetManager, appWidgetId)
                    }
                    
                    // Small delay and second update to ensure sticky rendering on Oppo/Realme
                    Thread.sleep(600)
                    for (appWidgetId in appWidgetIds) {
                        updateAppWidget(context, appWidgetManager, appWidgetId)
                    }
                } catch (e: Exception) {
                    Log.e("MusicWidget", "Error in async update: ${e.message}")
                } finally {
                    pendingResult.finish()
                }
            }
        }
    }

    companion object {
        fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            try {
                val prefs = context.getSharedPreferences("music_widget", Context.MODE_PRIVATE)
                val title = prefs.getString("title", "No Track Playing") ?: "No Track Playing"
                val artist = prefs.getString("artist", "Open App to Start") ?: "Open App to Start"
                val isPlaying = prefs.getBoolean("isPlaying", false)
                val isShuffleOn = prefs.getBoolean("isShuffleOn", false)
                val repeatMode = prefs.getString("repeatMode", "off") ?: "off"
                val artworkUri = prefs.getString("artwork", "") ?: ""
                val progress = prefs.getInt("progress", 0)
                val duration = prefs.getInt("duration", 100)
                val currentTimeStr = prefs.getString("currentTimeStr", "00:00") ?: "00:00"
                val totalTimeStr = prefs.getString("totalTimeStr", "00:00") ?: "00:00"

                Log.d("MusicWidget", "Updating widget $appWidgetId: $title by $artist (Playing: $isPlaying)")

                Log.d("MusicWidget", "Attempting inflation with music_widget_v2 for $appWidgetId")
                val views = RemoteViews(context.packageName, R.layout.music_widget_v2)

                // Update text
                views.setTextViewText(R.id.widget_title, title)
                views.setTextViewText(R.id.widget_artist, artist)
                
                // Safe progress update
                val safeDuration = if (duration <= 0) 100 else duration
                val safeProgress = if (progress < 0) 0 else if (progress > safeDuration) safeDuration else progress
                views.setProgressBar(R.id.widget_progress, safeDuration, safeProgress, false)
                
                views.setTextViewText(R.id.widget_current_time, currentTimeStr)
                views.setTextViewText(R.id.widget_total_time, totalTimeStr)

                // Update play/pause icon
                val playPauseIcon = if (isPlaying) {
                    android.R.drawable.ic_media_pause
                } else {
                    android.R.drawable.ic_media_play
                }
                views.setImageViewResource(R.id.widget_play_pause_btn, playPauseIcon)

                val repeatIcon = android.R.drawable.ic_menu_revert 
                views.setImageViewResource(R.id.widget_repeat_btn, repeatIcon)

                // Setup Intents for controls
                views.setOnClickPendingIntent(R.id.widget_play_pause_btn, getPendingSelfIntent(context, "ACTION_PLAY_PAUSE"))
                views.setOnClickPendingIntent(R.id.widget_next_btn, getPendingSelfIntent(context, "ACTION_NEXT"))
                views.setOnClickPendingIntent(R.id.widget_prev_btn, getPendingSelfIntent(context, "ACTION_PREV"))
                views.setOnClickPendingIntent(R.id.widget_shuffle_btn, getPendingSelfIntent(context, "ACTION_SHUFFLE"))
                views.setOnClickPendingIntent(R.id.widget_repeat_btn, getPendingSelfIntent(context, "ACTION_REPEAT"))
                
                // Launch App on artwork/title click
                val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                if (launchIntent != null) {
                    val pendingIntent = PendingIntent.getActivity(context, 0, launchIntent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
                    views.setOnClickPendingIntent(R.id.widget_title, pendingIntent)
                    views.setOnClickPendingIntent(R.id.widget_artist, pendingIntent)
                }

                // Removed initial artwork setup that could crash
                views.setImageViewResource(R.id.widget_artwork, R.drawable.default_cover)

                // First full update
                appWidgetManager.updateAppWidget(appWidgetId, views)

                // Handle Artwork asynchronously
                if (artworkUri.isNotEmpty()) {
                    thread {
                        try {
                            val bitmap = when {
                                artworkUri.startsWith("http") -> {
                                    BitmapFactory.decodeStream(URL(artworkUri).openConnection().apply {
                                        connectTimeout = 3000
                                        readTimeout = 3000
                                    }.getInputStream())
                                }
                                artworkUri.startsWith("content://") -> {
                                    try {
                                        context.contentResolver.openInputStream(Uri.parse(artworkUri))?.use {
                                            BitmapFactory.decodeStream(it)
                                        }
                                    } catch (e: Exception) {
                                        Log.e("MusicWidget", "Failed to load content URI: $artworkUri")
                                        null
                                    }
                                }
                                artworkUri.startsWith("res:") -> {
                                    try {
                                        val resId = artworkUri.substring(4).toIntOrNull()
                                        if (resId != null) {
                                            BitmapFactory.decodeResource(context.resources, resId)
                                        } else {
                                            context.assets.open("default_cover.png").use { 
                                                BitmapFactory.decodeStream(it) 
                                            }
                                        }
                                    } catch (e: Exception) {
                                        try {
                                            context.assets.open("default_cover.png").use { 
                                                BitmapFactory.decodeStream(it) 
                                            }
                                        } catch (e2: Exception) { null }
                                    }
                                }
                                artworkUri.startsWith("android.resource://") -> {
                                    try {
                                        val parts = artworkUri.split("/")
                                        val resName = parts.last()
                                        val resId = context.resources.getIdentifier(resName, "drawable", context.packageName)
                                        if (resId != 0) {
                                            BitmapFactory.decodeResource(context.resources, resId)
                                        } else null
                                    } catch (e: Exception) { null }
                                }
                                artworkUri.startsWith("asset:") -> {
                                    try {
                                        val assetPath = artworkUri.substring(6).removePrefix("/")
                                        context.assets.open(assetPath).use { 
                                            BitmapFactory.decodeStream(it) 
                                        }
                                    } catch (e: Exception) { null }
                                }

                                else -> {
                                    // Try as resource name first (e.g. "default_cover")
                                    val resId = context.resources.getIdentifier(artworkUri, "drawable", context.packageName)
                                    if (resId != 0) {
                                        BitmapFactory.decodeResource(context.resources, resId)
                                    } else if (artworkUri.contains("assets/")) {
                                        try {
                                            val parts = artworkUri.split("assets/")
                                            val assetPath = parts[parts.size - 1]
                                            val inputStream = context.assets.open(assetPath)
                                            BitmapFactory.decodeStream(inputStream)
                                        } catch (e: Exception) { null }
                                    } else {
                                        // Fallback to file path
                                        BitmapFactory.decodeFile(artworkUri)
                                    }
                                }
                            }

                            val finalBitmap = bitmap ?: try {
                                context.assets.open("default_cover.png").use { 
                                    BitmapFactory.decodeStream(it) 
                                }
                            } catch (e: Exception) { null }

                            if (finalBitmap != null) {
                                val scaledBitmap = scaleBitmap(finalBitmap, 450)
                                val updatedViews = RemoteViews(context.packageName, R.layout.music_widget_v2)
                                updatedViews.setImageViewBitmap(R.id.widget_artwork, scaledBitmap)
                                updatedViews.setImageViewBitmap(R.id.widget_background_art, scaledBitmap)
                                updatedViews.setViewVisibility(R.id.widget_background_art, android.view.View.VISIBLE)
                                appWidgetManager.partiallyUpdateAppWidget(appWidgetId, updatedViews)
                            }
                        } catch (e: Exception) {
                            Log.e("MusicWidget", "Error loading artwork: ${e.message}")
                        }
                    }
                }

            } catch (e: Exception) {
                Log.e("MusicWidget", "Critical error in updateAppWidget: ${e.message}")
                e.printStackTrace()
            }
        }

        private fun scaleBitmap(source: Bitmap, maxSide: Int): Bitmap {
            if (source.width <= maxSide && source.height <= maxSide) return source
            
            val ratio = source.width.toFloat() / source.height.toFloat()
            var width = maxSide
            var height = maxSide
            
            if (source.width > source.height) {
                height = (maxSide / ratio).toInt()
            } else {
                width = (maxSide * ratio).toInt()
            }
            
            return Bitmap.createScaledBitmap(source, width, height, true)
        }

        private fun getPendingSelfIntent(context: Context, action: String): PendingIntent {
            val intent = Intent(context, MusicWidgetReceiver::class.java).apply {
                this.action = action
            }
            return PendingIntent.getBroadcast(
                context, 
                action.hashCode(), 
                intent, 
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
        }
    }
}


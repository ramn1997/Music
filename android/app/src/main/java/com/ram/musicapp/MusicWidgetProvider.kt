package com.ram.musicapp

import android.app.PendingIntent
import com.ram.musicapp.R
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.net.Uri
import android.util.Log
import android.widget.RemoteViews
import java.io.InputStream
import kotlin.concurrent.thread

class MusicWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "MusicWidget"
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        val action = intent.action
        if (action == "com.ram.musicapp.UPDATE_WIDGET") {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(ComponentName(context, MusicWidgetProvider::class.java))
            onUpdate(context, appWidgetManager, appWidgetIds)
        } else if (action?.startsWith("com.ram.musicapp.WIDGET_") == true) {
            val eventName = action.replace("com.ram.musicapp.", "")
            
            // Start Headless Task Service for background support
            try {
                val serviceIntent = Intent(context, MusicWidgetTaskService::class.java)
                serviceIntent.putExtra("eventName", eventName)
                context.startService(serviceIntent)
            } catch (e: Exception) {
                e.printStackTrace()
                MusicWidgetModule.sendEvent(eventName)
            }
            
            // If it's WIDGET_LIKE, optimistically update UI so user has instant feedback
            if (eventName == "WIDGET_LIKE") {
               val sharedPref = context.getSharedPreferences("WidgetData", Context.MODE_PRIVATE)
               val isLiked = sharedPref.getBoolean("isLiked", false)
               sharedPref.edit().putBoolean("isLiked", !isLiked).apply()
               val appWidgetManager = AppWidgetManager.getInstance(context)
               val appWidgetIds = appWidgetManager.getAppWidgetIds(ComponentName(context, MusicWidgetProvider::class.java))
               onUpdate(context, appWidgetManager, appWidgetIds)
            }
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(ComponentName(context, MusicWidgetProvider::class.java))
        onUpdate(context, appWidgetManager, appWidgetIds)
    }

    private fun getPendingIntent(context: Context, action: String): PendingIntent {
        val intent = Intent(context, MusicWidgetProvider::class.java)
        intent.action = action
        return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    private fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        try {
            val sharedPref = context.getSharedPreferences("WidgetData", Context.MODE_PRIVATE)
            val title = sharedPref.getString("title", "No Song")
            val artist = sharedPref.getString("artist", "Unknown Artist")
            val isPlaying = sharedPref.getBoolean("isPlaying", false)
            val isLiked = sharedPref.getBoolean("isLiked", false)
            val artworkUriStr = sharedPref.getString("artwork", null)

            val views = RemoteViews(context.packageName, R.layout.widget_music)

            views.setTextViewText(R.id.widget_title, title)
            views.setTextViewText(R.id.widget_artist, artist)

            if (isPlaying) {
                views.setImageViewResource(R.id.widget_btn_play_pause, R.drawable.ic_widget_pause)
            } else {
                views.setImageViewResource(R.id.widget_btn_play_pause, R.drawable.ic_widget_play)
            }

            views.setOnClickPendingIntent(R.id.widget_btn_play_pause, getPendingIntent(context, "com.ram.musicapp.WIDGET_PLAY_PAUSE"))
            views.setOnClickPendingIntent(R.id.widget_btn_next, getPendingIntent(context, "com.ram.musicapp.WIDGET_NEXT"))
            views.setOnClickPendingIntent(R.id.widget_btn_prev, getPendingIntent(context, "com.ram.musicapp.WIDGET_PREVIOUS"))

            // Open app when clicking background
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            if (launchIntent != null) {
                val pendingLaunchIntent = PendingIntent.getActivity(context, 0, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
                views.setOnClickPendingIntent(R.id.widget_container, pendingLaunchIntent)
            }

            // Set placeholder and update immediately
            views.setImageViewResource(R.id.widget_album_art, R.drawable.widget_default_cover)
            appWidgetManager.updateAppWidget(appWidgetId, views)

            // Load Image Asynchronously
            val pkgName = context.packageName
            thread {
                try {
                    var bitmap: Bitmap? = null
                    if (!artworkUriStr.isNullOrEmpty()) {
                        var inputStream: InputStream? = null
                        
                        try {
                            if (artworkUriStr.startsWith("content://") || artworkUriStr.startsWith("file://") || artworkUriStr.startsWith("android.resource://")) {
                                val cleanUriStr = if (artworkUriStr.startsWith("file://file://")) artworkUriStr.replace("file://file://", "file://") else artworkUriStr
                                val uri = Uri.parse(cleanUriStr)
                                inputStream = context.contentResolver.openInputStream(uri)
                            }
                        } catch (e: Exception) {
                            Log.w(TAG, "Failed to open artwork stream: ${e.message}")
                        }
                        
                        if (inputStream != null) {
                            try {
                                bitmap = BitmapFactory.decodeStream(inputStream)
                            } finally {
                                try { inputStream.close() } catch (_: Exception) {}
                            }
                        }
                    }

                    // Create a FRESH RemoteViews for the bitmap update
                    val updatedViews = RemoteViews(pkgName, R.layout.widget_music)

                    // Re-set all text and controls
                    updatedViews.setTextViewText(R.id.widget_title, title)
                    updatedViews.setTextViewText(R.id.widget_artist, artist)

                    if (isPlaying) {
                        updatedViews.setImageViewResource(R.id.widget_btn_play_pause, R.drawable.ic_widget_pause)
                    } else {
                        updatedViews.setImageViewResource(R.id.widget_btn_play_pause, R.drawable.ic_widget_play)
                    }

                    updatedViews.setOnClickPendingIntent(R.id.widget_btn_play_pause, getPendingIntent(context, "com.ram.musicapp.WIDGET_PLAY_PAUSE"))
                    updatedViews.setOnClickPendingIntent(R.id.widget_btn_next, getPendingIntent(context, "com.ram.musicapp.WIDGET_NEXT"))
                    updatedViews.setOnClickPendingIntent(R.id.widget_btn_prev, getPendingIntent(context, "com.ram.musicapp.WIDGET_PREVIOUS"))

                    if (launchIntent != null) {
                        val pendingLaunchIntent = PendingIntent.getActivity(context, 0, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
                        updatedViews.setOnClickPendingIntent(R.id.widget_container, pendingLaunchIntent)
                    }
                    
                    if (bitmap != null) {
                        val scaledArt = getScaledBitmap(bitmap, 200)
                        updatedViews.setImageViewBitmap(R.id.widget_album_art, scaledArt)
                        
                        // Darken background version
                        val darkenedBitmap = darkenBitmap(bitmap)
                        if (darkenedBitmap != null) {
                            updatedViews.setImageViewBitmap(R.id.widget_bg_image, darkenedBitmap)
                        }
                        
                        bitmap.recycle()
                    } else {
                        updatedViews.setImageViewResource(R.id.widget_album_art, R.drawable.widget_default_cover)
                    }
                    
                    appWidgetManager.updateAppWidget(appWidgetId, updatedViews)
                } catch (e: Exception) {
                    Log.e(TAG, "Error updating widget with artwork: ${e.message}")
                    e.printStackTrace()
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in updateAppWidget: ${e.message}")
            e.printStackTrace()
        }
    }

    private fun getScaledBitmap(src: Bitmap, maxSize: Int): Bitmap {
        val ratio = src.width.toFloat() / src.height.toFloat()
        val targetWidth: Int
        val targetHeight: Int
        if (src.width > src.height) {
            targetWidth = maxSize
            targetHeight = (maxSize / ratio).toInt()
        } else {
            targetHeight = maxSize
            targetWidth = (maxSize * ratio).toInt()
        }
        return Bitmap.createScaledBitmap(src, targetWidth, targetHeight, true)
    }

    private fun darkenBitmap(src: Bitmap): Bitmap? {
        return try {
            val scaled = getScaledBitmap(src, 150)
            val config = scaled.config ?: Bitmap.Config.ARGB_8888
            val dest = Bitmap.createBitmap(scaled.width, scaled.height, config)
            val canvas = Canvas(dest)
            canvas.drawBitmap(scaled, 0f, 0f, null)
            canvas.drawColor(Color.parseColor("#CC000000"))
            scaled.recycle()
            dest
        } catch (e: Exception) {
            Log.e(TAG, "Error darkening bitmap: ${e.message}")
            null
        }
    }
}


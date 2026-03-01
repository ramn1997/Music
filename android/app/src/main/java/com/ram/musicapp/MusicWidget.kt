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
import android.view.View
import android.widget.RemoteViews
import java.io.File

class MusicWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        
        val action = intent.action
        if (action == "PLAY_PAUSE" || action == "NEXT" || action == "PREV") {
            // Forward these to the React Native app via a broadcast
            // The app will have a listener to handle these
            val broadcastIntent = Intent("com.ram.musicapp.WIDGET_CONTROL")
            broadcastIntent.putExtra("command", action)
            broadcastIntent.setPackage(context.packageName) // Explicitly target this app's package
            context.sendBroadcast(broadcastIntent)
        }
    }

    companion object {
        fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val prefs = context.getSharedPreferences("MusicWidget", Context.MODE_PRIVATE)
            val title = prefs.getString("title", "No song playing")
            val artist = prefs.getString("artist", "Select a track to start")
            val isPlaying = prefs.getBoolean("isPlaying", false)
            val artworkPath = prefs.getString("artworkPath", null)

            val views = RemoteViews(context.packageName, R.layout.music_widget)
            views.setTextViewText(R.id.widget_title, title)
            views.setTextViewText(R.id.widget_artist, artist)
            
            // Update Play/Pause icon
            views.setImageViewResource(R.id.widget_play_pause, 
                if (isPlaying) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play)

            // Load Artwork safely
            if (artworkPath != null) {
                try {
                    var bitmap: Bitmap? = null
                    when {
                        artworkPath.startsWith("content://") || artworkPath.startsWith("android.resource://") -> {
                            val uri = Uri.parse(artworkPath)
                            bitmap = decodeSampledBitmapFromUri(context, uri, 250, 250)
                        }
                        artworkPath.startsWith("file://") -> {
                            // Strip file:// scheme to get a plain file path
                            val filePath = Uri.parse(artworkPath).path
                            if (filePath != null) {
                                val file = File(filePath)
                                if (file.exists()) {
                                    bitmap = decodeSampledBitmapFromFile(filePath, 250, 250)
                                }
                            }
                        }
                        else -> {
                            val file = File(artworkPath)
                            if (file.exists()) {
                                bitmap = decodeSampledBitmapFromFile(artworkPath, 250, 250)
                            }
                        }
                    }

                    if (bitmap != null) {
                        views.setImageViewBitmap(R.id.widget_artwork, bitmap)
                        views.setImageViewBitmap(R.id.widget_bg_image, bitmap)
                        views.setViewVisibility(R.id.widget_artwork, View.VISIBLE)
                        views.setViewVisibility(R.id.widget_bg_image, View.VISIBLE)
                    } else {
                        views.setImageViewResource(R.id.widget_artwork, R.drawable.placeholder_art)
                        views.setImageViewResource(R.id.widget_bg_image, android.R.color.transparent)
                    }
                } catch (e: Exception) {
                    views.setImageViewResource(R.id.widget_artwork, R.drawable.placeholder_art)
                    views.setImageViewResource(R.id.widget_bg_image, android.R.color.transparent)
                }
            } else {
                views.setImageViewResource(R.id.widget_artwork, R.drawable.placeholder_art)
                views.setImageViewResource(R.id.widget_bg_image, android.R.color.transparent)
            }

            // Set up Click Listeners
            views.setOnClickPendingIntent(R.id.widget_play_pause, getPendingSelfIntent(context, "PLAY_PAUSE"))
            views.setOnClickPendingIntent(R.id.widget_next, getPendingSelfIntent(context, "NEXT"))
            views.setOnClickPendingIntent(R.id.widget_prev, getPendingSelfIntent(context, "PREV"))

            // Click on widget to open app
            val intent = Intent(context, MainActivity::class.java)
            val pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE)
            views.setOnClickPendingIntent(R.id.widget_title, pendingIntent)
            views.setOnClickPendingIntent(R.id.widget_artwork, pendingIntent)



            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        private fun getPendingSelfIntent(context: Context, action: String): PendingIntent {
            val intent = Intent(context, MusicWidget::class.java)
            intent.action = action
            return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_IMMUTABLE)
        }

        fun updateAllWidgets(context: Context) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val ids = appWidgetManager.getAppWidgetIds(ComponentName(context, MusicWidget::class.java))
            for (id in ids) {
                updateAppWidget(context, appWidgetManager, id)
            }
        }

        private fun calculateInSampleSize(options: BitmapFactory.Options, reqWidth: Int, reqHeight: Int): Int {
            val (height: Int, width: Int) = options.run { outHeight to outWidth }
            var inSampleSize = 1

            if (height > reqHeight || width > reqWidth) {
                val halfHeight: Int = height / 2
                val halfWidth: Int = width / 2

                while (halfHeight / inSampleSize >= reqHeight && halfWidth / inSampleSize >= reqWidth) {
                    inSampleSize *= 2
                }
            }

            return inSampleSize
        }

        private fun decodeSampledBitmapFromFile(path: String, reqWidth: Int, reqHeight: Int): Bitmap? {
            return try {
                // First decode with inJustDecodeBounds=true to check dimensions
                val options = BitmapFactory.Options().apply {
                    inJustDecodeBounds = true
                }
                BitmapFactory.decodeFile(path, options)

                // Calculate inSampleSize
                options.inSampleSize = calculateInSampleSize(options, reqWidth, reqHeight)

                // Decode bitmap with inSampleSize set
                options.inJustDecodeBounds = false
                BitmapFactory.decodeFile(path, options)
            } catch (e: Exception) {
                null
            }
        }

        private fun decodeSampledBitmapFromUri(context: Context, uri: Uri, reqWidth: Int, reqHeight: Int): Bitmap? {
            return try {
                var options = BitmapFactory.Options().apply {
                    inJustDecodeBounds = true
                }
                
                context.contentResolver.openInputStream(uri)?.use { 
                    BitmapFactory.decodeStream(it, null, options)
                } ?: return null

                options.inSampleSize = calculateInSampleSize(options, reqWidth, reqHeight)
                options.inJustDecodeBounds = false

                context.contentResolver.openInputStream(uri)?.use {
                    BitmapFactory.decodeStream(it, null, options)
                }
            } catch (e: Exception) {
                null
            }
        }
    }
}

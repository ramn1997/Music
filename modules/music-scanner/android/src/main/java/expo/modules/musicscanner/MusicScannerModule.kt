package expo.modules.musicscanner

import android.content.Context
import android.provider.MediaStore
import android.net.Uri
import android.os.Build
import android.content.Intent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import android.util.Log
import java.io.File

class MusicScannerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MusicScanner")

    AsyncFunction("scanAudioFilesAsync") { promise: Promise ->
      CoroutineScope(Dispatchers.IO).launch {
        try {
          val context: Context = appContext.reactContext ?: throw Exception("React context is null")
          val audioList = mutableListOf<Map<String, Any>>()
          
          val genreMap = HashMap<Long, String>()
          try {
              val genresUri = MediaStore.Audio.Genres.EXTERNAL_CONTENT_URI
              val genresProjection = arrayOf("_id", "name")
              
              context.contentResolver.query(genresUri, genresProjection, null, null, null)?.use { genreCursor ->
                  val idCol = genreCursor.getColumnIndex("_id")
                  val nameCol = genreCursor.getColumnIndex("name")
                  
                  if (idCol != -1 && nameCol != -1) {
                      while (genreCursor.moveToNext()) {
                          val genreId = genreCursor.getLong(idCol)
                          val genreName = genreCursor.getString(nameCol) ?: continue
                          
                          val membersUri = MediaStore.Audio.Genres.Members.getContentUri("external", genreId)
                          val membersProjection = arrayOf("audio_id")
                          
                          context.contentResolver.query(membersUri, membersProjection, null, null, null)?.use { membersCursor ->
                              val audioIdCol = membersCursor.getColumnIndex("audio_id")
                              if (audioIdCol != -1) {
                                  while (membersCursor.moveToNext()) {
                                      genreMap[membersCursor.getLong(audioIdCol)] = genreName
                                  }
                              }
                          }
                      }
                  }
              }
          } catch (e: Exception) {
              Log.e("MusicScanner", "Genre scan sub-query failed: ${e.message}")
          }

          val uri: Uri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
          val projection = arrayOf(
            "_id",
            "_data",
            "_display_name",
            "title",
            "artist",
            "album",
            "duration",
            "date_added",
            "album_id"
          )

          val selection = "is_music != 0"
          
          context.contentResolver.query(uri, projection, selection, null, null)?.use { cursor ->
            val idCol = cursor.getColumnIndexOrThrow("_id")
            val dataCol = cursor.getColumnIndexOrThrow("_data")
            val nameCol = cursor.getColumnIndexOrThrow("_display_name")
            val titleCol = cursor.getColumnIndexOrThrow("title")
            val artistCol = cursor.getColumnIndexOrThrow("artist")
            val albumCol = cursor.getColumnIndexOrThrow("album")
            val durationCol = cursor.getColumnIndexOrThrow("duration")
            val dateAddedCol = cursor.getColumnIndexOrThrow("date_added")
            val albumIdCol = cursor.getColumnIndexOrThrow("album_id")

            while (cursor.moveToNext()) {
              val id = cursor.getLong(idCol)
              val path = cursor.getString(dataCol) ?: ""
              val filename = cursor.getString(nameCol) ?: ""
              val title = cursor.getString(titleCol) ?: filename
              val artist = cursor.getString(artistCol) ?: "Unknown Artist"
              val album = cursor.getString(albumCol) ?: "Unknown Album"
              val duration = cursor.getLong(durationCol)
              val dateAdded = cursor.getLong(dateAddedCol) * 1000 
              val albumId = cursor.getLong(albumIdCol)
              
              val genre = genreMap[id] ?: "Unknown Genre"

              val map = mapOf(
                "id" to id.toString(),
                "uri" to path,
                "filename" to filename,
                "title" to title,
                "artist" to if (artist == "<unknown>") "Unknown Artist" else artist,
                "album" to if (album == "<unknown>") "Unknown Album" else album,
                "duration" to duration,
                "dateAdded" to dateAdded,
                "albumId" to albumId.toString(),
                "genre" to genre
              )
              audioList.add(map)
            }
          }
          promise.resolve(audioList)
        } catch (e: Exception) {
          Log.e("MusicScanner", "Global scan failed: ${e.message}")
          promise.reject("ERR_SCAN", e.message, e)
        }
      }
    }

    // Delete an audio file from device storage and remove from MediaStore
    AsyncFunction("deleteAudioFileAsync") { songId: String, filePath: String, promise: Promise ->
      CoroutineScope(Dispatchers.IO).launch {
        try {
          val context: Context = appContext.reactContext ?: throw Exception("React context is null")
          var deleted = false

          // Method 1: Delete via MediaStore using the song ID (handles scoped storage on Android 10+)
          try {
            val mediaUri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
            val where = "${MediaStore.Audio.Media._ID} = ?"
            val args = arrayOf(songId)
            val rowsDeleted = context.contentResolver.delete(mediaUri, where, args)
            if (rowsDeleted > 0) {
              deleted = true
              Log.d("MusicScanner", "Deleted via MediaStore ID: $songId")
            }
          } catch (e: Exception) {
            Log.w("MusicScanner", "MediaStore delete by ID failed: ${e.message}")
          }

          // Method 2 (fallback): Delete actual file then update MediaStore
          if (!deleted && filePath.isNotEmpty()) {
            try {
              val file = File(filePath)
              if (file.exists() && file.delete()) {
                deleted = true
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                  val selection = "${MediaStore.Audio.Media.DATA} = ?"
                  context.contentResolver.delete(
                    MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                    selection,
                    arrayOf(filePath)
                  )
                } else {
                  @Suppress("DEPRECATION")
                  context.sendBroadcast(
                    Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE, Uri.fromFile(file))
                  )
                }
                Log.d("MusicScanner", "Deleted file directly: $filePath")
              }
            } catch (e: Exception) {
              Log.w("MusicScanner", "Direct file delete failed: ${e.message}")
            }
          }

          if (deleted) {
            promise.resolve(true)
          } else {
            promise.reject("ERR_DELETE", "Could not delete – file may not exist or is protected.", null)
          }
        } catch (e: Exception) {
          Log.e("MusicScanner", "deleteAudioFileAsync failed: ${e.message}")
          promise.reject("ERR_DELETE", e.message, e)
        }
      }
    }
  }
}

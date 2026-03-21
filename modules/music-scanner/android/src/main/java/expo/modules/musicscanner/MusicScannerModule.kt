package expo.modules.musicscanner

import android.content.Context
import android.provider.MediaStore
import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

class MusicScannerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MusicScanner")

    AsyncFunction("scanAudioFilesAsync") { promise: Promise ->
      CoroutineScope(Dispatchers.IO).launch {
        try {
          val context: Context = appContext.reactContext ?: throw Exception("React context is null")
        val audioList = mutableListOf<Map<String, Any>>()
        
        val uri: Uri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
        val projection = arrayOf(
          MediaStore.Audio.Media._ID,
          MediaStore.Audio.Media.DATA,
          MediaStore.Audio.Media.DISPLAY_NAME,
          MediaStore.Audio.Media.TITLE,
          MediaStore.Audio.Media.ARTIST,
          MediaStore.Audio.Media.ALBUM,
          MediaStore.Audio.Media.DURATION,
          MediaStore.Audio.Media.DATE_ADDED,
          MediaStore.Audio.Media.ALBUM_ID,
          MediaStore.Audio.Media.YEAR
        )

        // Only get music files
        val selection = "${MediaStore.Audio.Media.IS_MUSIC} != 0"
        
        context.contentResolver.query(uri, projection, selection, null, null)?.use { cursor ->
          val idCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
          val dataCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATA)
          val nameCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME)
          val titleCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
          val artistCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
          val albumCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
          val durationCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
          val dateAddedCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_ADDED)
          val albumIdCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID)
          val yearCol = cursor.getColumnIndex(MediaStore.Audio.Media.YEAR)

          while (cursor.moveToNext()) {
            val id = cursor.getLong(idCol)
            val path = cursor.getString(dataCol) ?: ""
            val filename = cursor.getString(nameCol) ?: ""
            val title = cursor.getString(titleCol) ?: filename
            val artist = cursor.getString(artistCol) ?: "Unknown Artist"
            val album = cursor.getString(albumCol) ?: "Unknown Album"
            val duration = cursor.getLong(durationCol)
            val dateAdded = cursor.getLong(dateAddedCol) * 1000 // Convert to ms
            val albumId = cursor.getLong(albumIdCol)
            val year = if (yearCol != -1) cursor.getInt(yearCol) else 0

            // Query genre
            var genre: String? = null
            try {
              val genreUri = MediaStore.Audio.Genres.getContentUriForAudioId("external", id.toInt())
              context.contentResolver.query(genreUri, arrayOf(MediaStore.Audio.Genres.NAME), null, null, null)?.use { genreCursor ->
                if (genreCursor.moveToFirst()) {
                  genre = genreCursor.getString(0)
                }
              }
            } catch (e: Exception) { }

            val map = mapOf(
              "id" to id.toString(),
              "uri" to path,
              "filename" to filename,
              "title" to title,
              "artist" to if (artist == "<unknown>") "Unknown Artist" else artist,
              "album" to if (album == "<unknown>") "Unknown Album" else album,
              "genre" to (genre ?: ""),
              "year" to if (year > 0) year.toString() else "",
              "duration" to duration,
              "dateAdded" to dateAdded,
              "albumId" to albumId.toString()
            )
            audioList.add(map)
          }
        }
        
        
          promise.resolve(audioList)
        } catch (e: Exception) {
          promise.reject("ERR_SCAN", e.message, e)
        }
      }
    }
  }
}

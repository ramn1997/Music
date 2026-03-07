package expo.modules.musicscanner

import android.content.Context
import android.provider.MediaStore
import android.net.Uri
import android.media.MediaMetadataRetriever
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
          MediaStore.Audio.Media.ALBUM_ID
        )

        // Only get music files
        val selection = "${MediaStore.Audio.Media.IS_MUSIC} != 0"
        
        context.contentResolver.query(uri, null, selection, null, null)?.use { cursor ->
          val idCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
          val dataCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATA)
          val nameCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME)
          val titleCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
          val artistCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
          val albumCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
          val durationCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
          val dateAddedCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_ADDED)
          val albumIdCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID)
          
          val genreCol = cursor.getColumnIndex("genre_name")
          val yearCol = cursor.getColumnIndex("year")

          val retriever = MediaMetadataRetriever()

          while (cursor.moveToNext()) {
            val id = cursor.getLong(idCol)
            val path = cursor.getString(dataCol) ?: ""
            val filename = cursor.getString(nameCol) ?: ""
            val title = cursor.getString(titleCol) ?: filename
            var artist = cursor.getString(artistCol) ?: "Unknown Artist"
            var album = cursor.getString(albumCol) ?: "Unknown Album"
            val duration = cursor.getLong(durationCol)
            val dateAdded = cursor.getLong(dateAddedCol) * 1000 // Convert to ms
            val albumId = cursor.getLong(albumIdCol)
            
            var genre = "Unknown Genre"
            if (genreCol != -1) {
                val g = cursor.getString(genreCol)
                if (!g.isNullOrEmpty()) genre = g
            }
            
            var year = ""
            if (yearCol != -1) {
                val y = cursor.getString(yearCol)
                if (!y.isNullOrEmpty()) year = y
            }
            
            // Native extremely fast ID3 fallback instead of slow JS expo-music-info-2 loops
            if (genre == "Unknown Genre" || artist == "<unknown>" || artist == "Unknown Artist" || album == "Unknown Album" || year.isEmpty()) {
                try {
                    retriever.setDataSource(path)
                    if (genre == "Unknown Genre") {
                        val g = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_GENRE)
                        if (!g.isNullOrEmpty()) genre = g
                    }
                    if (year.isEmpty()) {
                        val y = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_YEAR)
                        if (!y.isNullOrEmpty()) year = y
                    }
                    if (artist == "<unknown>" || artist == "Unknown Artist") {
                        val a = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST)
                        if (!a.isNullOrEmpty()) artist = a
                    }
                    // For incredibly broken metadata from Android MediaStore, fix Album too
                    if (album == "Unknown Album" || album == "<unknown>") {
                         val al = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUM)
                         if (!al.isNullOrEmpty()) album = al
                    }
                } catch (e: Exception) {
                    // Ignore corrupted files quietly
                }
            }

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
              "genre" to genre,
              "year" to year
            )
            audioList.add(map)
          }
          
          try {
              retriever.release()
          } catch (e: Exception) {}
        }
        
          promise.resolve(audioList)
        } catch (e: Exception) {
          promise.reject("ERR_SCAN", e.message, e)
        }
      }
    }
  }
}

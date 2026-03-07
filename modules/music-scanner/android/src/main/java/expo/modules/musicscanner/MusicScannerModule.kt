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
          
          // Ultra-fast memory map for Genres to avoid O(N) ID3 parsing
          val genreMap = HashMap<Long, String>()
          try {
              val genresUri = MediaStore.Audio.Genres.EXTERNAL_CONTENT_URI
              val genresProjection = arrayOf(MediaStore.Audio.Genres._ID, MediaStore.Audio.Genres.NAME)
              context.contentResolver.query(genresUri, genresProjection, null, null, null)?.use { genreCursor ->
                  val gidCol = genreCursor.getColumnIndexOrThrow(MediaStore.Audio.Genres._ID)
                  val nameCol = genreCursor.getColumnIndexOrThrow(MediaStore.Audio.Genres.NAME)
                  while (genreCursor.moveToNext()) {
                      val genreId = genreCursor.getLong(gidCol)
                      val genreName = genreCursor.getString(nameCol) ?: "Unknown Genre"
                      
                      val membersUri = MediaStore.Audio.Genres.Members.getContentUri("external", genreId)
                      val membersProjection = arrayOf(MediaStore.Audio.Genres.Members.AUDIO_ID)
                      context.contentResolver.query(membersUri, membersProjection, null, null, null)?.use { membersCursor ->
                          val audioIdCol = membersCursor.getColumnIndex(MediaStore.Audio.Genres.Members.AUDIO_ID)
                          if (audioIdCol != -1) {
                              while (membersCursor.moveToNext()) {
                                  val audioId = membersCursor.getLong(audioIdCol)
                                  genreMap[audioId] = genreName
                              }
                          }
                      }
                  }
              }
          } catch (e: Exception) {
              // Ignore, some older devices might block access or throw SecurityException on members
          }

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
          promise.reject("ERR_SCAN", e.message, e)
        }
      }
    }
  }
}

package org.sindibad.android.ui

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.LruCache
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

private object ArtCache {
    val bitmaps = object : LruCache<String, Bitmap>(12 * 1024 * 1024) {
        override fun sizeOf(key: String, value: Bitmap) = value.byteCount
    }
}

/** Only exported bitmap assets cross into the native app; no web engine dependency. */
@Composable
fun SharedArt(id: String, description: String?, modifier: Modifier = Modifier) {
    val context = LocalContext.current.applicationContext
    val bitmap by produceState<ImageBitmap?>(null, id) {
        value = withContext(Dispatchers.IO) {
            val cached = ArtCache.bitmaps.get(id)
            val loaded = cached ?: context.assets.open("png/$id.png").use { BitmapFactory.decodeStream(it) }
                .also { requireNotNull(it) { "Invalid shared art: $id" }; ArtCache.bitmaps.put(id, it) }
            loaded.asImageBitmap()
        }
    }
    Box(modifier) {
        bitmap?.let { Image(it, description, Modifier.fillMaxSize(), contentScale = ContentScale.Fit) }
    }
}

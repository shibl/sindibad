package org.sindibad.android.ui

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.LayoutDirection
import org.sindibad.android.R

val Ink = Color(0xFF3B2414)
val Paper = Color(0xFFFFF7E6)
val Sand = Color(0xFFF0CF8F)
val Sea = Color(0xFF0F4F7A)
val Teal = Color(0xFF147D84)
val Gold = Color(0xFFF2C14E)
val Rose = Color(0xFFD0507E)
val Correct = Color(0xFF246D49)
val ArabicFont = FontFamily(Font(R.font.baloo_arabic_500, FontWeight.Normal), Font(R.font.baloo_arabic_800, FontWeight.Bold))

@Composable
fun SindibadTheme(largeText: Boolean, content: @Composable () -> Unit) {
    val base = Typography()
    val typography = Typography(
        displaySmall = base.displaySmall.copy(fontFamily = ArabicFont, fontWeight = FontWeight.Bold),
        headlineLarge = base.headlineLarge.copy(fontFamily = ArabicFont, fontWeight = FontWeight.Bold),
        headlineMedium = base.headlineMedium.copy(fontFamily = ArabicFont, fontWeight = FontWeight.Bold),
        headlineSmall = base.headlineSmall.copy(fontFamily = ArabicFont, fontWeight = FontWeight.Bold),
        titleLarge = base.titleLarge.copy(fontFamily = ArabicFont, fontWeight = FontWeight.Bold),
        titleMedium = base.titleMedium.copy(fontFamily = ArabicFont, fontWeight = FontWeight.Bold),
        bodyLarge = base.bodyLarge.copy(fontFamily = ArabicFont),
        bodyMedium = base.bodyMedium.copy(fontFamily = ArabicFont),
        bodySmall = base.bodySmall.copy(fontFamily = ArabicFont),
        labelLarge = base.labelLarge.copy(fontFamily = ArabicFont, fontWeight = FontWeight.Bold),
        labelMedium = base.labelMedium.copy(fontFamily = ArabicFont),
        labelSmall = base.labelSmall.copy(fontFamily = ArabicFont),
    )
    val density = LocalDensity.current
    CompositionLocalProvider(
        LocalLayoutDirection provides LayoutDirection.Rtl,
        LocalDensity provides Density(density.density, density.fontScale * if (largeText) 1.18f else 1f),
    ) {
        MaterialTheme(
            colorScheme = lightColorScheme(primary = Teal, onPrimary = Color.White, secondary = Rose, tertiary = Gold,
                background = Sea, surface = Paper, onSurface = Ink, onBackground = Color.White),
            typography = typography, content = content,
        )
    }
}

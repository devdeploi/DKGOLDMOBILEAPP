# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# React Native Core & Native Modules
-keep class com.facebook.react.** { *; }
-keepclassmembers class * implements com.facebook.react.bridge.NativeModule { *; }
-keepclassmembers class * implements com.facebook.react.bridge.JavaScriptModule { *; }
-dontwarn com.facebook.react.**

# Razorpay
-keep class com.razorpay.** { *; }
-dontwarn com.razorpay.**
-keep class com.razorpay.api.CancelReceiver { *; }

# Firebase & Push Notifications (Notifee)
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**
-keep class io.invertase.notifee.** { *; }
-dontwarn io.invertase.notifee.**

# OkHttp & Okio
-keep class okhttp3.** { *; }
-keep class okio.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

# PDF & HTML-to-PDF
-dontwarn com.gemalto.jp2.**
-dontwarn com.tom_roush.pdfbox.**

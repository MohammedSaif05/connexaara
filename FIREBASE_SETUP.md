# Firebase Push Notifications Setup Guide

This guide walks you through the steps required to set up Firebase Cloud Messaging (FCM) for both your NestJS backend and your React Native (Android/iOS) frontend.

## 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project**.
3. Enter your project name (e.g., `Campus Connect`) and click **Continue**.
4. You can enable or disable Google Analytics depending on your preference, then click **Create project**.

---

## 2. Backend Setup (NestJS)

To allow the backend to send push notifications, it needs to authenticate with Firebase using a Service Account Key.

### Generate the Service Account Key
1. In the Firebase Console, go to **Project Overview** > **Project settings** (the gear icon).
2. Navigate to the **Service accounts** tab.
3. Click **Generate new private key**.
4. This will download a `.json` file containing your credentials. Keep this secure!

### Configure the Backend
1. Open your downloaded `.json` file.
2. In your `campus-connect-backend` root folder, either set the path to this JSON file as an environment variable or use the details directly. The standard way locally is to define the `GOOGLE_APPLICATION_CREDENTIALS` environment variable:
   ```env
   # .env
   GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/firebase-service-account.json"
   ```
3. *(Alternative)* If you deploy to a server (like Render, AWS, etc.), set `GOOGLE_APPLICATION_CREDENTIALS` in your environment variables to point to the file, or inject the contents dynamically.

---

## 3. Frontend Setup (React Native)

You must configure both the Android and iOS apps within your Firebase project to receive notifications.

### Android Configuration

1. In your Firebase Console, click the **Android icon** on the Project Overview page to add an Android app.
2. Enter your Android package name. You can find this in `android/app/build.gradle` inside the `defaultConfig` block (usually looks like `com.connexaara`).
3. Click **Register app**.
4. Download the `google-services.json` file.
5. Place this downloaded file in the `android/app/` directory of your `connexaara` React Native project.
   **Path:** `connexaara/android/app/google-services.json`
6. We have already installed `@react-native-firebase/app` and `@react-native-firebase/messaging`. To finalize Android Firebase integration, update your gradle files:

   **In `android/build.gradle`:**
   ```gradle
   buildscript {
     dependencies {
       // Add this line inside dependencies
       classpath 'com.google.gms:google-services:4.4.1'
     }
   }
   ```

   **In `android/app/build.gradle`:**
   ```gradle
   // Add this at the very top or after `apply plugin: "com.android.application"`
   apply plugin: 'com.google.gms.google-services'
   ```

### iOS Configuration (For Later)

1. In your Firebase Console, click the **iOS icon** to add an iOS app.
2. Enter your iOS Bundle ID (found in Xcode or `ios/connexaara.xcodeproj`).
3. Click **Register app**.
4. Download the `GoogleService-Info.plist` file.
5. Open your `ios/connexaara.xcworkspace` in **Xcode**.
6. Drag and drop the `GoogleService-Info.plist` file into your Xcode project tree (ensure "Copy items if needed" is checked).
7. In the Firebase Console **Project settings** > **Cloud Messaging** tab, upload your **APNs Authentication Key** (a `.p8` file generated from your Apple Developer account).

---

## 4. Final Testing

Once the `google-services.json` is in place, you can build and run your React Native app:
```bash
npx react-native run-android
```
- When the app opens, it will automatically register the device and log the FCM Token.
- The token will be sent to your NestJS backend using `POST /users/me/fcm-token`.
- Trigger an event (like requesting an OD or creating an announcement), and your backend will dispatch a push notification which will be displayed by Notifee!

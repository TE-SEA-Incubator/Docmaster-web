# Google Login Integration Guide

## 🎯 Overview
This guide explains how to set up Google OAuth login for your Docmaster application using Firebase Authentication.

## 📋 Prerequisites

### 1. **Firebase Project Setup**
- You already have Firebase configured in your project (see `src/js/firebase.js`)
- Your Firebase config is loaded from `.env` variables

### 2. **Google Cloud Project**
- Create a Google Cloud Project at [Google Cloud Console](https://console.cloud.google.com)
- Enable Google+ API

## 🔧 Setup Steps

### Step 1: Configure Google OAuth in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Authentication** → **Sign-in method**
4. Enable **Google** provider
5. Add your application's SHA-1 fingerprint (for Android) or domain (for Web)
6. Save changes

### Step 2: Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **Credentials**
3. Create **OAuth 2.0 Client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins:
     ```
     http://localhost:5173  (development)
     http://localhost:5000  (backend development)
     https://yourdomain.com (production)
     ```
   - Authorized redirect URIs:
     ```
     http://localhost:5173/login.html
     https://yourdomain.com/login.html
     ```

### Step 3: Update Firebase Configuration

Your `.env` file should already have these variables (they're used by `src/js/firebase.js`):

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### Step 4: Verify Backend Google OAuth Endpoint

The backend automatically handles Google OAuth at:
```
POST /api/auth/google-oauth
```

**Request body:**
```json
{
  "token": "firebase_id_token",
  "email": "user@gmail.com",
  "displayName": "Jean Dupont",
  "photoURL": "https://lh3.googleusercontent.com/..."
}
```

**Response:**
```json
{
  "message": "Google OAuth login successful",
  "user": {
    "id": "uuid",
    "nom": "Dupont",
    "prenom": "Jean",
    "email": "user@gmail.com",
    "role": "USER",
    "photo_url": "https://..."
  },
  "token": "jwt_token"
}
```

## 🚀 Frontend Implementation

### 1. Login Page Already Updated
- `src/login.html` has Google login buttons with `onclick="loginWithGoogle()"`
- Both login and registration forms support Google OAuth

### 2. Google Login Flow

```javascript
// In src/js/services/auth.js
async function loginWithGoogle() {
  // 1. Firebase popup sign-in (handled by Firebase SDK)
  // 2. Get Firebase ID token
  // 3. Send token to backend (/api/auth/google-oauth)
  // 4. Backend verifies token and creates/updates user
  // 5. Store JWT token from backend
  // 6. Redirect to dashboard
}
```

### 3. User Creation
- If user doesn't exist → new account created automatically
- Name is extracted from Google displayName
- Email is marked as verified
- Profile photo is imported from Google
- User is immediately logged in

## 🔒 Security Considerations

### ⚠️ Token Verification (TODO)
Currently, the backend trusts tokens from the frontend. In production, implement Firebase Admin SDK verification:

```typescript
// Install: npm install firebase-admin
import * as admin from 'firebase-admin';

const decodedToken = await admin.auth().verifyIdToken(token);
```

### ✅ Already Implemented
- HTTPS-only cookies
- httpOnly flag for JWT
- SameSite=strict
- 30-day token expiration

## 📱 Testing

### Test Google Login Locally
1. Start development server:
   ```bash
   npm run dev
   ```
2. Navigate to `http://localhost:5173/login.html`
3. Click **Google** button
4. Sign in with Google account
5. Verify redirect to dashboard

### Test User Creation
- First-time Google user → new account created
- Second login → existing account used
- Check database: `SELECT * FROM users WHERE email='your@gmail.com';`

## 🐛 Troubleshooting

### Issue: "Popup blocked" error
**Solution:**
- Google sign-in must be triggered by user click
- Check browser popup blocker settings
- Ensure `googleProvider.setCustomParameters()` is set correctly

### Issue: "auth/operation-not-allowed" error
**Solution:**
- Verify Google is enabled in Firebase Console
- Check if OAuth 2.0 credentials are configured
- Verify authorized origins in Google Cloud Console

### Issue: User created but profile incomplete
**Solution:**
- Google displayName might be empty
- Backend extracts first/last name from displayName
- Fallback names are used: prenom="User", nom="Google"

### Issue: Photo URL not imported
**Solution:**
- Currently only imported on first login
- Google photo URL works for ~24 hours
- Consider implementing photo download/hosting

## 📚 Related Files

- **Frontend config**: `src/js/firebase.js`
- **Frontend login**: `src/js/services/auth.js` → `loginWithGoogle()`
- **Backend endpoint**: `server/src/controllers/auth.controller.ts` → `googleOAuth()`
- **Routes**: `server/src/routes/auth.routes.ts`
- **User service**: `server/src/services/auth.service.ts` → `getUserByEmail()`

## 🔄 User Flow

```
User clicks "Google" button
         ↓
Firebase popup (Google sign-in)
         ↓
User authenticates with Google
         ↓
Firebase returns ID token
         ↓
Frontend sends token + user info to /api/auth/google-oauth
         ↓
Backend verifies token & user existence
         ↓
If new user: Create account automatically
         ↓
Generate JWT token
         ↓
Return user data + JWT
         ↓
Frontend stores JWT
         ↓
Redirect to dashboard
```

## 📝 Next Steps

1. ✅ **Immediate**: Add firebase-admin SDK for token verification
2. ✅ **Soon**: Implement Apple Sign-in (similar flow)
3. ✅ **Later**: Download and host Google profile photos locally
4. ✅ **Later**: Add email verification for non-Google users

## 🆘 Support

For Firebase/Google OAuth issues:
- [Firebase Docs](https://firebase.google.com/docs)
- [Google Sign-In Guide](https://developers.google.com/identity/sign-in)
- [Firebase Auth Errors](https://firebase.google.com/docs/auth/troubleshooting)

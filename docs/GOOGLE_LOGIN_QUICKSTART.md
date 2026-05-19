# 🚀 Google Login Quick Start

## What's New?
Google Sign-In is now fully integrated with your Docmaster app! Users can login/register with just one click.

## 🎯 Quick Setup (5 minutes)

### Step 1: Get Firebase Credentials
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (or create new one)
3. Go to **Project Settings** (gear icon)
4. Copy all values from **Web API Key** section:
   ```
   API Key → VITE_FIREBASE_API_KEY
   Auth Domain → VITE_FIREBASE_AUTH_DOMAIN
   Project ID → VITE_FIREBASE_PROJECT_ID
   Storage Bucket → VITE_FIREBASE_STORAGE_BUCKET
   Messaging Sender ID → VITE_FIREBASE_MESSAGING_SENDER_ID
   App ID → VITE_FIREBASE_APP_ID
   Measurement ID → VITE_FIREBASE_MEASUREMENT_ID
   ```

### Step 2: Enable Google Sign-In in Firebase
1. In Firebase Console → **Authentication**
2. Go to **Sign-in method** tab
3. Click **Google** → Enable it → Save

### Step 3: Create .env File
```bash
# Copy template
cp .env.example .env

# Edit .env and paste your Firebase credentials
VITE_FIREBASE_API_KEY=YOUR_VALUE_HERE
VITE_FIREBASE_AUTH_DOMAIN=YOUR_VALUE_HERE
# ... paste all other values
```

### Step 4: That's it! 🎉
```bash
npm run dev                    # Frontend
npm run --prefix server dev    # Backend (in another terminal)
```

Visit `http://localhost:5173/login.html` and try the Google button!

## 📱 User Experience

### First Time User
```
Click Google → 
Sign in with Gmail → 
Account created automatically → 
Redirected to dashboard ✨
```

### Returning User
```
Click Google → 
Sign in with Gmail → 
Redirected to dashboard ✨
```

## 🔧 What Gets Created Automatically

When a user logs in with Google for the first time:

```sql
INSERT INTO users (
  nom,           -- Last name from Google profile
  prenom,        -- First name from Google profile
  email,         -- Gmail address
  photo_url,     -- Google profile picture
  is_verified,   -- TRUE (auto-verified via Google)
  role,          -- 'USER' (default)
  points,        -- 0
  wallet_balance -- 0.00
) VALUES (...)
```

## 🎨 Frontend Files Modified

### `src/js/firebase.js`
- Added Google Auth Provider
- Configured Firebase authentication

### `src/js/services/auth.js`
- New `loginWithGoogle()` function
- Handles popup, token exchange, session management

### `src/login.html`
- Google buttons now have `onclick="loginWithGoogle()"`

## ⚙️ Backend Files Modified

### `server/src/routes/auth.routes.ts`
- New route: `POST /api/auth/google-oauth`

### `server/src/controllers/auth.controller.ts`
- New method: `googleOAuth()`
- Creates/updates users
- Generates JWT token

### `server/src/services/auth.service.ts`
- New method: `getUserByEmail()`
- Finds existing users

## 🔄 How It Works (Technical)

```
Frontend:
  1. User clicks "Google"
  2. Firebase popup opens
  3. User authenticates with Google
  4. Firebase gives us ID token
  5. Send token to backend

Backend:
  1. Receive token + email + name
  2. Check if user exists in database
  3. If not → Create new user automatically
  4. Generate JWT token
  5. Return JWT + user data

Frontend:
  1. Save JWT to localStorage
  2. Show success message
  3. Redirect to dashboard
```

## ✅ Testing Checklist

- [ ] Updated `.env` with Firebase credentials
- [ ] Ran `npm run dev` (frontend)
- [ ] Ran `npm run --prefix server dev` (backend)
- [ ] Opened `http://localhost:5173/login.html`
- [ ] Clicked "Google" button
- [ ] Successfully signed in with Gmail
- [ ] Redirected to dashboard
- [ ] Checked database: `SELECT * FROM users WHERE email='your@gmail.com';`
- [ ] Logged out and logged back in with Google
- [ ] Verified same account was used (no duplicate)

## 🚨 Common Issues

### "Popup Blocked"
→ Browser blocked the popup. Check browser settings.

### "Invalid API key"
→ Check Firebase credentials in `.env` file.

### "Email already exists" (when creating account)
→ User already signed up via regular form with same email.
→ Solution: Delete account or use different email.

### "User created but no profile photo"
→ Google photo URL works for ~24 hours.
→ TODO: We'll download and host photos later.

## 📚 Full Documentation

- **Setup Guide**: See `GOOGLE_LOGIN_SETUP.md`
- **Implementation Details**: See `GOOGLE_LOGIN_IMPLEMENTATION.md`
- **Environment Variables**: See `.env.example`

## 🎯 Next Steps

1. ✅ **Test locally** - Sign in with your Gmail
2. ⏭️ **Deploy to production** - Update CORS and authorized origins
3. ⏭️ **Add Apple Sign-In** - Same pattern as Google
4. ⏭️ **Download Google photos** - Store locally instead of external URL

## 💡 Features Included

✅ One-click Google login
✅ Automatic user creation
✅ Auto-verified accounts
✅ Profile photo import
✅ Secure JWT tokens
✅ HTTP-only cookies
✅ Both login & signup support
✅ Mobile responsive
✅ Error handling with modals
✅ Loading states on buttons

## 🔐 Security

✅ HTTPS-only cookies (production)
✅ HttpOnly flag (XSS protection)
✅ SameSite=strict (CSRF protection)
✅ 30-day token expiry
✅ Secure password hashing (Argon2)
✅ Role-based access control

## 📞 Need Help?

1. Check `GOOGLE_LOGIN_SETUP.md` for detailed troubleshooting
2. Read Firebase docs: https://firebase.google.com/docs
3. Check Google Sign-In guide: https://developers.google.com/identity/sign-in

---

**That's it!** Your app now has Google Sign-In. 🎉

Login with Google on the login page to test it!

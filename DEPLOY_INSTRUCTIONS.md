# 🚀 Deployment Instructions - Avatar Fix

## Quick Summary
We've fixed the custom avatar upload system that was causing huge data URLs and ERR_INVALID_URL errors. The fixes include image compression, proper Firebase Storage upload, and better error handling.

## Step 1: Update Firebase Rules

### 1.1 Update Storage Rules
1. Go to **Firebase Console** → **Storage** → **Rules**
2. Replace the entire rules content with:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    match /avatars/{filename} {
      allow read: if true;
      allow write: if
        // File size limit: 2MB max for better performance
        request.resource.size < 2 * 1024 * 1024 &&
        
        // Only allow image file types
        request.resource.contentType.matches('image/.*') &&
        
        // Updated filename format to match new generation pattern
        // Supports both old and new formats:
        // Old: dev_kb7oh34hr5g_mgpsrkrd_1234567890.png
        // New: dev12345_abc123_def4.png
        filename.matches('^[a-zA-Z0-9_.-]+\\.(png|jpg|jpeg|gif|webp)$') &&
        
        // Ensure filename starts with valid device ID pattern (more flexible)
        (filename.matches('^dev_[a-zA-Z0-9_].*') || 
         filename.matches('^[a-zA-Z0-9]{1,8}_[a-zA-Z0-9]+_[a-zA-Z0-9]+\\.(png|jpg|jpeg|gif|webp)$'));
    }
    
    // Allow reading of any cached/processed images
    match /processed/{allPaths=**} {
      allow read: if true;
      allow write: if false; // Only Firebase Functions can write processed images
    }
    
    // Allow reading of thumbnails
    match /thumbnails/{allPaths=**} {
      allow read: if true;
      allow write: if false; // Only Firebase Functions can write thumbnails
    }
  }
}
```

3. Click **Publish**

### 1.2 Update Firestore Rules
1. Go to **Firebase Console** → **Firestore Database** → **Rules**
2. Replace the entire rules content with:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /leaderboard/{docId} {
      allow read: if true;
      allow write: if
        // Basic rate limiting: allow if no previous document or sufficient time has passed
        (resource == null || 
         request.time > resource.data.updatedAt + duration.value(5, 's')) &&
        
        // Validate required fields and data types
        request.resource.data.keys().hasOnly(['name','packets','avatar','updatedAt','deviceId']) &&
        
        // Name validation
        request.resource.data.name is string &&
        request.resource.data.name.size() > 0 &&
        request.resource.data.name.size() <= 30 &&
        
        // Packets validation
        request.resource.data.packets is int &&
        request.resource.data.packets >= 0 &&
        request.resource.data.packets <= 10000000000 &&
        
        // Updated avatar validation - increased data URL limit to 200KB
        // Supports Firebase Storage URLs, DiceBear URLs, and compressed data URLs
        (!('avatar' in request.resource.data) || 
         (request.resource.data.avatar is string && 
          (request.resource.data.avatar.size() == 0 || 
           request.resource.data.avatar.matches('^https://firebasestorage\\.googleapis\\.com/.*') ||
           request.resource.data.avatar.matches('^https://api\\.dicebear\\.com/.*') ||
           (request.resource.data.avatar.matches('^data:image/.*') && 
            request.resource.data.avatar.size() <= 200000)))) &&
        
        // DeviceId validation - must be present and valid format
        request.resource.data.deviceId is string &&
        request.resource.data.deviceId.size() > 0 &&
        request.resource.data.deviceId.size() <= 100 &&
        request.resource.data.deviceId.matches('^dev_[a-zA-Z0-9_]+$') &&
        
        // UpdatedAt must be a server timestamp
        request.resource.data.updatedAt == request.time;
    }
  }
}
```

3. Click **Publish**

## Step 2: Deploy Code Changes

The code changes are already applied to these files:
- ✅ `main.js` - Image compression and validation
- ✅ `src/leaderboard/firebase.mjs` - Fixed Storage API and upload logic

## Step 3: Test the Fixes

### 3.1 Basic Testing
1. Open `avatar-fix-test.html` in your browser
2. Verify all tests pass
3. Upload a test image and confirm compression works

### 3.2 Live Testing
1. Go to your game → Profile → Edit Profile
2. Click "Upload Picture"
3. Select an image (try different sizes/formats)
4. Verify you see "Avatar uploaded successfully!" message
5. Save profile and check avatar appears in leaderboard

### 3.3 Verify Console Logs
**Good logs to see:**
- `[Leaderboard] Avatar uploaded successfully:`
- `[Leaderboard] Avatar processed successfully: storage_url`
- `Avatar uploaded successfully!` (user notification)

**Bad logs should be gone:**
- ❌ `net::ERR_INVALID_URL`
- ❌ `Avatar failed to load for [username], using default`
- ❌ Huge base64 strings in console

## Step 4: Monitor for Issues

### First 24 Hours
- Watch for any console errors
- Check that new avatars upload properly  
- Verify existing users can still see their avatars
- Confirm leaderboard displays correctly

### Performance Checks
- Avatar loading should be fast (< 1 second)
- No browser lag during uploads
- Leaderboard renders smoothly

## Step 5: Rollback Plan (If Needed)

If critical issues occur:

1. **Immediate Rollback** - Revert Firebase rules to previous version
2. **Code Rollback** - Comment out new upload logic in main.js:
   ```javascript
   // Temporarily disable new avatar upload
   // fileInput.onchange = function () { ... }
   ```
3. **Investigate** - Use avatar-fix-test.html to debug
4. **Fix & Redeploy** - Address issues and test again

## Expected Results ✅

After deployment:
- ✅ Custom avatars upload in < 5 seconds
- ✅ Avatar file sizes under 100KB 
- ✅ No console errors about invalid URLs
- ✅ Existing avatars continue working
- ✅ Shop avatars unaffected
- ✅ Packet syncing works normally
- ✅ Leaderboard displays all avatars correctly

## Troubleshooting

### Issue: Upload fails with permission error
- Check Firebase Storage rules are published
- Verify filename format matches rules

### Issue: Avatar doesn't appear in leaderboard
- Check browser console for errors
- Verify Firestore rules allow 200KB data URLs
- Test with avatar-fix-test.html

### Issue: Old avatars broken
- Old large data URLs will be automatically migrated
- If migration fails, users can re-upload
- Default avatars are used as fallback

## Success Criteria

The deployment is successful when:
1. New users can upload custom avatars without errors
2. Existing users retain their custom avatars
3. All avatars display properly in leaderboard and profile
4. No performance degradation
5. Console shows clean logs without URL errors

---

**Deployment Date**: _______________
**Deployed By**: _______________  
**Status**: [ ] Success [ ] Issues [ ] Rollback Required
**Notes**: ___________________________________________________
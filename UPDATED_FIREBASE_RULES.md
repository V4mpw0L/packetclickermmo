# 🔧 Updated Firebase Rules for Avatar Fix

## Storage Rules (Copy this to Firebase Console → Storage → Rules)

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

## Firestore Database Rules (Copy this to Firebase Console → Firestore → Rules)

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

## Key Changes Made

### Storage Rules Changes:
1. **Relaxed filename validation** - Now accepts both old and new filename formats
2. **More flexible device ID matching** - Supports shortened device IDs from compression
3. **Backward compatibility** - Old avatars will continue to work

### Firestore Rules Changes:
1. **Increased data URL limit** - From 50KB to 200KB to match code changes
2. **Maintained all other validation** - Packets, name, deviceId rules unchanged
3. **Preserved rate limiting** - 5-second cooldown still enforced

### Compatibility Notes:
- ✅ **Existing custom avatars will continue working**
- ✅ **Shop avatars (DiceBear) remain unchanged**
- ✅ **Packet syncing completely unaffected**
- ✅ **All current users maintain their progress**
- ✅ **New compressed avatars will upload successfully**

## Deployment Instructions:

1. **Storage Rules**: 
   - Go to Firebase Console → Storage → Rules
   - Replace existing rules with the Storage section above
   - Click "Publish"

2. **Firestore Rules**:
   - Go to Firebase Console → Firestore Database → Rules  
   - Replace existing rules with the Firestore section above
   - Click "Publish"

3. **Test**:
   - Upload a custom avatar to verify it works
   - Check that existing avatars still display
   - Confirm leaderboard updates normally

The rules are now optimized for the new compressed avatar system while maintaining full backward compatibility! 🚀
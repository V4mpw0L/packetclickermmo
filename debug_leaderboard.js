// Debug script to test Firestore leaderboard data
console.log("[DEBUG] Starting Firestore leaderboard debug...");

async function debugFirestoreData() {
  try {
    // Wait for Leaderboard to be available
    if (typeof Leaderboard === 'undefined') {
      console.log("[DEBUG] Waiting for Leaderboard...");
      setTimeout(debugFirestoreData, 1000);
      return;
    }

    console.log("[DEBUG] Leaderboard available, testing...");

    // Get raw Firestore data
    const { collection, getDocs, query, orderBy, limit } = window.firebase?.firestore || {};

    if (!collection) {
      console.log("[DEBUG] Firestore not available yet");
      return;
    }

    const db = window.firebase.firestore();
    const q = query(
      collection(db, 'leaderboard'),
      orderBy('packets', 'desc'),
      limit(10)
    );

    const snapshot = await getDocs(q);

    console.log("[DEBUG] Raw Firestore documents:");
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`[DEBUG] Document ${doc.id}:`, {
        name: data.name,
        packets: data.packets,
        level: data.level,
        prestigeLevel: data.prestigeLevel,
        levelType: typeof data.level,
        prestigeType: typeof data.prestigeLevel,
        hasLevel: 'level' in data,
        hasPrestige: 'prestigeLevel' in data,
        allKeys: Object.keys(data)
      });
    });

  } catch (error) {
    console.error("[DEBUG] Error:", error);
  }
}

// Auto-run when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', debugFirestoreData);
} else {
  debugFirestoreData();
}

// Also expose as global function
window.debugLeaderboard = debugFirestoreData;

console.log("[DEBUG] Debug script loaded. Call window.debugLeaderboard() to test manually.");

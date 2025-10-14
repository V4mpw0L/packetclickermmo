/**
 * PacketClickerMMO Favicon Refresh - packet.webp focused
 * Forces browsers to use packet.webp as favicon and installation icon
 */

(function () {
  "use strict";

  console.log("[PacketClickerMMO] Refreshing favicon to packet.webp...");

  // Remove all existing favicon links
  const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
  existingFavicons.forEach((link) => {
    if (link.parentNode) {
      link.parentNode.removeChild(link);
    }
  });

  // Cache-busting timestamp
  const timestamp = Date.now();

  // Create packet.webp favicon links (prioritized)
  const faviconLinks = [
    {
      rel: "icon",
      type: "image/webp",
      href: `src/assets/packet.webp?t=${timestamp}`,
      sizes: "30x30",
    },
    {
      rel: "shortcut icon",
      type: "image/webp",
      href: `src/assets/packet.webp?t=${timestamp}`,
      sizes: "30x30",
    },
    {
      rel: "icon",
      type: "image/png",
      href: `src/assets/packet-512.png?t=${timestamp}`,
      sizes: "512x512",
    },
    {
      rel: "apple-touch-icon",
      type: "image/png",
      href: `src/assets/packet-512.png?t=${timestamp}`,
      sizes: "512x512",
    },
  ];

  // Add new favicon links to head
  faviconLinks.forEach((config) => {
    const link = document.createElement("link");
    link.rel = config.rel;
    link.type = config.type;
    link.href = config.href;
    if (config.sizes) {
      link.sizes = config.sizes;
    }

    // Insert at beginning of head for priority
    document.head.insertBefore(link, document.head.firstChild);
    console.log(
      `[PacketClickerMMO] Added favicon: ${config.rel} -> ${config.href}`,
    );
  });

  // Force title refresh to trigger favicon reload
  setTimeout(() => {
    const originalTitle = document.title;
    document.title = originalTitle + " ";
    setTimeout(() => {
      document.title = originalTitle;
      console.log("[PacketClickerMMO] Favicon refresh complete! 📦");
    }, 50);
  }, 100);

  // Preload packet.webp to ensure it's cached
  const preload = document.createElement("link");
  preload.rel = "preload";
  preload.as = "image";
  preload.type = "image/webp";
  preload.href = `src/assets/packet.webp?t=${timestamp}`;
  document.head.appendChild(preload);
})();

// Export for console access
window.refreshPacketFavicon = () => {
  location.reload(true); // Hard reload to ensure favicon refresh
};

console.log(
  "[PacketClickerMMO] Use refreshPacketFavicon() to force reload with packet icon",
);

const YOUTUBE_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

export function extractYouTubeVideoId(value: string) {
  const candidate = value.trim();
  if (YOUTUBE_VIDEO_ID_PATTERN.test(candidate)) return candidate;

  try {
    const url = new URL(candidate);
    const hostname = url.hostname.toLowerCase();
    let videoId = "";

    if (hostname === "youtu.be" || hostname === "www.youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0] || "";
    } else if (YOUTUBE_HOSTS.has(hostname)) {
      const pathSegments = url.pathname.split("/").filter(Boolean);
      videoId = url.searchParams.get("v") || (pathSegments[0] && ["embed", "shorts", "live"].includes(pathSegments[0]) ? pathSegments[1] || "" : "");
    }

    return YOUTUBE_VIDEO_ID_PATTERN.test(videoId) ? videoId : null;
  } catch {
    return null;
  }
}

export function getYouTubeWatchUrl(videoId: string) {
  const normalizedVideoId = extractYouTubeVideoId(videoId);
  return normalizedVideoId ? `https://www.youtube.com/watch?v=${normalizedVideoId}` : "";
}

export function getYouTubeThumbnailUrl(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

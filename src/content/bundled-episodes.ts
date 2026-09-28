import "server-only";
import geminiContent from "./gemini-content.json";
import museContent from "./muse-content.json";

// Newest episode first; each episode's projects retain their prompt order.
export const bundledEpisodes = [geminiContent, museContent];

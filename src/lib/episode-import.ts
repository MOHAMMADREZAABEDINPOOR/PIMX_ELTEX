export type ParsedEpisodePrompt = {
  number: number;
  title: string;
  content: string;
};

export function parsePromptDocument(source: string): ParsedEpisodePrompt[] {
  const matches = Array.from(source.matchAll(/^PROMPT\s+(\d+)\s+[—–-]\s*(.+)$/gim));
  return matches.map((match, index) => ({
    number: Number(match[1]),
    title: match[2].trim().replace(/\s+/g, " "),
    content: source.slice((match.index ?? 0) + match[0].length, matches[index + 1]?.index ?? source.length).trim(),
  }));
}

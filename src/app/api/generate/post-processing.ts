export function cleanupContent(content: string): string {
  // Remove common AI artifacts
  let cleanedContent = content.replace(/(\"|\\“|\\”)/g, ''); // Remove quotes
  cleanedContent = cleanedContent.replace(/\\s-\\s/g, ' '); // Remove spaced hyphens
  cleanedContent = cleanedContent.replace(/\\n{3,}/g, '\\n\\n'); // Limit consecutive newlines

  // Add slight syntactic randomness
  const randomEnding = Math.random() > 0.5 ? '.' : '';
  cleanedContent = cleanedContent.trim() + randomEnding;

  return cleanedContent;
}

export function formatPost(content: string): string {
  return cleanupContent(content).substring(0, 280);
}

export function formatThread(content: string): string {
  const tweets = content.split('\\n\\n').slice(0, 8);
  return tweets.map((tweet, index) => {
    return `${index + 1}/${tweets.length}\\n${cleanupContent(tweet)}`;
  }).join('\\n\\n');
}

export function formatLongForm(content: string): string {
  return cleanupContent(content);
}
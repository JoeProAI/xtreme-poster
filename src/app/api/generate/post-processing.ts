export function cleanupContent(content: string): string {
  // Remove common AI artifacts and formatting issues
  let cleanedContent = content.replace(/(\"|\\"|\\")/g, ''); // Remove quotes
  cleanedContent = cleanedContent.replace(/[-–—]/g, '•'); // Replace all dash types with bullets
  cleanedContent = cleanedContent.replace(/\s-\s/g, ' '); // Remove spaced hyphens
  cleanedContent = cleanedContent.replace(/\n{3,}/g, '\n\n'); // Limit consecutive newlines
  
  // Limit emoticons to maximum 2 per post
  const emojiMatches = cleanedContent.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || [];
  if (emojiMatches.length > 2) {
    // Keep only first 2 emojis
    let emojiCount = 0;
    cleanedContent = cleanedContent.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, (match) => {
      emojiCount++;
      return emojiCount <= 2 ? match : '';
    });
  }

  return cleanedContent;
}

export function formatPost(content: string): string {
  return cleanupContent(content).substring(0, 280);
}

export function formatThread(content: string): string {
  const tweets = content.split('\n\n').slice(0, 8);
  return tweets.map((tweet, index) => {
    return `${index + 1}/${tweets.length}\n${cleanupContent(tweet)}`;
  }).join('\n\n');
}

export function formatLongForm(content: string): string {
  return cleanupContent(content);
}
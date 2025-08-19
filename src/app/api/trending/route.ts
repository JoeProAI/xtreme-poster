import { NextResponse } from 'next/server';

// Cache for trending data to avoid excessive API calls
let trendingCache: any = null;
let lastFetch = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

const getTrendingTopics = async () => {
  const now = Date.now();
  
  // Return cached data if still fresh
  if (trendingCache && (now - lastFetch) < CACHE_DURATION) {
    return trendingCache;
  }

  try {
    // Try to fetch live trending data from multiple sources
    const trendingData = await fetchLiveTrendingData();
    
    trendingCache = trendingData;
    lastFetch = now;
    
    return trendingData;
  } catch (error) {
    console.error('Failed to fetch live trending data:', error);
    
    // Fallback to curated trending topics if APIs fail
    return getFallbackTrendingData();
  }
};

const fetchLiveTrendingData = async () => {
  const promises = [];
  
  // Fetch from News API for current events
  if (process.env.NEWS_API_KEY) {
    promises.push(fetchNewsApiTrends());
  }
  
  // Fetch from Reddit API for trending topics
  promises.push(fetchRedditTrends());
  
  // Fetch from Google Trends (free tier)
  promises.push(fetchGoogleTrends());
  
  const results = await Promise.allSettled(promises);
  
  // Combine all successful results
  let combinedHashtags: string[] = [];
  let combinedTopics: string[] = [];
  let combinedEvents: string[] = [];
  
  results.forEach((result) => {
    if (result.status === 'fulfilled' && result.value) {
      combinedHashtags.push(...(result.value.hashtags || []));
      combinedTopics.push(...(result.value.topics || []));
      combinedEvents.push(...(result.value.currentEvents || []));
    }
  });
  
  return {
    hashtags: [...new Set(combinedHashtags)].slice(0, 30),
    topics: [...new Set(combinedTopics)].slice(0, 20),
    currentEvents: [...new Set(combinedEvents)].slice(0, 15),
    lastUpdated: new Date().toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
    source: 'live'
  };
};

const fetchNewsApiTrends = async () => {
  const response = await fetch(
    `https://newsapi.org/v2/top-headlines?country=us&apiKey=${process.env.NEWS_API_KEY}`
  );
  
  if (!response.ok) throw new Error('News API failed');
  
  const data = await response.json();
  
  return {
    topics: data.articles?.slice(0, 10).map((article: any) => 
      article.title.split(' - ')[0].substring(0, 60)
    ) || [],
    currentEvents: data.articles?.slice(0, 5).map((article: any) => 
      article.description?.substring(0, 100)
    ).filter(Boolean) || [],
    hashtags: extractHashtagsFromText(data.articles?.map((a: any) => a.title).join(' ') || '')
  };
};

const fetchRedditTrends = async () => {
  const response = await fetch('https://www.reddit.com/r/all/hot.json?limit=25');
  
  if (!response.ok) throw new Error('Reddit API failed');
  
  const data = await response.json();
  
  const posts = data.data?.children || [];
  
  return {
    topics: posts.slice(0, 10).map((post: any) => 
      post.data.title.substring(0, 60)
    ),
    hashtags: extractHashtagsFromText(posts.map((p: any) => p.data.title).join(' ')),
    currentEvents: posts.slice(0, 5).map((post: any) => 
      post.data.selftext?.substring(0, 100)
    ).filter(Boolean)
  };
};

const fetchGoogleTrends = async () => {
  // Using Google Trends RSS feed (free)
  const response = await fetch('https://trends.google.com/trends/trendingsearches/daily/rss?geo=US');
  
  if (!response.ok) throw new Error('Google Trends failed');
  
  const xmlText = await response.text();
  
  // Simple XML parsing for trending searches
  const trends = xmlText.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g) || [];
  
  return {
    topics: trends.slice(1, 11).map(trend => 
      trend.replace(/<title><!\[CDATA\[/, '').replace(/\]\]><\/title>/, '').substring(0, 60)
    ),
    hashtags: extractHashtagsFromTrends(trends),
    currentEvents: trends.slice(1, 6).map(trend => 
      trend.replace(/<title><!\[CDATA\[/, '').replace(/\]\]><\/title>/, '').substring(0, 100)
    )
  };
};

const extractHashtagsFromText = (text: string): string[] => {
  const words = text.toLowerCase().split(/\s+/);
  const hashtags: string[] = [];
  
  // Convert trending words to hashtags
  const trendingWords = ['ai', 'tech', 'crypto', 'climate', 'startup', 'innovation', 'business', 'marketing'];
  
  words.forEach(word => {
    const cleanWord = word.replace(/[^a-z]/g, '');
    if (trendingWords.includes(cleanWord) || cleanWord.length > 6) {
      hashtags.push(`#${cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1)}`);
    }
  });
  
  return [...new Set(hashtags)].slice(0, 10);
};

const extractHashtagsFromTrends = (trends: string[]): string[] => {
  return trends.slice(0, 10).map(trend => {
    const cleanTrend = trend.replace(/<[^>]*>/g, '').replace(/[^a-zA-Z\s]/g, '').trim();
    const words = cleanTrend.split(' ').filter(w => w.length > 3);
    return `#${words[0]?.charAt(0).toUpperCase()}${words[0]?.slice(1)}` || '#Trending';
  }).filter(Boolean);
};

const getFallbackTrendingData = () => {
  const currentHour = new Date().getHours();
  const currentDay = new Date().getDay();
  
  // Time-based trending topics
  let timeBasedTopics = [];
  if (currentHour < 12) {
    timeBasedTopics = ['Morning productivity tips', 'Coffee culture trends', 'Early bird success stories'];
  } else if (currentHour < 17) {
    timeBasedTopics = ['Afternoon motivation', 'Lunch break innovations', 'Midday market updates'];
  } else {
    timeBasedTopics = ['Evening routines', 'After-work side hustles', 'Night owl productivity'];
  }
  
  // Day-based trending topics
  let dayBasedTopics: string[] = [];
  if (currentDay === 1) { // Monday
    dayBasedTopics = ['Monday motivation', 'Week planning strategies', 'Fresh start mindset'];
  } else if (currentDay === 5) { // Friday
    dayBasedTopics = ['Friday wins', 'Weekend planning', 'Work-life balance'];
  }
  
  return {
    hashtags: [
      '#AI', '#TechNews', '#Innovation', '#Startup', '#Productivity',
      '#Marketing', '#SocialMedia', '#Business', '#Leadership', '#Growth',
      '#Crypto', '#Web3', '#Sustainability', '#RemoteWork', '#Success'
    ],
    topics: [
      ...timeBasedTopics,
      ...dayBasedTopics,
      'AI breakthrough announcements',
      'Startup funding news',
      'Tech industry updates',
      'Cryptocurrency market trends',
      'Climate innovation solutions',
      'Remote work best practices',
      'Social media algorithm changes',
      'Digital transformation stories'
    ],
    currentEvents: [
      'Breaking tech industry news',
      'Market volatility updates',
      'Innovation announcements',
      'Celebrity business ventures',
      'Viral social media moments',
      'Economic policy changes'
    ],
    lastUpdated: new Date().toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
    source: 'fallback'
  };
};

export async function GET() {
  try {
    const trendingData = await getTrendingTopics();
    
    return NextResponse.json({
      success: true,
      data: trendingData
    });
  } catch (error) {
    console.error('Error fetching trending data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending data' },
      { status: 500 }
    );
  }
}

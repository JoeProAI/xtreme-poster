import { NextResponse } from 'next/server';

// Mock trending data - in production, this would connect to real APIs
const getTrendingTopics = async () => {
  const currentDate = new Date().toISOString().split('T')[0];
  
  // Simulate trending topics based on current events and popular themes
  const trendingData = {
    hashtags: [
      '#AI', '#TechNews', '#Innovation', '#Startup', '#Productivity',
      '#Marketing', '#SocialMedia', '#Business', '#Leadership', '#Growth',
      '#Crypto', '#Web3', '#NFT', '#Blockchain', '#DeFi',
      '#Climate', '#Sustainability', '#GreenTech', '#CleanEnergy',
      '#RemoteWork', '#WFH', '#DigitalNomad', '#CareerTips',
      '#Fitness', '#Wellness', '#MentalHealth', '#SelfCare',
      '#Education', '#Learning', '#Skills', '#PersonalDevelopment'
    ],
    topics: [
      'Artificial Intelligence breakthrough',
      'New startup funding rounds',
      'Tech layoffs and hiring trends',
      'Cryptocurrency market movements',
      'Climate change solutions',
      'Remote work productivity tips',
      'Social media algorithm changes',
      'Electric vehicle adoption',
      'Space exploration updates',
      'Cybersecurity threats',
      'Mental health awareness',
      'Sustainable business practices',
      'Digital transformation',
      'Creator economy growth',
      'Web3 and metaverse developments'
    ],
    currentEvents: [
      'Major tech conference announcements',
      'Economic market fluctuations',
      'Political policy changes affecting business',
      'Celebrity endorsements and controversies',
      'Viral social media trends',
      'Breaking news in technology',
      'Sports events and outcomes',
      'Entertainment industry updates',
      'Health and wellness discoveries',
      'Environmental initiatives'
    ]
  };

  return {
    ...trendingData,
    lastUpdated: currentDate,
    timestamp: new Date().toISOString()
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

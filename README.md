# X-Banger Creator

An AI-powered social media content creation tool built with Next.js 15+ that generates engaging X (Twitter) posts using advanced AI models.

## Features

- 🤖 **AI-Powered Content Generation** - Leverages OpenAI and XAI models
- 🎯 **Style-Aware Posting** - Uses curated style corpus for authentic content
- ⚡ **Modern Tech Stack** - Next.js 15+ with App Router and TypeScript
- 🎨 **Tailwind CSS** - Beautiful, responsive UI design
- 🚀 **Vercel Ready** - Optimized for seamless deployment

## Tech Stack

- **Framework**: Next.js 15+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **AI Integration**: OpenAI API, XAI API
- **Deployment**: Vercel (configured)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm
- OpenAI API key
- XAI API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/JoeProAI/xtreme-poster.git
cd xtreme-poster
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Create .env.local file
OPENAI_API_KEY=your_openai_api_key_here
XAI_API_KEY=your_xai_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes
│   ├── globals.css    # Global styles
│   ├── layout.tsx     # Root layout
│   └── page.tsx       # Home page
├── components/        # Reusable components
└── lib/              # Utility functions
```

## API Endpoints

- `/api/style-corpus` - Serves the style corpus data for content generation

## Deployment

### Vercel Deployment

This project is pre-configured for Vercel deployment:

1. Push to GitHub
2. Connect repository to Vercel
3. Configure environment variables in Vercel dashboard:
   - `OPENAI_API_KEY`
   - `XAI_API_KEY`
4. Deploy automatically

The `vercel.json` configuration handles:
- API route optimization
- Static asset serving
- CORS headers
- Function timeouts

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for content generation | Yes |
| `XAI_API_KEY` | XAI API key for enhanced AI features | Yes |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is private and proprietary.

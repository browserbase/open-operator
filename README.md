# Open Operator

> [!NOTE]
> Browserbase is

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fbrowserbase%2Fopen-operator&env=OPENAI_API_KEY,BROWSERBASE_API_KEY,BROWSERBASE_PROJECT_ID&envDescription=API%20keys%20needed%20to%20run%20Open%20Operator&envLink=https%3A%2F%2Fgithub.com%2Fbrowserbase%2Fopen-operator%23environment-variables)

## Features

- 🌐 Autonomous web browsing and interaction
- 🤖 Natural language interface for web navigation
- 🔄 Real-time browser state synchronization
- 🛠️ Extensible architecture for custom actions
- 📱 Responsive design for all devices
- 🎭 Reliable browser automation with Stagehand
- 🔍 Precise DOM understanding and manipulation

## Getting Started

First, install the dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

Next, copy the example environment variables:

```bash
cp .env.example .env.local
```

You'll need to set up your API keys:

1. Get your OpenAI API key from [OpenAI's dashboard](https://platform.openai.com/api-keys)
2. Get your Browserbase API key and project ID from [Browserbase](https://www.browserbase.com)

Update `.env.local` with your API keys:

- `OPENAI_API_KEY`: Your OpenAI API key
- `BROWSERBASE_API_KEY`: Your Browserbase API key
- `BROWSERBASE_PROJECT_ID`: Your Browserbase project ID

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see Open Operator in action.

## How It Works

Open Operator uses a combination of AI models and advanced browser automation to enable natural web interactions:

1. **Understanding Intent**: Natural language processing to understand user intentions
2. **Browser Automation**: Leverages Browserbase's technology for reliable web interaction
3. **DOM Management**: Uses Stagehand for precise DOM traversal and manipulation
4. **Action Execution**: Translates intentions into precise browser actions
5. **Real-time Feedback**: Provides immediate visual and textual feedback

The system combines these technologies to:

- Parse and understand natural language commands
- Navigate and interact with web interfaces
- Execute complex sequences of actions
- Provide real-time feedback and results

### Key Technologies

- **Browserbase**: Powers the core browser automation and interaction capabilities
- **Stagehand**: Handles precise DOM manipulation and state management
- **Next.js**: Provides the modern web framework foundation
- **AI Models**: Enable natural language understanding and decision making

## Contributing

We welcome contributions! Whether it's:

- Adding new features
- Improving documentation
- Reporting bugs
- Suggesting enhancements

Please feel free to open issues and pull requests.

## License

Open Operator is open source software licensed under the MIT license.

## Acknowledgments

This project is inspired by OpenAI's Operator feature and builds upon various open source technologies including Next.js, React, Browserbase, and Stagehand.

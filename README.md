# Discord GPT 🤖

> A sophisticated, event-driven Discord bot powered by multiple AI providers with a modular, extensible architecture.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-ISC-yellow.svg)](LICENSE)

## ✨ Features

- 🤖 **Multi-AI Support**: OpenAI GPT and Perplexity AI integration
- 📁 **File Processing**: Support for text files and image attachments
- ⚡ **Real-time**: Live interaction with loading animations

## 🏗️ Architecture

This project is built with a **modular, event-driven architecture** that makes it easy to add new AI providers, platforms, and features.

### Core Components

```
src/
├── strategies/          # AI provider strategies (Strategy Pattern)
│   ├── openai/         # OpenAI GPT implementation
│   ├── perplexity/     # Perplexity AI implementation
│   └── ai-strategy.ts  # Common strategy interface
├── services/           # Core services (Singleton Pattern)
│   ├── ai-services/    # AI provider services
│   ├── discord.ts      # Discord client service
│   └── cache.ts        # Caching service
├── handlers/           # Event handlers (Observer Pattern)
│   ├── discord.ts      # Discord interaction handling
│   └── openai.ts       # AI processing orchestration
└── config/             # Configuration and constants
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Discord Bot Token
- OpenAI API Key (for GPT)
- Perplexity API Key (for web search)

### Running the Bot

```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build
npm start

# Linting
npm run lint
npm run lint:fix
```

## 🎮 Usage

### Discord Commands

For Discord commands to work, they must be registered via their [Commands API](https://discord.com/developers/docs/interactions/application-commands#registering-a-command)

#### `/gpt <message>` - OpenAI Text & Image Processing

Chat with OpenAI GPT for intelligent text-based conversations. This command supports:

- **Text Input**: Natural language conversations with context awareness
- **Image Uploads**: Process and analyze images using OpenAI's vision capabilities (Requires using an OpenAI model that supports image processing)
- **Text File Attachments**: Upload `.txt` files to provide additional context
- **Conversation Memory**: Maintains chat history for contextual responses

#### `/gptweb <message>` - Perplexity Web Search

Use Perplexity AI for real-time web search and information retrieval. This command supports:

- **Web Search**: Get current information from the internet with citations
- **Text Input**: Ask questions that require up-to-date information
- **Text File Attachments**: Upload `.txt` files to provide context for web searches
- **Citation Links**: Receive source links for all information provided
- **No Image Support**: This command focuses on text-based web queries

### Key Features

- **Shared Conversation History**: Conversation history is maintaned across both commands, so you can freely switch between them while maintaining the context.
- **Smart Caching**: Intelligent conversation history management
- **Real-time Processing**: Live interaction with loading animations
- **Error Handling**: Graceful error recovery and user feedback
- **Multi-modal Support**: Handle text, images, and file attachments seamlessly

## 🙏 Acknowledgments

- [Discord.js](https://discord.js.org/) - Discord API wrapper
- [OpenAI](https://openai.com/) - GPT models
- [Perplexity](https://perplexity.ai/) - Web search AI
- [Node.js](https://nodejs.org/) - Runtime environment

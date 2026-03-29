# 📘 **NODEJS AI DEVELOPER MASTERY - Lesson 1: OpenAI SDK & Foundations**

**Date**: 26-03-18
**Level**: 🟢 Beginner → 🔴 Senior Engineer
**Series**: AI Developer Fundamentals
**Time**: 45 minutes
**Prerequisites**: Basic Node.js, TypeScript, NestJS fundamentals

---

## 🎯 **LEARNING OBJECTIVES**

After completing this **comprehensive** lesson, you will:

1. ✅ **Master OpenAI SDK Setup** - Installation, configuration, dependency injection
2. ✅ **Understand AI Service Architecture** - Service layer patterns for AI
3. ✅ **Implement Configuration Management** - Environment variables, secrets, multi-env setup
4. ✅ **Master Error Handling** - API errors, rate limits, network failures
5. ✅ **Learn AI Service Patterns** - Chat, completion, embedding services
6. ✅ **Production-Ready Setup** - Logging, monitoring, health checks

---

## 📦 **PART 1: OPENAI SDK SETUP**

### **Installation & Dependencies**

```bash
# Install OpenAI SDK
npm install openai

# Install type definitions (if not using TypeScript with moduleResolution: bundler)
npm install -D @types/node

# Install additional utilities
npm install dotenv zod
npm install -D @types/dotenv
```

**Package.json Dependencies**:
```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "openai": "^4.28.0",
    "zod": "^3.22.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

---

### **Environment Configuration**

```bash
# ─────────────────────────────────────────────
# .env.example
# ─────────────────────────────────────────────

# ─────────────────────────────────────────────
# OpenAI API Configuration
# ─────────────────────────────────────────────
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_ORGANIZATION=org-your-org-id-here
OPENAI_PROJECT=proj-your-project-id

# ─────────────────────────────────────────────
# Model Configuration
# ─────────────────────────────────────────────
OPENAI_CHAT_MODEL=gpt-4-turbo-preview
OPENAI_COMPLETION_MODEL=gpt-3.5-turbo-instruct
OPENAI_EMBEDDING_MODEL=text-embedding-3-large
OPENAI_VISION_MODEL=gpt-4-turbo

# ─────────────────────────────────────────────
# Model Parameters (Defaults)
# ─────────────────────────────────────────────
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=4096
OPENAI_TOP_P=1
OPENAI_FREQUENCY_PENALTY=0
OPENAI_PRESENCE_PENALTY=0

# ─────────────────────────────────────────────
# Rate Limiting & Retries
# ─────────────────────────────────────────────
OPENAI_MAX_RETRIES=3
OPENAI_RETRY_DELAY=1000
OPENAI_REQUEST_TIMEOUT=30000

# ─────────────────────────────────────────────
# Feature Flags
# ─────────────────────────────────────────────
OPENAI_LOGGING_ENABLED=true
OPENAI_STREAMING_ENABLED=true
```

```bash
# ─────────────────────────────────────────────
# .env.development
# ─────────────────────────────────────────────
NODE_ENV=development
OPENAI_API_KEY=sk-dev-key-xxx
OPENAI_CHAT_MODEL=gpt-4-turbo-preview
OPENAI_LOGGING_ENABLED=true

# ─────────────────────────────────────────────
# .env.production
# ─────────────────────────────────────────────
NODE_ENV=production
OPENAI_API_KEY=sk-prod-key-xxx
OPENAI_CHAT_MODEL=gpt-4-turbo
OPENAI_MAX_TOKENS=4096
OPENAI_LOGGING_ENABLED=false
```

---

### **OpenAI Module Setup (NestJS)**

```typescript
// ─────────────────────────────────────────────
// ai/ai.module.ts
// ─────────────────────────────────────────────
import { Module, Global, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';

import { AiService } from './ai.service';
import { ChatService } from './chat/chat.service';
import { EmbeddingService } from './embedding/embedding.service';
import { ImageService } from './image/image.service';
import { AudioService } from './audio/audio.service';

@Global()
@Module({
  providers: [],
  exports: [],
})
export class AiModule {
  static forRoot(): DynamicModule {
    return {
      module: AiModule,
      imports: [ConfigModule],

      providers: [
        // ─────────────────────────────────────────────
        // OpenAI Client Provider
        // ─────────────────────────────────────────────
        {
          provide: 'OPENAI_CLIENT',
          useFactory: async (configService: ConfigService) => {
            const apiKey = configService.get<string>('OPENAI_API_KEY');
            const organization = configService.get<string>('OPENAI_ORGANIZATION');
            const project = configService.get<string>('OPENAI_PROJECT');
            const maxRetries = configService.get<number>('OPENAI_MAX_RETRIES', 3);
            const timeout = configService.get<number>('OPENAI_REQUEST_TIMEOUT', 30000);

            if (!apiKey) {
              throw new Error('OPENAI_API_KEY is required');
            }

            // Create OpenAI client with configuration
            return new OpenAI({
              apiKey,
              organization,
              project,

              // Retry configuration
              maxRetries,

              // Timeout configuration
              timeout,

              // HTTP client configuration (optional)
              httpAgent: process.env.HTTPS_PROXY
                ? new HttpsProxyAgent(process.env.HTTPS_PROXY)
                : undefined,
            });
          },
          inject: [ConfigService],
        },

        // ─────────────────────────────────────────────
        // AI Services
        // ─────────────────────────────────────────────
        AiService,
        ChatService,
        EmbeddingService,
        ImageService,
        AudioService,
      ],

      exports: [
        'OPENAI_CLIENT',
        AiService,
        ChatService,
        EmbeddingService,
        ImageService,
        AudioService,
      ],
    };
  }
}
```

---

## 📦 **PART 2: AI SERVICE ARCHITECTURE**

### **Base AI Service**

```typescript
// ─────────────────────────────────────────────
// ai/ai.service.ts
// ─────────────────────────────────────────────
import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import {
  TimeoutError,
  APIConnectionError,
  APIConnectionTimeoutError,
  RateLimitError,
  AuthenticationError,
  BadRequestError,
} from 'openai/errors';

@Injectable()
export class AiService {
  protected readonly logger = new Logger(AiService.name);

  constructor(
    @Inject('OPENAI_CLIENT') protected readonly client: OpenAI,
    protected readonly configService: ConfigService,
  ) {}

  // ─────────────────────────────────────────────
  // Health Check
  // ─────────────────────────────────────────────
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    model?: string;
    latency?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Test with a minimal API call
      await this.client.models.list();

      return {
        status: 'healthy',
        latency: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`AI health check failed: ${error.message}`);

      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  // ─────────────────────────────────────────────
  // Get Model Information
  // ─────────────────────────────────────────────
  async getModelInfo(modelId: string): Promise<OpenAI.Models.Model> {
    try {
      return await this.client.models.retrieve(modelId);
    } catch (error) {
      this.logger.error(`Failed to get model info: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────────────
  // List Available Models
  // ─────────────────────────────────────────────
  async listAvailableModels(): Promise<OpenAI.Models.Model[]> {
    try {
      const response = await this.client.models.list();
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to list models: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────────────
  // Error Classification
  // ─────────────────────────────────────────────
  protected classifyError(error: any): {
    type: string;
    message: string;
    retryable: boolean;
    statusCode?: number;
  } {
    // OpenAI API errors
    if (error instanceof RateLimitError) {
      return {
        type: 'RATE_LIMIT',
        message: 'Rate limit exceeded. Please slow down.',
        retryable: true,
        statusCode: error.status,
      };
    }

    if (error instanceof APIConnectionTimeoutError) {
      return {
        type: 'TIMEOUT',
        message: 'Request timed out. Please try again.',
        retryable: true,
        statusCode: error.status,
      };
    }

    if (error instanceof APIConnectionError) {
      return {
        type: 'CONNECTION',
        message: 'Failed to connect to OpenAI API.',
        retryable: true,
        statusCode: error.status,
      };
    }

    if (error instanceof AuthenticationError) {
      return {
        type: 'AUTHENTICATION',
        message: 'Invalid API key or authentication failed.',
        retryable: false,
        statusCode: error.status,
      };
    }

    if (error instanceof BadRequestError) {
      return {
        type: 'BAD_REQUEST',
        message: `Invalid request: ${error.message}`,
        retryable: false,
        statusCode: error.status,
      };
    }

    // Generic errors
    if (error instanceof TimeoutError) {
      return {
        type: 'TIMEOUT',
        message: 'Request timed out.',
        retryable: true,
      };
    }

    // Default: unknown error
    return {
      type: 'UNKNOWN',
      message: error.message || 'An unexpected error occurred',
      retryable: true,
    };
  }

  // ─────────────────────────────────────────────
  // Retry Logic with Exponential Backoff
  // ─────────────────────────────────────────────
  protected async withRetry<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries: number = 3,
  ): Promise<T> {
    let lastError: any;
    const baseDelay = this.configService.get<number>('OPENAI_RETRY_DELAY', 1000);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const errorInfo = this.classifyError(error);

        this.logger.warn(
          `${context} - Attempt ${attempt}/${maxRetries} failed: ${errorInfo.type} - ${errorInfo.message}`,
        );

        // Don't retry non-retryable errors
        if (!errorInfo.retryable) {
          throw error;
        }

        // Don't retry if we've exhausted retries
        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        this.logger.log(`Retrying in ${Math.round(delay)}ms...`);

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All retries exhausted
    const errorInfo = this.classifyError(lastError);
    this.logger.error(
      `${context} - All ${maxRetries} retries failed: ${errorInfo.message}`,
    );

    throw lastError;
  }
}
```

---

### **Chat Service**

```typescript
// ─────────────────────────────────────────────
// ai/chat/chat.service.ts
// ─────────────────────────────────────────────
import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { AiService } from '../ai.service';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
  user?: string;  // End-user ID for monitoring
}

@Injectable()
export class ChatService extends AiService {
  constructor(
    @Inject('OPENAI_CLIENT') protected readonly client: OpenAI,
    protected readonly configService: ConfigService,
  ) {
    super(client, configService);
  }

  // ─────────────────────────────────────────────
  // Simple Chat Completion
  // ─────────────────────────────────────────────
  async complete(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {},
  ): Promise<string> {
    const model = options.model || this.configService.get<string>('OPENAI_CHAT_MODEL', 'gpt-4-turbo-preview');
    const temperature = options.temperature ?? this.configService.get<number>('OPENAI_TEMPERATURE', 0.7);
    const maxTokens = options.maxTokens ?? this.configService.get<number>('OPENAI_MAX_TOKENS', 4096);

    return this.withRetry(
      async () => {
        const response = await this.client.chat.completions.create({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          top_p: options.topP ?? this.configService.get<number>('OPENAI_TOP_P', 1),
          frequency_penalty: options.frequencyPenalty ?? this.configService.get<number>('OPENAI_FREQUENCY_PENALTY', 0),
          presence_penalty: options.presencePenalty ?? this.configService.get<number>('OPENAI_PRESENCE_PENALTY', 0),
          stop: options.stop,
          user: options.user,
        });

        return response.choices[0]?.message?.content || '';
      },
      'ChatCompletion',
    );
  }

  // ─────────────────────────────────────────────
  // Chat with Full Response
  // ─────────────────────────────────────────────
  async completeWithMetadata(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {},
  ): Promise<{
    content: string;
    model: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    finishReason: string;
  }> {
    const model = options.model || this.configService.get<string>('OPENAI_CHAT_MODEL', 'gpt-4-turbo-preview');
    const temperature = options.temperature ?? this.configService.get<number>('OPENAI_TEMPERATURE', 0.7);
    const maxTokens = options.maxTokens ?? this.configService.get<number>('OPENAI_MAX_TOKENS', 4096);

    return this.withRetry(
      async () => {
        const response = await this.client.chat.completions.create({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          top_p: options.topP ?? 1,
          frequency_penalty: options.frequencyPenalty ?? 0,
          presence_penalty: options.presencePenalty ?? 0,
          stop: options.stop,
          user: options.user,
        });

        const choice = response.choices[0];

        return {
          content: choice?.message?.content || '',
          model: response.model,
          usage: {
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0,
          },
          finishReason: choice?.finish_reason || 'unknown',
        };
      },
      'ChatCompletionWithMetadata',
    );
  }

  // ─────────────────────────────────────────────
  // Streaming Chat Completion
  // ─────────────────────────────────────────────
  async *stream(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {},
  ): AsyncGenerator<string, void, unknown> {
    const model = options.model || this.configService.get<string>('OPENAI_CHAT_MODEL', 'gpt-4-turbo-preview');
    const temperature = options.temperature ?? this.configService.get<number>('OPENAI_TEMPERATURE', 0.7);
    const maxTokens = options.maxTokens ?? this.configService.get<number>('OPENAI_MAX_TOKENS', 4096);

    const stream = await this.withRetry(
      async () => {
        return await this.client.chat.completions.create({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: true,
          stop: options.stop,
          user: options.user,
        });
      },
      'ChatCompletionStream',
    );

    // Yield tokens as they arrive
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield content;
      }
    }
  }

  // ─────────────────────────────────────────────
  // Streaming with Callback
  // ─────────────────────────────────────────────
  async streamWithCallback(
    messages: ChatMessage[],
    onToken: (token: string) => void | Promise<void>,
    onComplete?: (fullResponse: string) => void | Promise<void>,
    options: ChatCompletionOptions = {},
  ): Promise<string> {
    let fullResponse = '';

    for await (const token of this.stream(messages, options)) {
      fullResponse += token;
      await onToken(token);
    }

    if (onComplete) {
      await onComplete(fullResponse);
    }

    return fullResponse;
  }

  // ─────────────────────────────────────────────
  // System Prompt Helper
  // ─────────────────────────────────────────────
  createSystemPrompt(content: string): ChatMessage {
    return { role: 'system', content };
  }

  createUserPrompt(content: string): ChatMessage {
    return { role: 'user', content };
  }

  createAssistantPrompt(content: string): ChatMessage {
    return { role: 'assistant', content };
  }

  // ─────────────────────────────────────────────
  // Conversation Builder
  // ─────────────────────────────────────────────
  buildConversation(
    systemPrompt: string,
    userMessages: string[],
    assistantResponses: string[] = [],
  ): ChatMessage[] {
    const messages: ChatMessage[] = [
      this.createSystemPrompt(systemPrompt),
    ];

    for (let i = 0; i < userMessages.length; i++) {
      messages.push(this.createUserPrompt(userMessages[i]));

      if (assistantResponses[i]) {
        messages.push(this.createAssistantPrompt(assistantResponses[i]));
      }
    }

    return messages;
  }
}
```

---

### **Embedding Service**

```typescript
// ─────────────────────────────────────────────
// ai/embedding/embedding.service.ts
// ─────────────────────────────────────────────
import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { AiService } from '../ai.service';

export interface EmbeddingOptions {
  model?: string;
  encodingFormat?: 'float' | 'base64';
  user?: string;
}

@Injectable()
export class EmbeddingService extends AiService {
  constructor(
    @Inject('OPENAI_CLIENT') protected readonly client: OpenAI,
    protected readonly configService: ConfigService,
  ) {
    super(client, configService);
  }

  // ─────────────────────────────────────────────
  // Generate Single Embedding
  // ─────────────────────────────────────────────
  async embed(
    text: string,
    options: EmbeddingOptions = {},
  ): Promise<number[]> {
    const model = options.model || this.configService.get<string>('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-large');

    return this.withRetry(
      async () => {
        const response = await this.client.embeddings.create({
          model,
          input: text,
          encoding_format: options.encodingFormat || 'float',
          user: options.user,
        });

        return response.data[0].embedding;
      },
      'EmbeddingGeneration',
    );
  }

  // ─────────────────────────────────────────────
  // Generate Multiple Embeddings (Batch)
  // ─────────────────────────────────────────────
  async embedBatch(
    texts: string[],
    options: EmbeddingOptions = {},
  ): Promise<number[][]> {
    const model = options.model || this.configService.get<string>('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-large');

    return this.withRetry(
      async () => {
        const response = await this.client.embeddings.create({
          model,
          input: texts,
          encoding_format: options.encodingFormat || 'float',
          user: options.user,
        });

        // Sort by index to maintain order
        const sorted = response.data.sort((a, b) => a.index - b.index);
        return sorted.map(item => item.embedding);
      },
      'EmbeddingBatchGeneration',
    );
  }

  // ─────────────────────────────────────────────
  // Generate Embeddings with Metadata
  // ─────────────────────────────────────────────
  async embedWithMetadata(
    text: string,
    options: EmbeddingOptions = {},
  ): Promise<{
    embedding: number[];
    model: string;
    usage: {
      promptTokens: number;
      totalTokens: number;
    };
  }> {
    const model = options.model || this.configService.get<string>('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-large');

    return this.withRetry(
      async () => {
        const response = await this.client.embeddings.create({
          model,
          input: text,
          encoding_format: options.encodingFormat || 'float',
          user: options.user,
        });

        return {
          embedding: response.data[0].embedding,
          model: response.model,
          usage: {
            promptTokens: response.usage?.prompt_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0,
          },
        };
      },
      'EmbeddingWithMetadata',
    );
  }

  // ─────────────────────────────────────────────
  // Cosine Similarity
  // ─────────────────────────────────────────────
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      magnitudeA += vecA[i] * vecA[i];
      magnitudeB += vecB[i] * vecB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  // ─────────────────────────────────────────────
  // Find Most Similar
  // ─────────────────────────────────────────────
  findMostSimilar(
    targetEmbedding: number[],
    candidates: Array<{ embedding: number[]; metadata?: any }>,
    topK: number = 5,
  ): Array<{ metadata?: any; similarity: number }> {
    const scored = candidates.map(candidate => ({
      metadata: candidate.metadata,
      similarity: this.cosineSimilarity(targetEmbedding, candidate.embedding),
    }));

    // Sort by similarity (descending)
    scored.sort((a, b) => b.similarity - a.similarity);

    // Return top K
    return scored.slice(0, topK);
  }
}
```

---

### **Image Service (DALL-E)**

```typescript
// ─────────────────────────────────────────────
// ai/image/image.service.ts
// ─────────────────────────────────────────────
import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { AiService } from '../ai.service';

export interface ImageGenerationOptions {
  model?: string;
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  n?: number;  // Number of images
}

@Injectable()
export class ImageService extends AiService {
  constructor(
    @Inject('OPENAI_CLIENT') protected readonly client: OpenAI,
    protected readonly configService: ConfigService,
  ) {
    super(client, configService);
  }

  // ─────────────────────────────────────────────
  // Generate Image
  // ─────────────────────────────────────────────
  async generate(
    prompt: string,
    options: ImageGenerationOptions = {},
  ): Promise<{
    url: string;
    revisedPrompt?: string;
  }> {
    const model = options.model || 'dall-e-3';
    const size = options.size || '1024x1024';
    const quality = options.quality || 'standard';
    const style = options.style || 'vivid';
    const n = options.n || 1;

    return this.withRetry(
      async () => {
        const response = await this.client.images.generate({
          model,
          prompt,
          n,
          size,
          quality,
          style,
          response_format: 'url',
        });

        const image = response.data[0];

        return {
          url: image.url,
          revisedPrompt: image.revised_prompt,
        };
      },
      'ImageGeneration',
    );
  }

  // ─────────────────────────────────────────────
  // Generate Multiple Images
  // ─────────────────────────────────────────────
  async generateMultiple(
    prompt: string,
    count: number = 4,
    options: ImageGenerationOptions = {},
  ): Promise<Array<{
    url: string;
    revisedPrompt?: string;
  }>> {
    const model = options.model || 'dall-e-3';
    const size = options.size || '1024x1024';
    const quality = options.quality || 'standard';
    const style = options.style || 'vivid';

    return this.withRetry(
      async () => {
        const response = await this.client.images.generate({
          model,
          prompt,
          n: count,
          size,
          quality,
          style,
          response_format: 'url',
        });

        return response.data.map(image => ({
          url: image.url,
          revisedPrompt: image.revised_prompt,
        }));
      },
      'ImageGenerationMultiple',
    );
  }

  // ─────────────────────────────────────────────
  // Edit Image (Inpainting)
  // ─────────────────────────────────────────────
  async edit(
    imageUrl: string,
    prompt: string,
    maskUrl?: string,
    size: '256x256' | '512x512' | '1024x1024' = '1024x1024',
  ): Promise<{ url: string }> {
    return this.withRetry(
      async () => {
        // Download images as buffers
        const imageBuffer = await this.downloadImage(imageUrl);
        const maskBuffer = maskUrl ? await this.downloadImage(maskUrl) : undefined;

        const response = await this.client.images.edit({
          image: imageBuffer,
          prompt,
          mask: maskBuffer,
          n: 1,
          size,
          response_format: 'url',
        });

        return {
          url: response.data[0].url,
        };
      },
      'ImageEdit',
    );
  }

  // ─────────────────────────────────────────────
  // Helper: Download Image
  // ─────────────────────────────────────────────
  private async downloadImage(url: string): Promise<Buffer> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // ─────────────────────────────────────────────
  // Create Variation
  // ─────────────────────────────────────────────
  async createVariation(
    imageUrl: string,
    count: number = 1,
    size: '256x256' | '512x512' | '1024x1024' = '1024x1024',
  ): Promise<string[]> {
    return this.withRetry(
      async () => {
        const imageBuffer = await this.downloadImage(imageUrl);

        const response = await this.client.images.createVariation({
          image: imageBuffer,
          n: count,
          size,
          response_format: 'url',
        });

        return response.data.map(image => image.url);
      },
      'ImageVariation',
    );
  }
}
```

---

### **Audio Service (Whisper)**

```typescript
// ─────────────────────────────────────────────
// ai/audio/audio.service.ts
// ─────────────────────────────────────────────
import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { AiService } from '../ai.service';
import { createReadStream } from 'fs';

export interface TranscriptionOptions {
  model?: string;
  language?: string;
  prompt?: string;
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number;
}

export interface TranslationOptions {
  model?: string;
  prompt?: string;
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number;
}

@Injectable()
export class AudioService extends AiService {
  constructor(
    @Inject('OPENAI_CLIENT') protected readonly client: OpenAI,
    protected readonly configService: ConfigService,
  ) {
    super(client, configService);
  }

  // ─────────────────────────────────────────────
  // Transcribe Audio to Text
  // ─────────────────────────────────────────────
  async transcribe(
    audioFilePath: string,
    options: TranscriptionOptions = {},
  ): Promise<string> {
    const model = options.model || 'whisper-1';

    return this.withRetry(
      async () => {
        const response = await this.client.audio.transcriptions.create({
          model,
          file: createReadStream(audioFilePath),
          language: options.language,
          prompt: options.prompt,
          response_format: options.responseFormat || 'json',
          temperature: options.temperature,
        });

        return response.text;
      },
      'AudioTranscription',
    );
  }

  // ─────────────────────────────────────────────
  // Transcribe with Metadata
  // ─────────────────────────────────────────────
  async transcribeWithMetadata(
    audioFilePath: string,
    options: TranscriptionOptions = {},
  ): Promise<{
    text: string;
    language: string;
    duration: number;
    segments?: any[];
  }> {
    const model = options.model || 'whisper-1';

    return this.withRetry(
      async () => {
        const response = await this.client.audio.transcriptions.create({
          model,
          file: createReadStream(audioFilePath),
          language: options.language,
          prompt: options.prompt,
          response_format: 'verbose_json',
          temperature: options.temperature,
        });

        return {
          text: response.text,
          language: response.language,
          duration: response.duration,
          segments: response.segments,
        };
      },
      'AudioTranscriptionWithMetadata',
    );
  }

  // ─────────────────────────────────────────────
  // Translate Audio to English Text
  // ─────────────────────────────────────────────
  async translate(
    audioFilePath: string,
    options: TranslationOptions = {},
  ): Promise<string> {
    const model = options.model || 'whisper-1';

    return this.withRetry(
      async () => {
        const response = await this.client.audio.translations.create({
          model,
          file: createReadStream(audioFilePath),
          prompt: options.prompt,
          response_format: options.responseFormat || 'json',
          temperature: options.temperature,
        });

        return response.text;
      },
      'AudioTranslation',
    );
  }

  // ─────────────────────────────────────────────
  // Text to Speech (TTS)
  // ─────────────────────────────────────────────
  async textToSpeech(
    text: string,
    outputFile: string,
    options: {
      model?: 'tts-1' | 'tts-1-hd';
      voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
      speed?: number;
    } = {},
  ): Promise<void> {
    const model = options.model || 'tts-1';
    const voice = options.voice || 'alloy';
    const speed = options.speed || 1.0;

    return this.withRetry(
      async () => {
        const response = await this.client.audio.speech.create({
          model,
          voice: voice as any,
          input: text,
          speed,
        });

        // Save to file
        const buffer = Buffer.from(await response.arrayBuffer());
        await import('fs/promises').then(fs => fs.writeFile(outputFile, buffer));
      },
      'TextToSpeech',
    );
  }
}
```

---

## 📦 **PART 3: CONTROLLER & API LAYER**

### **AI Controller**

```typescript
// ─────────────────────────────────────────────
// ai/ai.controller.ts
// ─────────────────────────────────────────────
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Sse,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { ChatService } from './chat/chat.service';
import { EmbeddingService } from './embedding/embedding.service';
import { ImageService } from './image/image.service';
import { AudioService } from './audio/audio.service';

import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(
    private readonly chatService: ChatService,
    private readonly embeddingService: EmbeddingService,
    private readonly imageService: ImageService,
    private readonly audioService: AudioService,
  ) {}

  // ─────────────────────────────────────────────
  // Health Check
  // ─────────────────────────────────────────────
  @Get('health')
  @ApiOperation({ summary: 'Check AI service health' })
  async healthCheck() {
    return this.chatService.healthCheck();
  }

  // ─────────────────────────────────────────────
  // List Models
  // ─────────────────────────────────────────────
  @Get('models')
  @ApiOperation({ summary: 'List available AI models' })
  async listModels() {
    return this.chatService.listAvailableModels();
  }

  // ─────────────────────────────────────────────
  // Chat Completion
  // ─────────────────────────────────────────────
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chat completion' })
  @ApiResponse({ status: 200, description: 'Chat response' })
  async chat(
    @Body() body: {
      messages: Array<{ role: string; content: string }>;
      temperature?: number;
      maxTokens?: number;
    },
  ) {
    if (!body.messages || body.messages.length === 0) {
      throw new BadRequestException('Messages are required');
    }

    return this.chatService.complete(body.messages, {
      temperature: body.temperature,
      maxTokens: body.maxTokens,
    });
  }

  // ─────────────────────────────────────────────
  // Streaming Chat (SSE)
  // ─────────────────────────────────────────────
  @Sse('chat/stream')
  @ApiOperation({ summary: 'Streaming chat completion (SSE)' })
  chatStream(
    @Body() body: {
      messages: Array<{ role: string; content: string }>;
      temperature?: number;
      maxTokens?: number;
    },
  ): Observable<{ data: string }> {
    const stream = this.chatService.stream(body.messages, {
      temperature: body.temperature,
      maxTokens: body.maxTokens,
    });

    return from(stream).pipe(
      map(token => ({ data: token })),
    );
  }

  // ─────────────────────────────────────────────
  // Generate Embedding
  // ─────────────────────────────────────────────
  @Post('embeddings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate text embeddings' })
  async embeddings(
    @Body() body: { text: string | string[] },
  ) {
    if (!body.text) {
      throw new BadRequestException('Text is required');
    }

    const texts = Array.isArray(body.text) ? body.text : [body.text];

    if (texts.length === 1) {
      const embedding = await this.embeddingService.embed(texts[0]);
      return { embedding };
    }

    const embeddings = await this.embeddingService.embedBatch(texts);
    return { embeddings };
  }

  // ─────────────────────────────────────────────
  // Cosine Similarity
  // ─────────────────────────────────────────────
  @Post('embeddings/similarity')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate cosine similarity' })
  async similarity(
    @Body() body: {
      vector1: number[];
      vector2: number[];
    },
  ) {
    const similarity = this.embeddingService.cosineSimilarity(
      body.vector1,
      body.vector2,
    );

    return { similarity };
  }

  // ─────────────────────────────────────────────
  // Generate Image
  // ─────────────────────────────────────────────
  @Post('images/generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate image from prompt' })
  async generateImage(
    @Body() body: {
      prompt: string;
      size?: '1024x1024' | '1792x1024' | '1024x1792';
      quality?: 'standard' | 'hd';
      style?: 'vivid' | 'natural';
      count?: number;
    },
  ) {
    if (!body.prompt) {
      throw new BadRequestException('Prompt is required');
    }

    if (body.count && body.count > 1) {
      return this.imageService.generateMultiple(body.prompt, body.count, {
        size: body.size,
        quality: body.quality,
        style: body.style,
      });
    }

    return this.imageService.generate(body.prompt, {
      size: body.size,
      quality: body.quality,
      style: body.style,
    });
  }

  // ─────────────────────────────────────────────
  // Transcribe Audio
  // ─────────────────────────────────────────────
  @Post('audio/transcribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transcribe audio to text' })
  async transcribe(
    @Body() body: {
      audioPath: string;
      language?: string;
      prompt?: string;
    },
  ) {
    if (!body.audioPath) {
      throw new BadRequestException('Audio file path is required');
    }

    return this.audioService.transcribeWithMetadata(body.audioPath, {
      language: body.language,
      prompt: body.prompt,
    });
  }
}
```

---

## 📦 **PART 4: USAGE EXAMPLES**

### **Basic Usage**

```typescript
// ─────────────────────────────────────────────
// Example: Simple Chat
// ─────────────────────────────────────────────
import { ChatService } from './ai/chat/chat.service';

// In your service or controller
constructor(private chatService: ChatService) {}

async askQuestion() {
  const messages = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What is TypeScript?' },
  ];

  const response = await this.chatService.complete(messages);
  console.log(response);
}

// ─────────────────────────────────────────────
// Example: Conversation with History
// ─────────────────────────────────────────────
async haveConversation() {
  const messages = [
    { role: 'system', content: 'You are a coding assistant.' },
    { role: 'user', content: 'How do I create a class in TypeScript?' },
    { role: 'assistant', content: 'In TypeScript, you create a class using the class keyword...' },
    { role: 'user', content: 'Can you show me an example?' },
  ];

  const response = await this.chatService.complete(messages, {
    temperature: 0.7,
    maxTokens: 1000,
  });

  console.log(response);
}

// ─────────────────────────────────────────────
// Example: Streaming Response
// ─────────────────────────────────────────────
async streamResponse() {
  const messages = [
    { role: 'user', content: 'Write a poem about coding.' },
  ];

  let fullResponse = '';

  for await (const token of this.chatService.stream(messages)) {
    process.stdout.write(token);  // Print token by token
    fullResponse += token;
  }

  console.log('\nFull response:', fullResponse);
}

// ─────────────────────────────────────────────
// Example: Generate Embeddings
// ─────────────────────────────────────────────
import { EmbeddingService } from './ai/embedding/embedding.service';

constructor(private embeddingService: EmbeddingService) {}

async compareTexts() {
  const text1 = 'The quick brown fox jumps over the lazy dog';
  const text2 = 'A fast brown fox leaps over a sleepy dog';
  const text3 = 'The weather is nice today';

  const [embedding1, embedding2, embedding3] = await this.embeddingService.embedBatch([
    text1,
    text2,
    text3,
  ]);

  const similarity12 = this.embeddingService.cosineSimilarity(embedding1, embedding2);
  const similarity13 = this.embeddingService.cosineSimilarity(embedding1, embedding3);

  console.log(`Similarity between text1 and text2: ${similarity12}`);  // High (~0.8-0.9)
  console.log(`Similarity between text1 and text3: ${similarity13}`);  // Low (~0.3-0.5)
}

// ─────────────────────────────────────────────
// Example: Generate Image
// ─────────────────────────────────────────────
import { ImageService } from './ai/image/image.service';

constructor(private imageService: ImageService) {}

async createArtwork() {
  const prompt = 'A futuristic city with flying cars at sunset, cyberpunk style, highly detailed';

  const result = await this.imageService.generate(prompt, {
    size: '1792x1024',
    quality: 'hd',
    style: 'vivid',
  });

  console.log('Image URL:', result.url);
  console.log('Revised prompt:', result.revisedPrompt);
}

// ─────────────────────────────────────────────
// Example: Transcribe Audio
// ─────────────────────────────────────────────
import { AudioService } from './ai/audio/audio.service';

constructor(private audioService: AudioService) {}

async transcribeMeeting() {
  const result = await this.audioService.transcribeWithMetadata(
    '/path/to/meeting-recording.mp3',
    {
      language: 'en',
      prompt: 'This is a business meeting about project planning.',
    },
  );

  console.log('Transcription:', result.text);
  console.log('Language:', result.language);
  console.log('Duration:', result.duration, 'seconds');
}
```

---

## ✅ **AI SERVICE CHECKLIST**

```
Setup & Configuration
[ ] OpenAI SDK installed
[ ] Environment variables configured
[ ] API key secured (not in code)
[ ] Multi-environment setup (.env.dev, .env.prod)

Module & DI
[ ] AI module created
[ ] OpenAI client provider configured
[ ] Services registered and exported
[ ] Configuration injected properly

Error Handling
[ ] Retry logic implemented
[ ] Exponential backoff configured
[ ] Error classification working
[ ] Non-retryable errors handled correctly

Services
[ ] Chat service with streaming
[ ] Embedding service with batch
[ ] Image service (DALL-E)
[ ] Audio service (Whisper)
[ ] Health check endpoint

Monitoring
[ ] Logging enabled
[ ] Token usage tracked
[ ] Latency monitored
[ ] Error rates tracked

Security
[ ] API key not exposed in responses
[ ] Rate limiting implemented
[ ] Input validation in place
[ ] User ID tracking enabled
```

---

## 🎯 **KNOWLEDGE CHECK**

### **Question 1: Error Classification**

Which errors should be retried and which should not?

<details>
<summary>💡 Click to reveal answer</summary>

**Retryable Errors**:
- ✅ RateLimitError (429) - Wait and retry
- ✅ APIConnectionTimeoutError - Network timeout
- ✅ APIConnectionError - Temporary connection issue

**Non-Retryable Errors**:
- ❌ AuthenticationError (401) - Invalid API key
- ❌ BadRequestError (400) - Invalid request parameters
- ❌ PermissionError (403) - Insufficient permissions
</details>

---

### **Question 2: Streaming Benefits**

Why use streaming instead of waiting for complete response?

<details>
<summary>💡 Click to reveal answer</summary>

**Benefits of Streaming**:
1. ✅ **Better UX**: User sees response immediately
2. ✅ **Lower perceived latency**: First token in ~200ms vs ~5s
3. ✅ **Memory efficient**: Don't need to buffer entire response
4. ✅ **Early termination**: Can stop generation early if needed
5. ✅ **Real-time processing**: Can process tokens as they arrive
</details>

---

### **Question 3: Embedding Use Cases**

What are the main use cases for embeddings?

<details>
<summary>💡 Click to reveal answer</summary>

**Embedding Use Cases**:
1. ✅ **Semantic Search**: Find similar documents
2. ✅ **Recommendations**: Suggest similar content
3. ✅ **Clustering**: Group similar items
4. ✅ **RAG**: Retrieve relevant context for AI
5. ✅ **Duplicate Detection**: Find near-duplicate content
6. ✅ **Classification**: Categorize text by similarity
</details>

---

## 📚 **ADDITIONAL RESOURCES**

- **OpenAI SDK Docs**: [https://github.com/openai/openai-node](https://github.com/openai/openai-node)
- **OpenAI API Reference**: [https://platform.openai.com/docs/api-reference](https://platform.openai.com/docs/api-reference)
- **Model Pricing**: [https://openai.com/pricing](https://openai.com/pricing)
- **Rate Limits**: [https://platform.openai.com/account/rate-limits](https://platform.openai.com/account/rate-limits)

---

## 🎓 **HOMEWORK**

1. ✅ Set up OpenAI module in your NestJS project
2. ✅ Create all 4 services (Chat, Embedding, Image, Audio)
3. ✅ Implement health check endpoint
4. ✅ Add error handling with retries
5. ✅ Create streaming chat endpoint
6. ✅ Test embedding generation and similarity
7. ✅ Generate an image with DALL-E 3
8. ✅ Transcribe an audio file with Whisper

---

**Next Lesson**: Prompt Engineering Mastery - Patterns, Techniques, and Best Practices
**Date**: 26-03-18
**Status**: ✅ Complete

---
*26-03-18*

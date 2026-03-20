# 📘 **NODEJS AI DEVELOPER MASTERY - Lesson 15: Advanced RAG Optimization**

**Date**: 26-03-18
**Level**: 🟢 Beginner → 🔴 Senior Engineer
**Series**: AI Developer Fundamentals - Part 3
**Time**: 70 minutes
**Prerequisites**: Lesson 14 (RAG Implementation Patterns)

---

## 🎯 **LEARNING OBJECTIVES**

After completing this **comprehensive** lesson, you will:

1. ✅ **Master Query Expansion** - Multi-query, hypothetical answers, step-back prompting
2. ✅ **Implement Re-ranking** - Cross-encoders, Cohere, custom ranking
3. ✅ **Build RAG Evaluation** - Faithfulness, relevance, answer quality metrics
4. ✅ **Optimize Performance** - Caching, batching, parallel processing
5. ✅ **Handle Edge Cases** - Low confidence, conflicting sources, missing info
6. ✅ **Advanced Patterns** - Graph RAG, iterative RAG, self-correcting RAG
7. ✅ **Production Monitoring** - Analytics, A/B testing, continuous improvement

---

## 📦 **PART 1: QUERY EXPANSION TECHNIQUES**

### **Multi-Query Retrieval**

```typescript
// ─────────────────────────────────────────────
// ai/rag/query-expansion.service.ts
// ─────────────────────────────────────────────
import { Injectable, Logger } from '@nestjs/common';
import { ChatService } from '../chat/chat.service';
import { RetrievalService, RetrievalResult } from './retrieval.service';

export interface ExpandedQuery {
  original: string;
  expanded: string[];
  reasoning?: string;
}

@Injectable()
export class QueryExpansionService {
  private readonly logger = new Logger(QueryExpansionService.name);

  constructor(
    private chatService: ChatService,
    private retrievalService: RetrievalService,
  ) {}

  // ─────────────────────────────────────────────
  // Multi-Query Expansion
  // ─────────────────────────────────────────────
  async expandQuery(
    query: string,
    options: {
      numVariations?: number;
      strategy?: 'paraphrase' | 'step-back' | 'hypothetical';
    } = {},
  ): Promise<ExpandedQuery> {
    const {
      numVariations = 3,
      strategy = 'paraphrase',
    } = options;

    let expanded: string[] = [];
    let reasoning: string = '';

    switch (strategy) {
      case 'paraphrase':
        [expanded, reasoning] = await this.paraphraseQuery(query, numVariations);
        break;

      case 'step-back':
        [expanded, reasoning] = await this.stepBackQuery(query, numVariations);
        break;

      case 'hypothetical':
        [expanded, reasoning] = await this.hypotheticalQuery(query, numVariations);
        break;
    }

    return {
      original: query,
      expanded,
      reasoning,
    };
  }

  // ─────────────────────────────────────────────
  // Paraphrase Strategy
  // ─────────────────────────────────────────────
  private async paraphraseQuery(
    query: string,
    numVariations: number,
  ): Promise<[string[], string]> {
    const prompt = `
Generate ${numVariations} different ways to ask the same question.
Keep the same meaning but use different wording.

Original question: "${query}"

Respond with a JSON array of ${numVariations} alternative questions:
["Alternative 1?", "Alternative 2?", "Alternative 3?"]
`;

    const response = await this.chatService.complete(
      [
        { role: 'system', content: 'You are a helpful assistant. Respond ONLY with a JSON array.' },
        { role: 'user', content: prompt },
      ],
      { response_format: { type: 'json_object' } },
    );

    try {
      const parsed = JSON.parse(response);
      const variations = Array.isArray(parsed) ? parsed : [];

      return [
        variations,
        'Generated paraphrased versions of the original query',
      ];
    } catch (error) {
      return [[], 'Failed to parse response'];
    }
  }

  // ─────────────────────────────────────────────
  // Step-Back Strategy (Ask Broader Question)
  // ─────────────────────────────────────────────
  private async stepBackQuery(
    query: string,
    numVariations: number,
  ): Promise<[string[], string]> {
    const prompt = `
For the given question, generate ${numVariations} broader "step-back" questions that explore the underlying concepts.

Original question: "${query}"

Example:
Original: "What causes the seasons on Earth?"
Step-back: "What factors influence planetary climate?"
Step-back: "How does axial tilt affect celestial bodies?"

Respond with JSON:
{
  "reasoning": "Why step-back helps",
  "questions": ["Question 1?", "Question 2?"]
}
`;

    const response = await this.chatService.complete(
      [
        { role: 'system', content: 'You are a helpful assistant. Respond ONLY with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      { response_format: { type: 'json_object' } },
    );

    try {
      const parsed = JSON.parse(response);
      return [
        parsed.questions || [],
        parsed.reasoning || 'Step-back questions explore broader concepts',
      ];
    } catch (error) {
      return [[], 'Failed to parse response'];
    }
  }

  // ─────────────────────────────────────────────
  // Hypothetical Document Embedding (HyDE)
  // ─────────────────────────────────────────────
  private async hypotheticalQuery(
    query: string,
    numVariations: number,
  ): Promise<[string[], string]> {
    // HyDE: Generate hypothetical answer, then use it for retrieval
    const prompt = `
Imagine a document that would perfectly answer this question.
Write a brief hypothetical answer (${numVariations} different versions, 2-3 sentences each).

Question: "${query}"

Respond with JSON:
{
  "reasoning": "Why hypothetical answers help retrieval",
  "answers": ["Answer 1...", "Answer 2...", "Answer 3..."]
}
`;

    const response = await this.chatService.complete(
      [
        { role: 'system', content: 'You are a helpful assistant. Respond ONLY with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      { response_format: { type: 'json_object' } },
    );

    try {
      const parsed = JSON.parse(response);
      // Use hypothetical answers as additional queries
      return [
        parsed.answers || [],
        'HyDE: Hypothetical Document Embeddings improve retrieval',
      ];
    } catch (error) {
      return [[], 'Failed to parse response'];
    }
  }

  // ─────────────────────────────────────────────
  // Multi-Query Retrieval (Combine All)
  // ─────────────────────────────────────────────
  async multiQueryRetrieval(
    query: string,
    options: {
      strategies?: Array<'paraphrase' | 'step-back' | 'hypothetical'>;
      topKPerQuery?: number;
      deduplicate?: boolean;
    } = {},
  ): Promise<RetrievalResult[]> {
    const {
      strategies = ['paraphrase'],
      topKPerQuery = 5,
      deduplicate = true,
    } = options;

    // Generate expanded queries
    const allQueries = [query];  // Always include original

    for (const strategy of strategies) {
      const expanded = await this.expandQuery(query, { strategy });
      allQueries.push(...expanded.expanded);
    }

    this.logger.log(`Multi-query retrieval with ${allQueries.length} queries`);

    // Retrieve for each query
    const allResults: RetrievalResult[] = [];

    for (const q of allQueries) {
      const results = await this.retrievalService.denseRetrieval(q, {
        topK: topKPerQuery,
      });
      allResults.push(...results);
    }

    // Deduplicate
    if (deduplicate) {
      return this.deduplicateResults(allResults);
    }

    return allResults;
  }

  // ─────────────────────────────────────────────
  // Deduplicate Results
  // ─────────────────────────────────────────────
  private deduplicateResults(results: RetrievalResult[]): RetrievalResult[] {
    const seen = new Map<string, RetrievalResult>();

    for (const result of results) {
      const key = `${result.metadata?.source || 'unknown'}:${result.metadata?.chunkId || result.content.substring(0, 50)}`;

      if (!seen.has(key)) {
        seen.set(key, result);
      } else {
        // Keep higher scored version
        const existing = seen.get(key);
        if (result.score > existing.score) {
          seen.set(key, result);
        }
      }
    }

    const deduplicated = Array.from(seen.values());
    deduplicated.sort((a, b) => b.score - a.score);
    deduplicated.forEach((r, i) => r.rank = i + 1);

    return deduplicated;
  }
}
```

---

## 📦 **PART 2: RE-RANKING IMPLEMENTATION**

### **Re-Ranking Service**

```typescript
// ─────────────────────────────────────────────
// ai/rag/reranking.service.ts
// ─────────────────────────────────────────────
import { Injectable, Logger } from '@nestjs/common';
import { RetrievalResult } from './retrieval.service';

export interface RerankingOptions {
  model?: 'cohere' | 'cross-encoder' | 'llm';
  topK?: number;
  scoreThreshold?: number;
}

@Injectable()
export class RerankingService {
  private readonly logger = new Logger(RerankingService.name);

  constructor(
    // Inject your LLM service or external API client
  ) {}

  // ─────────────────────────────────────────────
  // Re-rank Results (Main Method)
  // ─────────────────────────────────────────────
  async rerank(
    query: string,
    results: RetrievalResult[],
    options: RerankingOptions = {},
  ): Promise<RetrievalResult[]> {
    const {
      model = 'llm',
      topK = 5,
      scoreThreshold = 0.3,
    } = options;

    if (results.length === 0) {
      return [];
    }

    let reranked: RetrievalResult[];

    switch (model) {
      case 'cohere':
        reranked = await this.rerankWithCohere(query, results);
        break;
      case 'cross-encoder':
        reranked = await this.rerankWithCrossEncoder(query, results);
        break;
      case 'llm':
      default:
        reranked = await this.rerankWithLLM(query, results);
        break;
    }

    // Apply threshold
    reranked = reranked.filter(r => r.score >= scoreThreshold);

    // Limit to top K
    reranked = reranked.slice(0, topK);

    // Update ranks
    reranked.forEach((r, i) => r.rank = i + 1);

    this.logger.log(
      `Re-ranked ${results.length} → ${reranked.length} results`,
    );

    return reranked;
  }

  // ─────────────────────────────────────────────
  // Re-rank with Cohere API
  // ─────────────────────────────────────────────
  private async rerankWithCohere(
    query: string,
    results: RetrievalResult[],
  ): Promise<RetrievalResult[]> {
    // In production, use Cohere's rerank API
    // https://docs.cohere.com/reference/rerank

    const documents = results.map(r => r.content);

    // Example with Cohere SDK:
    // const response = await cohere.rerank({
    //   query,
    //   documents,
    //   topN: results.length,
    //   model: 'rerank-english-v2.0',
    // });

    // Placeholder: simulate Cohere-style scoring
    const reranked = results.map(result => {
      // Simulate relevance scoring
      const queryTerms = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const contentLower = result.content.toLowerCase();

      let relevanceScore = result.score;

      // Boost for query term matches
      for (const term of queryTerms) {
        if (contentLower.includes(term)) {
          relevanceScore += 0.15;
        }
        // Boost for term near beginning
        const firstOccurrence = contentLower.indexOf(term);
        if (firstOccurrence !== -1 && firstOccurrence < 200) {
          relevanceScore += 0.05;
        }
      }

      return {
        ...result,
        score: Math.min(1, relevanceScore),
      };
    });

    reranked.sort((a, b) => b.score - a.score);

    return reranked;
  }

  // ─────────────────────────────────────────────
  // Re-rank with Cross-Encoder
  // ─────────────────────────────────────────────
  private async rerankWithCrossEncoder(
    query: string,
    results: RetrievalResult[],
  ): Promise<RetrievalResult[]> {
    // In production, use sentence-transformers cross-encoder
    // Example: ms-marco-MiniLM-L-6-v2

    // This would require Python integration or external API
    // For now, use simplified scoring

    const reranked = results.map(result => {
      // Calculate semantic similarity boost
      const queryEmbedding = this.tokenize(query);
      const contentEmbedding = this.tokenize(result.content);

      // Simple overlap score
      const overlap = this.calculateOverlap(queryEmbedding, contentEmbedding);

      const newScore = (result.score * 0.5) + (overlap * 0.5);

      return {
        ...result,
        score: newScore,
      };
    });

    reranked.sort((a, b) => b.score - a.score);

    return reranked;
  }

  // ─────────────────────────────────────────────
  // Re-rank with LLM (Most Flexible)
  // ─────────────────────────────────────────────
  private async rerankWithLLM(
    query: string,
    results: RetrievalResult[],
  ): Promise<RetrievalResult[]> {
    // Prepare documents for ranking
    const documentsText = results
      .map((r, i) => `[${i}] ${r.content.substring(0, 300)}...`)
      .join('\n\n');

    const prompt = `
Rank these documents by relevance to the query.

Query: "${query}"

Documents:
${documentsText}

Rate each document's relevance from 0.0 (completely irrelevant) to 1.0 (perfectly relevant).
Consider:
- Does the document directly address the query?
- Is the information specific and useful?
- Does it contain key terms from the query?

Respond with JSON array:
[
  {"index": 0, "score": 0.95, "reason": "Brief explanation"},
  {"index": 1, "score": 0.75, "reason": "Brief explanation"}
]
`;

    try {
      // Call LLM for ranking
      // const response = await this.chatService.complete([...], {
      //   response_format: { type: 'json_object' },
      // });

      // Placeholder: use existing scores with small adjustments
      const rankings = results.map((r, i) => ({
        index: i,
        score: r.score + (Math.random() * 0.1 - 0.05),  // Small perturbation
        reason: 'Auto-ranked',
      }));

      // Apply rankings to results
      const reranked = rankings.map(r => ({
        ...results[r.index],
        score: r.score,
      }));

      reranked.sort((a, b) => b.score - a.score);

      return reranked;
    } catch (error) {
      this.logger.error(`LLM reranking failed: ${error.message}`);
      // Fall back to original ranking
      return [...results].sort((a, b) => b.score - a.score);
    }
  }

  // ─────────────────────────────────────────────
  // Helper: Tokenize (Simplified)
  // ─────────────────────────────────────────────
  private tokenize(text: string): string[] {
    return text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  }

  // ─────────────────────────────────────────────
  // Helper: Calculate Overlap
  // ─────────────────────────────────────────────
  private calculateOverlap(tokens1: string[], tokens2: string[]): number {
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);

    const intersection = [...set1].filter(t => set2.has(t)).length;
    const union = new Set([...set1, ...set2]).size;

    return union > 0 ? intersection / union : 0;
  }

  // ─────────────────────────────────────────────
  // Reciprocal Rank Fusion (RRF)
  // ─────────────────────────────────────────────
  reciprocalRankFusion(
    resultLists: RetrievalResult[][],
    k: number = 60,
  ): RetrievalResult[] {
    const rrfScores = new Map<string, { result: RetrievalResult; rrfScore: number }>();

    for (const resultList of resultLists) {
      for (let i = 0; i < resultList.length; i++) {
        const result = resultList[i];
        const key = `${result.metadata?.source || 'unknown'}:${result.metadata?.chunkId || i}`;

        const rrfScore = 1 / (k + i + 1);

        if (rrfScores.has(key)) {
          const existing = rrfScores.get(key);
          existing.rrfScore += rrfScore;
        } else {
          rrfScores.set(key, { result, rrfScore });
        }
      }
    }

    // Convert to array and sort
    const fused = Array.from(rrfScores.values())
      .sort((a, b) => b.rrfScore - a.rrfScore)
      .map((item, i) => ({
        ...item.result,
        score: item.rrfScore,
        rank: i + 1,
      }));

    return fused;
  }
}
```

---

## 📦 **PART 3: RAG EVALUATION**

### **RAG Evaluation Service**

```typescript
// ─────────────────────────────────────────────
// ai/rag/rag-evaluation.service.ts
// ─────────────────────────────────────────────
import { Injectable, Logger } from '@nestjs/common';
import { ChatService } from '../chat/chat.service';
import { RAGResponse } from './response-generator.service';

export interface EvaluationMetrics {
  faithfulness: number;
  answerRelevance: number;
  contextRelevance: number;
  answerCorrectness?: number;
  overall: number;
}

export interface EvaluationResult {
  query: string;
  response: RAGResponse;
  metrics: EvaluationMetrics;
  feedback: {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  };
}

@Injectable()
export class RAGEvaluationService {
  private readonly logger = new Logger(RAGEvaluationService.name);

  constructor(
    private chatService: ChatService,
  ) {}

  // ─────────────────────────────────────────────
  // Evaluate RAG Response
  // ─────────────────────────────────────────────
  async evaluate(
    query: string,
    response: RAGResponse,
    options: {
      includeFeedback?: boolean;
      groundTruth?: string;
    } = {},
  ): Promise<EvaluationResult> {
    const { includeFeedback = true, groundTruth } = options;

    // Calculate metrics
    const faithfulness = await this.evaluateFaithfulness(query, response);
    const answerRelevance = await this.evaluateAnswerRelevance(query, response.answer);
    const contextRelevance = await this.evaluateContextRelevance(query, response.usedContext);

    // Calculate overall score
    const overall = (faithfulness + answerRelevance + contextRelevance) / 3;

    const result: EvaluationResult = {
      query,
      response,
      metrics: {
        faithfulness,
        answerRelevance,
        contextRelevance,
        overall,
      },
      feedback: {
        strengths: [],
        weaknesses: [],
        suggestions: [],
      },
    };

    // Add ground truth comparison if provided
    if (groundTruth) {
      result.metrics.answerCorrectness = await this.evaluateAnswerCorrectness(
        response.answer,
        groundTruth,
      );
      result.metrics.overall =
        (faithfulness + answerRelevance + contextRelevance + result.metrics.answerCorrectness) / 4;
    }

    // Generate feedback
    if (includeFeedback) {
      result.feedback = await this.generateFeedback(result);
    }

    return result;
  }

  // ─────────────────────────────────────────────
  // Evaluate Faithfulness (Hallucination Check)
  // ─────────────────────────────────────────────
  private async evaluateFaithfulness(
    query: string,
    response: RAGResponse,
  ): Promise<number> {
    const prompt = `
Evaluate if the answer is faithful to the provided context.

Context:
${response.usedContext}

Answer:
${response.answer}

Check:
1. Does the answer contain information NOT in the context?
2. Are there any contradictions with the context?
3. Are all claims supported by the context?

Rate faithfulness from 0.0 (completely unfaithful/hallucinated) to 1.0 (completely faithful).
Respond with ONLY a number between 0.0 and 1.0.
`;

    try {
      const rating = await this.chatService.complete([
        { role: 'user', content: prompt },
      ]);

      const score = parseFloat(rating);
      return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
    } catch (error) {
      this.logger.error(`Faithfulness evaluation failed: ${error.message}`);
      return 0.5;
    }
  }

  // ─────────────────────────────────────────────
  // Evaluate Answer Relevance
  // ─────────────────────────────────────────────
  private async evaluateAnswerRelevance(
    query: string,
    answer: string,
  ): Promise<number> {
    const prompt = `
Evaluate how relevant this answer is to the question.

Question: "${query}"

Answer: "${answer}"

Rate relevance from 0.0 (completely irrelevant) to 1.0 (perfectly relevant).
Consider:
- Does it directly address the question?
- Is the information useful?
- Does it avoid unnecessary tangents?

Respond with ONLY a number between 0.0 and 1.0.
`;

    try {
      const rating = await this.chatService.complete([
        { role: 'user', content: prompt },
      ]);

      const score = parseFloat(rating);
      return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
    } catch (error) {
      return 0.5;
    }
  }

  // ─────────────────────────────────────────────
  // Evaluate Context Relevance
  // ─────────────────────────────────────────────
  private async evaluateContextRelevance(
    query: string,
    context: string,
  ): Promise<number> {
    const prompt = `
Evaluate how relevant the retrieved context is to the question.

Question: "${query}"

Context:
${context.substring(0, 1000)}${context.length > 1000 ? '...' : ''}

Rate context relevance from 0.0 (completely irrelevant) to 1.0 (perfectly relevant).
Consider:
- Does the context contain information needed to answer?
- Is there mostly useful information vs noise?

Respond with ONLY a number between 0.0 and 1.0.
`;

    try {
      const rating = await this.chatService.complete([
        { role: 'user', content: prompt },
      ]);

      const score = parseFloat(rating);
      return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
    } catch (error) {
      return 0.5;
    }
  }

  // ─────────────────────────────────────────────
  // Evaluate Answer Correctness (vs Ground Truth)
  // ─────────────────────────────────────────────
  private async evaluateAnswerCorrectness(
    answer: string,
    groundTruth: string,
  ): Promise<number> {
    const prompt = `
Compare the answer to the ground truth.

Ground Truth: "${groundTruth}"

Answer: "${answer}"

Rate correctness from 0.0 (completely wrong) to 1.0 (completely correct).
Consider:
- Does the answer convey the same information?
- Are the key facts accurate?
- Minor wording differences are OK if meaning is preserved.

Respond with ONLY a number between 0.0 and 1.0.
`;

    try {
      const rating = await this.chatService.complete([
        { role: 'user', content: prompt },
      ]);

      const score = parseFloat(rating);
      return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
    } catch (error) {
      return 0.5;
    }
  }

  // ─────────────────────────────────────────────
  // Generate Feedback
  // ─────────────────────────────────────────────
  private async generateFeedback(
    result: EvaluationResult,
  ): Promise<{ strengths: string[]; weaknesses: string[]; suggestions: string[] }> {
    const { metrics, response } = result;

    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const suggestions: string[] = [];

    // Analyze metrics
    if (metrics.faithfulness >= 0.8) {
      strengths.push('Answer is well-grounded in the provided context');
    } else if (metrics.faithfulness < 0.5) {
      weaknesses.push('Answer may contain hallucinated information');
      suggestions.push('Improve retrieval to get more relevant context');
    }

    if (metrics.answerRelevance >= 0.8) {
      strengths.push('Answer directly addresses the query');
    } else if (metrics.answerRelevance < 0.5) {
      weaknesses.push('Answer may be off-topic or incomplete');
      suggestions.push('Review prompt template for better focus');
    }

    if (metrics.contextRelevance >= 0.8) {
      strengths.push('Retrieved context is highly relevant');
    } else if (metrics.contextRelevance < 0.5) {
      weaknesses.push('Retrieved context may not be relevant');
      suggestions.push('Improve retrieval strategy or query expansion');
    }

    if (response.confidence < 0.5) {
      weaknesses.push('Low confidence score');
      suggestions.push('Consider adding more diverse data sources');
    }

    return { strengths, weaknesses, suggestions };
  }

  // ─────────────────────────────────────────────
  // Batch Evaluation
  // ─────────────────────────────────────────────
  async batchEvaluate(
    evaluations: Array<{
      query: string;
      response: RAGResponse;
      groundTruth?: string;
    }>,
  ): Promise<{
    averageMetrics: EvaluationMetrics;
    individualResults: EvaluationResult[];
    summary: {
      totalQueries: number;
      excellentCount: number;
      goodCount: number;
      fairCount: number;
      poorCount: number;
    };
  }> {
    const results: EvaluationResult[] = [];

    for (const eval of evaluations) {
      const result = await this.evaluate(eval.query, eval.response, {
        groundTruth: eval.groundTruth,
      });
      results.push(result);
    }

    // Calculate averages
    const averageMetrics: EvaluationMetrics = {
      faithfulness: results.reduce((sum, r) => sum + r.metrics.faithfulness, 0) / results.length,
      answerRelevance: results.reduce((sum, r) => sum + r.metrics.answerRelevance, 0) / results.length,
      contextRelevance: results.reduce((sum, r) => sum + r.metrics.contextRelevance, 0) / results.length,
      overall: results.reduce((sum, r) => sum + r.metrics.overall, 0) / results.length,
    };

    // Categorize results
    const summary = {
      totalQueries: results.length,
      excellentCount: results.filter(r => r.metrics.overall >= 0.9).length,
      goodCount: results.filter(r => r.metrics.overall >= 0.7 && r.metrics.overall < 0.9).length,
      fairCount: results.filter(r => r.metrics.overall >= 0.5 && r.metrics.overall < 0.7).length,
      poorCount: results.filter(r => r.metrics.overall < 0.5).length,
    };

    return {
      averageMetrics,
      individualResults: results,
      summary,
    };
  }
}
```

---

## 📦 **PART 4: PRODUCTION OPTIMIZATION**

### **RAG Cache Service**

```typescript
// ─────────────────────────────────────────────
// ai/rag/rag-cache.service.ts
// ─────────────────────────────────────────────
import { Injectable, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';

export interface CacheEntry {
  query: string;
  response: any;
  createdAt: Date;
  accessCount: number;
}

@Injectable()
export class RAGCacheService {
  private readonly logger = new Logger(RAGCacheService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttl = 3600000;  // 1 hour default

  // ─────────────────────────────────────────────
  // Get from Cache
  // ─────────────────────────────────────────────
  async get(query: string): Promise<any | null> {
    const key = this.getCacheKey(query);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check TTL
    if (Date.now() - entry.createdAt.getTime() > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access count
    entry.accessCount++;

    this.logger.debug(`Cache hit for query: ${query.substring(0, 50)}...`);

    return entry.response;
  }

  // ─────────────────────────────────────────────
  // Set Cache
  // ─────────────────────────────────────────────
  async set(query: string, response: any): Promise<void> {
    const key = this.getCacheKey(query);

    this.cache.set(key, {
      query,
      response,
      createdAt: new Date(),
      accessCount: 1,
    });

    this.logger.debug(`Cached response for query: ${query.substring(0, 50)}...`);
  }

  // ─────────────────────────────────────────────
  // Delete from Cache
  // ─────────────────────────────────────────────
  async delete(query: string): Promise<void> {
    const key = this.getCacheKey(query);
    this.cache.delete(key);
  }

  // ─────────────────────────────────────────────
  // Clear Cache
  // ─────────────────────────────────────────────
  async clear(): Promise<void> {
    this.cache.clear();
    this.logger.log('RAG cache cleared');
  }

  // ─────────────────────────────────────────────
  // Get Cache Stats
  // ─────────────────────────────────────────────
  getStats(): {
    size: number;
    hits: number;
    ttl: number;
  } {
    const hits = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.accessCount, 0);

    return {
      size: this.cache.size,
      hits,
      ttl: this.ttl,
    };
  }

  // ─────────────────────────────────────────────
  // Cleanup Old Entries
  // ─────────────────────────────────────────────
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.createdAt.getTime() > this.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned ${cleaned} expired cache entries`);
    }
  }

  // ─────────────────────────────────────────────
  // Helper: Generate Cache Key
  // ─────────────────────────────────────────────
  private getCacheKey(query: string): string {
    const crypto = require('crypto');
    return `rag:${crypto.createHash('md5').update(query.toLowerCase().trim()).digest('hex')}`;
  }
}
```

---

## ✅ **ADVANCED RAG CHECKLIST**

```
Query Expansion
[ ] Multi-query implemented
[ ] Paraphrase strategy working
[ ] Step-back prompting
[ ] HyDE (Hypothetical Document)

Re-ranking
[ ] Cohere integration (optional)
[ ] LLM-based reranking
[ ] RRF fusion implemented
[ ] Threshold filtering

Evaluation
[ ] Faithfulness metric
[ ] Answer relevance
[ ] Context relevance
[ ] Ground truth comparison
[ ] Batch evaluation

Optimization
[ ] Query caching
[ ] Response caching
[ ] Batch processing
[ ] Parallel retrieval

Monitoring
[ ] Query analytics
[ ] Response quality tracking
[ ] User feedback collection
[ ] A/B testing setup
```

---

## 🎯 **KNOWLEDGE CHECK**

### **Question 1: What is HyDE?**

<details>
<summary>💡 Click to reveal answer</summary>

**HyDE = Hypothetical Document Embeddings**

**Process**:
1. ✅ Generate hypothetical answer to query
2. ✅ Embed the hypothetical answer
3. ✅ Search for similar documents
4. ✅ Use retrieved docs for actual answer

**Why it works**: Hypothetical answers have similar embedding space to relevant documents, improving retrieval!
</details>

---

### **Question 2: Why Re-rank After Retrieval?**

<details>
<summary>💡 Click to reveal answer</summary>

**Reasons**:
1. ✅ **Vector search is approximate** - May miss nuanced relevance
2. ✅ **Cross-encoders are more accurate** - Full attention between query & doc
3. ✅ **Better ranking = better context** = better final answer
4. ✅ **Filter low-quality results** - Remove borderline irrelevant docs

**Trade-off**: Re-ranking adds latency (100-500ms) but improves quality 10-30%!
</details>

---

## 📚 **ADDITIONAL RESOURCES**

- **Query Expansion**: [https://arxiv.org/abs/2212.10496](https://arxiv.org/abs/2212.10496)
- **Re-ranking Guide**: [https://docs.cohere.com/docs/rerank-guide](https://docs.cohere.com/docs/rerank-guide)
- **RAG Evaluation**: [https://arxiv.org/abs/2303.18223](https://arxiv.org/abs/2303.18223)

---

## 🎓 **HOMEWORK**

1. ✅ Implement multi-query retrieval
2. ✅ Add query expansion strategies
3. ✅ Build re-ranking service
4. ✅ Create evaluation metrics
5. ✅ Implement RAG caching
6. ✅ Set up batch evaluation
7. ✅ Add monitoring dashboard
8. ✅ Run A/B tests on strategies

---

**Next Lesson**: LangChain.js Fundamentals - AI Orchestration Framework
**Date**: 26-03-18
**Status**: ✅ Complete

---
*26-03-18*

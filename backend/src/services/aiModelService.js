/**
 * AI Model Service — Plan-aware model selection with fallback
 *
 * Free plan: Gemini Flash → fallback to GPT-4o-mini
 * Premium/School plan: GPT-4o directly (or GPT-4o-mini for lighter tasks)
 */

import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getUserPlanLimits } from './planRepository.js';

// ─── Clients ────────────────────────────────────────────────────────────────

let openaiClient = null;
let geminiClient = null;

const getOpenAI = () => {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
};

const getGemini = () => {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return geminiClient;
};

// ─── Model configs ──────────────────────────────────────────────────────────

const MODELS = {
  free: {
    primary: 'gemini',
    geminiModel: 'gemini-2.5-flash',
    openaiModel: 'gpt-4o-mini',
    fallbackModel: 'gpt-4o-mini',
    maxTokens: 1000,
    contentMaxTokens: 10000,
  },
  premium: {
    primary: 'openai',
    openaiModel: 'gpt-4o',
    contentModel: 'gpt-4o',
    fallbackModel: 'gpt-4o-mini',
    maxTokens: 2000,
    contentMaxTokens: 13000,
  },
  school: {
    primary: 'openai',
    openaiModel: 'gpt-4o',
    contentModel: 'gpt-4o',
    fallbackModel: 'gpt-4o-mini',
    maxTokens: 2000,
    contentMaxTokens: 13000,
  }
};

// ─── Get model config for a user ────────────────────────────────────────────

export async function getModelConfig(userId) {
  const { plan } = await getUserPlanLimits(userId);
  return MODELS[plan] || MODELS.free;
}

// ─── Unified chat completion ────────────────────────────────────────────────

/**
 * Call AI with automatic plan-based model selection and fallback.
 * @param {number} userId
 * @param {object} opts - { messages, maxTokens, temperature, jsonMode, purpose }
 * @returns {string} - The AI response content
 */
export async function chatCompletion(userId, { messages, maxTokens, temperature = 0.7, jsonMode = false, purpose = 'chat' }) {
  const config = await getModelConfig(userId);
  const effectiveMaxTokens = maxTokens || (purpose === 'content' ? config.contentMaxTokens : config.maxTokens);

  // Premium/School: direct OpenAI
  if (config.primary === 'openai') {
    const model = purpose === 'content' ? (config.contentModel || config.openaiModel) : config.openaiModel;
    return callOpenAI(model, messages, effectiveMaxTokens, temperature, jsonMode);
  }

  // Free plan: try Gemini first, fallback to cheap GPT
  const gemini = getGemini();
  if (gemini) {
    try {
      return await callGemini(config.geminiModel, messages, effectiveMaxTokens, temperature, jsonMode);
    } catch (err) {
      console.warn(`[AIModel] Gemini failed (${err.message}), falling back to OpenAI ${config.fallbackModel}`);
    }
  }

  // Fallback
  return callOpenAI(config.fallbackModel, messages, effectiveMaxTokens, temperature, jsonMode);
}

// ─── OpenAI call ────────────────────────────────────────────────────────────

async function callOpenAI(model, messages, maxTokens, temperature, jsonMode) {
  const openai = getOpenAI();
  const params = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
  };
  if (jsonMode) {
    params.response_format = { type: 'json_object' };
  }
  const response = await openai.chat.completions.create(params);
  return response.choices[0].message.content.trim();
}

// ─── Gemini call ────────────────────────────────────────────────────────────

async function callGemini(modelName, messages, maxTokens, temperature, jsonMode) {
  const gemini = getGemini();
  if (!gemini) throw new Error('Gemini not configured');

  const model = gemini.getGenerativeModel({
    model: modelName,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
      ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
    },
  });

  // Convert OpenAI-format messages to Gemini format
  const systemMsg = messages.find(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');

  const history = [];
  for (let i = 0; i < chatMessages.length - 1; i++) {
    const msg = chatMessages[i];
    history.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    });
  }

  const lastMsg = chatMessages[chatMessages.length - 1];
  let userPrompt = lastMsg?.content || '';

  // Prepend system message as context for Gemini
  if (systemMsg) {
    userPrompt = `[System instructions]: ${systemMsg.content}\n\n${userPrompt}`;
  }

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(userPrompt);
  const text = result.response.text();

  if (!text || text.trim().length === 0) {
    throw new Error('Empty Gemini response');
  }

  return text.trim();
}

// ─── Title generation (lightweight, always cheap model) ─────────────────────

export async function generateConversationTitle(firstUserMessage, assistantResponse, customSystemPrompt = null) {
  const openai = getOpenAI();
  const systemContent = customSystemPrompt || 'Generate a very short conversation title (max 40 chars) based on the first exchange. Respond with ONLY the title, no quotes, no extra text. Use the same language as the user message.';
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: `User: ${firstUserMessage.substring(0, 200)}\nAssistant: ${assistantResponse.substring(0, 200)}` }
    ],
    max_tokens: 30,
    temperature: 0.5,
  });
  return response.choices[0].message.content.trim().substring(0, 60);
}

import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { loadPlanLimits } from '../middlewares/quotaMiddleware.js';
import * as convRepo from '../services/conversationRepository.js';
import { chatCompletion, generateConversationTitle } from '../services/aiModelService.js';
import { getUserPlanLimits } from '../services/planRepository.js';
import { checkAndIncrement } from '../services/dailyUsageRepository.js';
import { query } from '../config/database.js';

const router = express.Router();
router.use(authenticate);
router.use(loadPlanLimits);

const DEFAULT_SYSTEM_PROMPT = `You are Aron, an intelligent, calm and supportive educational assistant.
You help students understand their courses, revise and improve.
Always respond concisely, clearly and encouragingly.
IMPORTANT: Always respond in the exact same language the user writes in. If they write in French, respond in French. If they write in English, respond in English.`;

const DEFAULT_CONTEXT_PREFIX = `The user has shared the following learning materials with you as context. Use them to answer questions more precisely:`;

// ─── Greeting responses (bypass API for simple greetings) ─────────────────────

const GREETING_RESPONSES = {
  // French greetings
  'salut': 'Salut ! 👋 Je suis Aron, ton assistant d\'étude. Prêt à t\'aider avec tes cours, révisions ou exercices. De quoi as-tu besoin aujourd\'hui ?',
  'bonjour': 'Bonjour ! ☀️ Je suis Aron, ton assistant pédagogique. Je peux t\'aider à comprendre tes cours, réviser ou créer des exercices personnalisés. Qu\'est-ce que tu aimerais travailler ?',
  'bonsoir': 'Bonsoir ! 🌙 Je suis Aron, ton assistant d\'étude. Prêt à t\'aider pour une session de révision ou pour répondre à tes questions. De quoi as-tu besoin ?',
  'coucou': 'Coucou ! 👋 Je suis Aron, ton assistant pour apprendre. Que puis-je faire pour toi aujourd\'hui ?',
  'hey': 'Hey ! 👋 Aron à l\'écoute. Prêt à t\'aider avec tes études. Quel est ton besoin ?',
  'hello': 'Hello ! 👋 Je suis Aron, ton assistant éducatif. Comment puis-je t\'aider aujourd\'hui ?',
  'yo': 'Yo ! 👋 Aron est là. Prêt à bosser ensemble ? De quoi as-tu besoin ?',
  'wesh': 'Wesh ! 👋 Je suis Aron, ton assistant d\'étude. Qu\'est-ce qu\'on travaille aujourd\'hui ?',
  'bonjour aron': 'Bonjour ! ☀️ Ravie d\'être là. Je peux t\'aider avec tes cours, créer des exercices ciblés ou analyser tes lacunes. Par quoi on commence ?',
  'salut aron': 'Salut ! 👋 Prêt à t\'aider. Que puis-je faire pour toi ?',
  'comment ça va': 'Je vais bien, merci ! 😊 Et toi, comment se passe ta journée d\'étude ? Comment puis-je t\'aider aujourd\'hui ?',
  'comment vas tu': 'Je vais bien, merci ! 😊 Prêt à t\'aider avec tes cours. De quoi as-tu besoin ?',
  'ça va': 'Ça va super ! 👍 Prêt à t\'aider avec tes révisions. Quel sujet veux-tu aborder ?',
  'ca va': 'Ça va super ! 👍 Prêt à t\'aider avec tes révisions. Quel sujet veux-tu aborder ?',
  'quoi de neuf': 'Pas grand-chose de mon côté, juste l\'envie de t\'aider à progresser ! 📚 Tu travailles sur quoi en ce moment ?',
  'bienvenue': 'Merci ! 🎉 Je suis là pour t\'accompagner dans tes études. Comment puis-je t\'être utile ?',
  'merci': 'Avec plaisir ! 😊 N\'hésite pas si tu as d\'autres questions. Je suis là pour ça !',
  'ok': 'D\'accord ! 👍 Que puis-je faire pour toi maintenant ?',
  'okay': 'D\'accord ! 👍 Que puis-je faire pour toi maintenant ?',
  'daccord': 'D\'accord ! 👍 Que puis-je faire pour toi maintenant ?',
  'cool': 'Cool ! 😎 Prêt à avancer. De quoi as-tu besoin ?',
  'super': 'Super ! 🌟 Qu\'est-ce qu\'on travaille ensemble ?',
  'génial': 'Génial ! 🎉 Je suis prêt à t\'aider. Quel est ton besoin ?',
  'genial': 'Génial ! 🎉 Je suis prêt à t\'aider. Quel est ton besoin ?',
  'à plus': 'À plus tard ! 👋 N\'hésite pas à revenir quand tu veux travailler. Bon courage !',
  'a plus': 'À plus tard ! 👋 N\'hésite pas à revenir quand tu veux travailler. Bon courage !',
  'au revoir': 'Au revoir ! 👋 Bon courage pour tes études. Reviens quand tu veux !',
  'bye': 'Bye bye ! 👋 À bientôt et bon courage !',
  'ciao': 'Ciao ! 👋 À la prochaine, bon courage pour tes révisions !',
  'merci beaucoup': 'Avec grand plaisir ! 🙌 Je suis là quand tu en as besoin. Bon courage pour la suite !',
  'nickel': 'Nickel ! 👌 Je suis prêt quand tu l\'es. Que veux-tu faire maintenant ?',
  'parfait': 'Parfait ! ✨ On continue ? Que puis-je faire pour toi ?',
  'bravo': 'Merci ! 🙏 C\'est un plaisir de t\'aider. Qu\'est-ce qu\'on fait maintenant ?',
  'helo': 'Hello ! 👋 Je suis Aron, ton assistant éducatif. Comment puis-je t\'aider aujourd\'hui ?',
  're': 'Re ! 👋 Bienvenue de retour. On continue où on s\'était arrêtés ?',
  'rebonjour': 'Rebonjour ! ☀️ Content de te revoir. Que puis-je faire pour toi ?',
  'comment tu vas': 'Je vais très bien, merci ! 😊 Et toi, prêt pour une session productive ?',
  'tu vas bien': 'Je vais très bien, merci ! 😊 Je suis prêt à t\'aider avec tes études. Quel est ton besoin ?',
  // English greetings
  'hi': 'Hi there! 👋 I\'m Aron, your study assistant. Ready to help with your courses, revision, or exercises. What do you need today?',
  'how are you': 'I\'m doing great, thanks! 😊 Ready to help you with your studies. What can I do for you?',
  'good morning': 'Good morning! ☀️ I\'m Aron, your educational assistant. How can I help you start your study session?',
  'good evening': 'Good evening! 🌙 I\'m Aron, ready to help with any last-minute revision or questions. What do you need?',
  'what\'s up': 'Not much, just ready to help you learn! 📚 What are you working on today?',
  'thanks': 'You\'re welcome! 😊 Feel free to ask if you need anything else. I\'m here to help!',
  'thank you': 'You\'re very welcome! 🙌 Let me know whenever you need assistance. Good luck!',
  'great': 'Great! 🌟 What shall we work on together?',
  'awesome': 'Awesome! 😎 Ready to go. What do you need help with?',
  'goodbye': 'Goodbye! 👋 Good luck with your studies. Come back anytime!',
  'see you': 'See you later! 👋 Good luck and come back when you\'re ready to study!',
};

function getGreetingResponse(content) {
  const normalized = content.trim().toLowerCase().replace(/[!?.,]/g, '').replace(/\s+/g, ' ');
  return GREETING_RESPONSES[normalized] || null;
}

async function getSystemPrompt(name, fallback) {
  try {
    const rows = await query(`SELECT content FROM system_prompts WHERE name = ? LIMIT 1`, [name]);
    return rows[0]?.content || fallback;
  } catch { return fallback; }
}

async function getSynthesesContent(syntheseIds, userId) {
  if (!syntheseIds || !syntheseIds.length) return null;
  try {
    const placeholders = syntheseIds.map(() => '?').join(',');
    const rows = await query(
      `SELECT title, summary_content FROM syntheses WHERE id IN (${placeholders}) AND user_id = ? AND is_archived = 0`,
      [...syntheseIds, userId]
    );
    if (!rows.length) return null;
    return rows.map(s => `## ${s.title}\n${s.summary_content}`).join('\n\n---\n\n');
  } catch { return null; }
}

// ─── List conversations ─────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const conversations = await convRepo.getConversationsByUser(req.user.id);
    res.json({ conversations });
  } catch (err) { next(err); }
});

// ─── Create new conversation ────────────────────────────────────────────────

router.post('/', async (req, res, next) => {
  try {
    const maxConv = req.planLimits?.max_conversations || 3;
    const currentCount = await convRepo.countConversationsByUser(req.user.id);
    if (currentCount >= maxConv) {
      return res.status(403).json({
        error: 'CONVERSATION_LIMIT',
        current: currentCount,
        limit: maxConv,
        message: `Limite de conversations atteinte (${currentCount}/${maxConv})`
      });
    }
    const conversation = await convRepo.createConversation(req.user.id);
    res.status(201).json({ conversation });
  } catch (err) { next(err); }
});

// ─── Get conversation with messages ─────────────────────────────────────────

router.get('/:id', async (req, res, next) => {
  try {
    const conversation = await convRepo.getConversationById(parseInt(req.params.id), req.user.id);
    if (!conversation) return res.status(404).json({ error: 'Conversation non trouvée' });

    const messages = await convRepo.getMessages(conversation.id);
    res.json({ conversation, messages });
  } catch (err) { next(err); }
});

// ─── Delete conversation ────────────────────────────────────────────────────

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await convRepo.deleteConversation(parseInt(req.params.id), req.user.id);
    if (!deleted) return res.status(404).json({ error: 'Conversation non trouvée' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── Update conversation context (syntheses) ────────────────────────────────

router.patch('/:id/context', async (req, res, next) => {
  try {
    const conversationId = parseInt(req.params.id);
    const { syntheseIds } = req.body;
    const conversation = await convRepo.getConversationById(conversationId, req.user.id);
    if (!conversation) return res.status(404).json({ error: 'Conversation non trouvée' });

    const ids = Array.isArray(syntheseIds) ? syntheseIds.map(Number).filter(Boolean) : [];
    await convRepo.updateConversationContext(conversationId, ids);
    res.json({ success: true, syntheseIds: ids });
  } catch (err) { next(err); }
});

// ─── Send message in conversation ───────────────────────────────────────────

router.post('/:id/messages', async (req, res, next) => {
  try {
    const conversationId = parseInt(req.params.id);
    const { content, syntheseIds } = req.body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'content requis' });
    }

    // Check message length limit
    const maxChars = req.planLimits?.max_char_per_message || 500;
    if (content.length > maxChars) {
      return res.status(400).json({
        error: 'MESSAGE_TOO_LONG',
        maxChars,
        plan: req.userPlan,
        message: `Message trop long (${content.length}/${maxChars} caractères)`
      });
    }

    // Check daily chat limit
    const chatUsage = await checkAndIncrement(req.user.id, 'chat');
    if (!chatUsage.allowed) {
      return res.status(429).json({
        error: 'DAILY_CHAT_LIMIT',
        current: chatUsage.current,
        limit: chatUsage.limit
      });
    }

    // Verify conversation belongs to user
    const conversation = await convRepo.getConversationById(conversationId, req.user.id);
    if (!conversation) return res.status(404).json({ error: 'Conversation non trouvée' });

    // Check for simple greetings - bypass API to save costs
    const greetingResponse = getGreetingResponse(content);
    if (greetingResponse) {
      // Save user message
      await convRepo.addMessage(conversationId, 'user', content.trim());
      // Save assistant greeting response
      await convRepo.addMessage(conversationId, 'assistant', greetingResponse);

      // Auto-generate title on first greeting if needed
      const messageCount = await convRepo.getMessageCount(conversationId);
      if (messageCount <= 2 && !conversation.title) {
        try {
          const title = 'Conversation';
          await convRepo.updateConversationTitle(conversationId, title);
        } catch (titleErr) {
          console.warn('[Conversation] Title generation skipped for greeting:', titleErr.message);
        }
      }

      const updatedConv = await convRepo.getConversationById(conversationId, req.user.id);
      return res.json({
        message: greetingResponse,
        conversation: updatedConv
      });
    }

    // Load dynamic system prompt from DB
    const systemPromptContent = await getSystemPrompt('aron_main', DEFAULT_SYSTEM_PROMPT);

    // Build system prompt with optional syntheses context
    const contextIds = syntheseIds || conversation.context_synthese_ids || [];
    let finalSystemPrompt = systemPromptContent;

    if (contextIds.length > 0) {
      const contextPrefix = await getSystemPrompt('aron_context_prefix', DEFAULT_CONTEXT_PREFIX);
      const synthesesContent = await getSynthesesContent(contextIds, req.user.id);
      if (synthesesContent) {
        finalSystemPrompt = `${systemPromptContent}\n\n${contextPrefix}\n\n${synthesesContent}`;
      }
    }

    // Save user message
    await convRepo.addMessage(conversationId, 'user', content.trim());

    // Build context from conversation history (last 20 messages)
    const history = await convRepo.getMessages(conversationId, 20);
    const messages = [
      { role: 'system', content: finalSystemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content }))
    ];

    // Call AI with plan-aware model
    const aiResponse = await chatCompletion(req.user.id, {
      messages,
      purpose: 'chat'
    });

    // Save assistant response
    await convRepo.addMessage(conversationId, 'assistant', aiResponse);

    // Auto-generate title on first message
    const messageCount = await convRepo.getMessageCount(conversationId);
    if (messageCount <= 2 && !conversation.title) {
      try {
        const titlePrompt = await getSystemPrompt('aron_title_gen', null);
        const title = await generateConversationTitle(content.trim(), aiResponse, titlePrompt);
        await convRepo.updateConversationTitle(conversationId, title);
      } catch (titleErr) {
        console.warn('[Conversation] Title generation failed:', titleErr.message);
      }
    }

    // Return updated conversation info
    const updatedConv = await convRepo.getConversationById(conversationId, req.user.id);

    res.json({
      message: aiResponse,
      conversation: updatedConv
    });
  } catch (err) { next(err); }
});

// ─── Rename conversation ────────────────────────────────────────────────────

router.patch('/:id', async (req, res, next) => {
  try {
    const conversationId = parseInt(req.params.id);
    const { title } = req.body;
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'title requis' });
    }
    const conversation = await convRepo.getConversationById(conversationId, req.user.id);
    if (!conversation) return res.status(404).json({ error: 'Conversation non trouvée' });

    await convRepo.updateConversationTitle(conversationId, title.trim().substring(0, 255));
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;

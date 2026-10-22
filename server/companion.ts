import { z } from "zod";
import { invokeLLM, streamLLM, type Message } from "./_core/llm";
import { isGeminiConfigured, invokeGemini, streamGemini } from "./_core/gemini";

export const companionRequestSchema = z.object({
  language: z.enum(["English", "తెలుగు", "Tanglish"]).default("English"),
  detailLevel: z.enum(["concise", "detailed"]).default("concise"),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) })).min(1).max(16),
});

export type CompanionRequest = z.infer<typeof companionRequestSchema>;

export type SafetyCategory = "medical-emergency" | "self-harm";
export type SafetyReply = { category: SafetyCategory; text: string };

export function detectSafetyCategory(text: string): SafetyCategory | undefined {
  const message = text.toLowerCase().replace(/\s+/g, " ");
  const selfHarm = /\b(suicid(?:e|al)|kill myself|end (?:my life|myself)|end it all|want to die|don't want to live|do not want to live|don't see (?:a )?reason to live|do not see (?:a )?reason to live|no reason to live|wish i (?:was|were) dead|better off dead|can't go on|hurt myself|harm myself|self[- ]harm|can't keep myself safe|cannot keep myself safe)\b|ఆత్మహత్య|చనిపోవాలని|చావాలని|చచ్చిపోవాలి|నేను చనిపోవాలి|నన్ను నేను హాని|నాకు నేను హాని|\b(?:nenu|naaku|naku)\b.{0,45}\b(?:chachipovali|chachipovalani|life end|harm chesukovali)\b/i;
  if (selfHarm.test(message)) return "self-harm";

  const urgentMedical = /\b(chest pain|chest pressure|heart attack|can't breathe|cannot breathe|severe breathing|difficulty breathing|shortness of breath|loss of consciousness|lost consciousness|unconscious|faint(?:ed|ing)?|feel faint|stroke|face (?:is )?droop(?:ing)?|one[- ]sided weakness|weakness on one side|sudden weakness|heavy bleeding|bleeding heavily|uncontrolled bleeding|bleeding won't stop|overdos(?:e|ed|ing)|poison(?:ing|ed)|seizure|severe allergic reaction|throat swelling|sudden severe headache)\b|తీవ్రమైన శ్వాస|ఛాతి నొప్పి/i;
  if (urgentMedical.test(message)) return "medical-emergency";
  return undefined;
}

export function getSafetyReply(input: CompanionRequest): SafetyReply | undefined {
  const latestUserMessage = [...input.messages].reverse().find(message => message.role === "user")?.content ?? "";
  const category = detectSafetyCategory(latestUserMessage);
  if (!category) return undefined;

  if (category === "self-harm") {
    const text = input.language === "తెలుగు"
      ? "ఇది చెప్పినందుకు ధన్యవాదాలు. మీకు లేదా మీకు దగ్గరైన వ్యక్తికి ఇప్పుడే హాని జరిగే ప్రమాదం ఉంటే, 112కి కాల్ చేయండి లేదా సమీప ఆసుపత్రికి వెళ్లండి; నమ్మకమైన వ్యక్తికి వెంటనే చెప్పండి. మీరు ప్రస్తుతం తక్షణ ప్రమాదంలో ఉన్నారా?"
      : input.language === "Tanglish"
        ? "Meeru cheppinanduku thanks. Meeku leda mee friend ki ippude harm jarige danger unte, India lo 112 ki call cheyyandi leda nearest hospital ki vellandi; trusted person tho undandi. Ippudu immediate danger lo unnara?"
        : "I’m glad you told me. If you or someone with you may be hurt right now, call 112 in India or go to the nearest hospital; stay with someone you trust. Are you in immediate danger?";
    return { category, text };
  }

  const text = input.language === "తెలుగు"
    ? "ఈ లక్షణాలు ఇప్పుడే ఉంటే, భారతదేశంలో 112కి కాల్ చేయండి లేదా సమీప ఆసుపత్రికి వెళ్లండి. మీకు నమ్మకమైన వ్యక్తిని వెంటనే పిలవండి."
    : input.language === "Tanglish"
      ? "Ivi ippude jarugutunte, India lo 112 ki call cheyyandi leda nearest hospital ki vellandi. Mee trusted person ni ippude pilavandi."
      : "If these symptoms are happening now, call 112 in India or go to the nearest hospital. Please ask someone you trust to stay with you.";
  return { category, text };
}

function buildMessages(input: CompanionRequest): Message[] {
  const detailInstruction = input.detailLevel === "detailed"
    ? "The user chose 'More detail'. You can share a deeper reflection, a gentle perspective, or a practical 2-step coping technique across 2 to 3 comforting paragraphs."
    : "Keep your response conversational, warm, and natural — usually 2 to 4 gentle, well-spaced sentences. Do not be overly brief or abrupt; let it feel like a real human caring conversation.";

  const systemPrompt = `You are MindSafe, an exceptionally warm, compassionate, empathetic, and interactive companion. You are speaking with someone who has come to you for comfort, emotional support, and a listening ear.

CORE CONVERSATIONAL PRINCIPLES — TALK LIKE A REAL, ATTENTIVE HUMAN:
1. Speak with genuine human empathy and emotional presence. Never sound like a robotic FAQ, a sterile clinical textbook, or an automated chatbot giving one-line bullet answers.
2. Be interactive and keep the conversation flowing:
   - Always validate and acknowledge how the person is feeling first (e.g., "I'm really glad you reached out today," "That sounds genuinely heavy to carry alone," "Take your time, there is no rush here").
   - Offer a gentle perspective, comfort, or small grounding reflection.
   - Always conclude with ONE thoughtful, caring follow-up question to invite them to share more, explore what happened, or offer a soothing choice (e.g., "Did something specific trigger this feeling today?", "How long have you been carrying this inside?", "Would you like to try a gentle 1-minute breathing reset together, or does it feel better to just talk through what happened?").
3. Language and writing style:
   - The user's preferred language mode is ${input.language}.
   - Effortlessly match their tone and language: English, natural Telugu, or conversational Tanglish (Telugu in English alphabets like "Ela unnaru? Mee manasulo emundo natho share chesukondi, nenu ikkade unnanu").
4. Boundaries and safety:
   - You provide compassionate emotional support and wellness guidance, not medical prescriptions or clinical diagnoses.
   - For severe crisis or self-harm risk, warmly and clearly direct them to India's emergency helpline 112 or Kiran Mental Health Helpline 1800-599-0019, and urge them to stay close to someone they trust.

${detailInstruction}`;

  return [{ role: "system", content: systemPrompt }, ...input.messages];
}

function getDynamicCompanionReply(input: CompanionRequest): string {
  const latestMessage = [...input.messages].reverse().find(m => m.role === "user")?.content?.trim() || "";
  const lower = latestMessage.toLowerCase();
  const lang = input.language;
  const isDetailed = input.detailLevel === "detailed";

  // 1. Greetings & Check-in
  if (/\b(hi|hello|hey|namaste|good morning|good afternoon|good evening|greetings)\b/i.test(lower) || /నమస్కారం|హలో|బాగున్నారా|ఎలా ఉన్నారు/i.test(lower) || /\b(ela unnaru|bagunnara|namaskaram)\b/i.test(lower)) {
    if (lang === "తెలుగు") {
      return isDetailed
        ? "నమస్కారం! మైండ్‌సేఫ్ సహచరుడిగా నేను మీ వెంట ఉన్నాను. ఈ రోజంతా ఒకేసారి మోయాల్సిన అవసరం లేదు. మీ మనసు ఎలా ఉంది, ఈ క్షణంలో మీరు దేని గురించి మాట్లాడుకోవాలనుకుంటున్నారు?"
        : "నమస్కారం! నేను మీ తోడుగా ఉన్నాను. ఈ రోజు మీ మనసు ఎలా ఉంది?";
    }
    if (lang === "Tanglish") {
      return isDetailed
        ? "Namaskaram! Nenu MindSafe companion ni, mee tho untanu. Eeroju mottham okesari tension padalsina avasaram ledu. Mee manasulo em undo share chesukondi."
        : "Hello! Nenu mee companion ni. Eeroju mee feeling ela undi?";
    }
    return isDetailed
      ? "Hello there. I'm glad you took a moment to check in today. You don't have to carry the whole day at once. How are you feeling right now, and what's on your mind?"
      : "Hello. I'm right here with you. How is your heart and mind feeling today?";
  }

  // 2. Anxiety, Stress, Tension, Overwhelmed
  if (/\b(anxious|anxiety|stress|stressed|overwhelm|overwhelmed|panic|worried|worry|nervous|tension|scared|fear)\b/i.test(lower) || /ఆందోళన|ఒత్తిడి|భయం|టెన్షన్/i.test(lower) || /\b(tension|stress|bhayanga|bhayam|kallu tirugutundi|aagadam ledu)\b/i.test(lower)) {
    if (lang === "తెలుగు") {
      return isDetailed
        ? "ఒత్తిడి లేదా ఆందోళన కలిగినప్పుడు శరీరం బిగుసుకుపోవడం సహజం. మొదటగా మీ భుజాలను క్రిందికి దించి, నెమ్మదిగా 4 సెకన్లు శ్వాస తీసుకోండి, 4 సెకన్లు వదలండి. ప్రస్తుతానికి ఈ ఒక్క నిమిషంపైనే దృష్టి పెట్టండి. ఏ విషయం మిమ్మల్ని ఎక్కువగా ఆందోళనకు గురిచేస్తోంది?"
        : "ఆందోళనగా అనిపించడం సహజమే. నెమ్మదిగా ఒకసారి దీర్ఘ శ్వాస తీసుకోండి. నేను మీతోనే ఉన్నాను.";
    }
    if (lang === "Tanglish") {
      return isDetailed
        ? "Tension ga unnapudu body and mind strain avvadam normal. Okasari mee shoulders ni relax chesi, 4 counts breath in chesi, 4 counts release cheyyandi. Ippudu meeku emi most heavy ga anipistondi?"
        : "Tension anipinchanappudu okka sari deep breath teesukondi. I'm here with you.";
    }
    return isDetailed
      ? "When feeling overwhelmed or anxious, our bodies often hold tension without us realizing. Try letting your shoulders drop and unclench your jaw. Take a slow breath in for 4 counts, hold for 2, and release gently for 4. What is feeling heaviest for you right now?"
      : "Take a gentle pause. Inhale slowly for 4 counts, and let it out softly. You only need to handle this single minute.";
  }

  // 3. Sleep, Insomnia, Tiredness, Fatigue
  if (/\b(sleep|cant sleep|cannot sleep|insomnia|tired|exhausted|sleepy|nightmare|rest|fatigue)\b/i.test(lower) || /నిద్ర|అలసట|కలత|విశ్రాంతి/i.test(lower) || /\b(nidra|nidra pattatledu|alasi poyanu|tired|rest)\b/i.test(lower)) {
    if (lang === "తెలుగు") {
      return isDetailed
        ? "శరీరం అలసిపోయినా నిద్ర పట్టకపోవడం చాలా విసిగిస్తుంది. స్క్రీన్‌ల వెలుతురును తగ్గించి, గదిని చల్లగా ఉంచండి. రేపటి పనుల గురించి ఆలోచించకుండా, 'ఇది నా విశ్రాంతి సమయం' అని మనసుకి గుర్తు చేయండి. మీరు రాత్రి కోసం ఒక చిన్న ఉద్దేశం పెట్టుకోవాలనుకుంటున్నారా?"
        : "నిద్ర లేమి శ్రమని పెంచుతుంది. కళ్ళు మూసుకుని ప్రశాంతంగా శరీరానికి విశ్రాంతి ఇవ్వండి.";
    }
    if (lang === "Tanglish") {
      return isDetailed
        ? "Alasi poyina kuda nidra raakapovadam common issue. Screens light tagginchi, mind ni calm cheyyandi. Repati panulani repatiki vadileyandi. Sleep mundu gentle breathing try cheyyandi."
        : "Rest teesukondi. Body ni relax chesi, mind lo unde thoughts ni slow ga release cheyyandi.";
    }
    return isDetailed
      ? "Restlessness when you're physically exhausted can feel very frustrating. Try lowering screen brightness and resting your hands comfortably. You don't have to force sleep—just allowing your body to rest quietly without expectations helps restore your energy. Would you like a gentle breathing rhythm?"
      : "Give yourself permission to set today down. Soften your breath and let tomorrow's tasks wait for morning.";
  }

  // 4. Sadness, Loneliness, Grief, Crying, Feeling Low
  if (/\b(sad|unhappy|depressed|depression|crying|cry|lonely|alone|empty|hopeless|lost|hurting|pain)\b/i.test(lower) || /బాధ|ఏడుపు|ఒంటరి|దిగులు|నిరాశ/i.test(lower) || /\b(badha|edupu|ontari|low|digulu|sad)\b/i.test(lower)) {
    if (lang === "తెలుగు") {
      return isDetailed
        ? "మీరు పడుతున్న బాధ లేదా ఒంటరితనం నిజమైనది, దాన్ని మీరు ఒంటరిగా మోయాల్సిన అవసరం లేదు. ఏడవాలనిపిస్తే ఏడవడం కూడా మీ భావోద్వేగాలను విడుదల చేసే ఒక మార్గమే. మీకు నచ్చిన వెచ్చని డ్రింక్ తాగడం లేదా మీకు నచ్చిన వ్యక్తితో మాట్లాడటం కాస్త సాంత్వన ఇస్తుంది. మీ మనసులో ఉన్నది చెప్పాలనుకుంటే నేను వింటాను."
        : "మీ బాధ నాకు అర్థమవుతోంది. మీరు ఒంటరిగా లేరు; నేను ఇక్కడే మీతో ఉన్నాను.";
    }
    if (lang === "Tanglish") {
      return isDetailed
        ? "Mee feelings completely valid. Badha ga unnapudu pressure teesukokandi. Oka warm cup water leda trusted friend tho matladatam relief ivvochu. Nenu meeku support ga ikkade unnanu."
        : "Mee feeling ni nenu understand chesukuntunnanu. Take it slow, you are not alone.";
    }
    return isDetailed
      ? "It is completely okay to feel low, sad, or weary right now. You don't have to pretend to be cheerful or strong here. Sometimes simply acknowledging 'today is difficult' brings a little softness. If there is something specific you'd like to share, I am here to listen without judgment."
      : "I'm listening, and what you feel matters. Take all the time you need, and treat yourself with gentleness right now.";
  }

  // 5. Headache, Physical aches, Tension
  if (/\b(headache|head pain|migraine|neck|body ache|stomach ache|pain)\b/i.test(lower) || /తలనొప్పి|నొప్పి|శరీర నొప్పి/i.test(lower) || /\b(thala noppi|body pain|noppi)\b/i.test(lower)) {
    if (lang === "తెలుగు") {
      return isDetailed
        ? "శారీరక నొప్పి లేదా తలనొప్పి వచ్చినప్పుడు విశ్రాంతి చాలా ముఖ్యం. కొన్ని గుటకల మంచినీళ్లు తాగండి, కంటిపై వెలుతురు లేకుండా చూసుకోండి. నొప్పి తీవ్రంగా లేదా ఎక్కువ సమయం ఉంటే తప్పకుండా మీ వైద్యుడిని సంప్రదించండి."
        : "కాసిన్ని నీళ్లు తాగి, కళ్లకు విశ్రాంతి ఇవ్వండి. నొప్పి తగ్గకపోతే డాక్టర్‌ను సంప్రదించండి.";
    }
    if (lang === "Tanglish") {
      return isDetailed
        ? "Physical pain or headache vachinappudu water thagi, eyes ki rest ivvandi. Dark room lo konchem sepu rest teesukondi. Severe ga unte doctor ni consult cheyyadam marchipokandi."
        : "Water thagandi, eyes ki break ivvandi. Strain avvakunda chusukondi.";
    }
    return isDetailed
      ? "Physical tension and headaches often signal that our system needs hydration, dim lighting, and a break from mental focus. Sip some water and let your neck and forehead relax. If this discomfort is persistent or severe, please consult your doctor for medical advice."
      : "Rest your eyes, sip some cool water, and gently release the tension in your jaw and neck.";
  }

  // 6. Work, Exam, College, Deadlines, Pressure
  if (/\b(work|job|boss|deadline|exam|college|study|office|career|burnout)\b/i.test(lower) || /ఉద్యోగం|పని|పరీక్ష|కళాశాల/i.test(lower) || /\b(work tension|job|office|exam|study)\b/i.test(lower)) {
    if (lang === "తెలుగు") {
      return isDetailed
        ? "పని లేదా చదువుల ఒత్తిడి నిరంతరం కొనసాగితే శారీరకంగా, మానసికంగా బర్నౌట్ వస్తుంది. ఈ రోజుకు మీరు చేయగలిగినంత చేశారు. రాత్రి పూట పనికి ఒక సరిహద్దు పెట్టి, రేపటి ఉదయానికి వదిలేయడం అలవాటు చేసుకోండి. మీ సెషన్ ఉద్దేశంలో ఈ రోజు ఏమి పక్కన పెట్టాలనుకుంటున్నారు?"
        : "పని ఒత్తిడి నుండి చిన్న విరామం తీసుకోండి. ఈ రాత్రికి పని ఆలోచనలు పక్కన పెట్టండి.";
    }
    if (lang === "Tanglish") {
      return isDetailed
        ? "Work leda studies pressure ekkuva unnapudu boundary pettadam chala mukhyam. Eerojuki mee best chesaru. Tonight kosam work ni pakkana petti, mind ki rest ivvandi."
        : "Work pressure ni konchem sepu pakkana petti, peace ga undandi.";
    }
    return isDetailed
      ? "Work and academic deadlines can easily consume all our mental space. Remember that your productivity does not define your worth as a person. Give yourself permission to log off mentally for the evening. What is one work task you can gently park until tomorrow?"
      : "You've worked hard today. Draw a boundary around tonight and let the pending tasks wait until morning.";
  }

  // 7. Breathing, Meditation, Mindfulness
  if (/\b(breathe|breathing|meditate|meditation|calm|peace|mindful)\b/i.test(lower) || /శ్వాస|ధ్యానం|ప్రశాంతత/i.test(lower) || /\b(breathe|meditation|shanti|peace|calm)\b/i.test(lower)) {
    if (lang === "తెలుగు") {
      return "ప్రశాంతమైన శ్వాస మన నాడీ వ్యవస్థను శాంతింపజేస్తుంది. మన పోర్టల్‌లోని 'బ్రీత్‌ఫ్లో' మెడిటేషన్‌ను ప్రయత్నించండి, లేదా నాతో పాటు 4 సెకన్లు శ్వాస లోపలికి, 4 సెకన్లు బయటకు వదలండి.";
    }
    if (lang === "Tanglish") {
      return "Calm breathing mana mind ni relax chestundi. Portal lo unna 'BreatheFlow' meditation open cheyyandi, leda ippude slow ga 3 deep breaths teesukondi.";
    }
    return "Deep, rhythmic breathing sends a direct signal of safety to your nervous system. Try opening the BreatheFlow exercise on your dashboard, or take three unhurried breaths with me right now.";
  }

  // 8. Gratitude, Positive reflection, Feeling better
  if (/\b(thank|thanks|better|good|helped|happy|relieved|grateful)\b/i.test(lower) || /ధన్యవాదాలు|బాగుంది|సంతోషం|మెరుగు/i.test(lower) || /\b(thanks|bagundi|better ga undi|thank you)\b/i.test(lower)) {
    if (lang === "తెలుగు") {
      return "మీరు మెరుగ్గా అనిపించడం విని చాలా సంతోషంగా ఉంది! మీ కోసం మీరు కాస్త సమయం కేటాయించుకున్నందుకు అభినందనలు. నేను ఎల్లప్పుడూ ఇక్కడే ఉంటాను.";
    }
    if (lang === "Tanglish") {
      return "Meeku better ga anipinchananduku chala happy ga undi! Mee self-care kosam ee time spend chesaru. Nenu eppudu meeku support ga untanu.";
    }
    return "I'm so glad to hear that. Acknowledging a moment of ease or gratitude helps anchor it in your memory. I'm always right here whenever you want to check in.";
  }

  // 9. Questions about MindSafe or How it works
  if (/\b(who are you|what are you|what can you do|how to use|features)\b/i.test(lower) || /మీరు ఎవరు|సహాయం/i.test(lower) || /\b(meeru evaru|what can you do)\b/i.test(lower)) {
    if (lang === "తెలుగు") {
      return "నేను మైండ్‌సేఫ్ సహచరుడిని. మీ మానసిక ఆరోగ్యం, రోజువారీ ఆందోళనలను పంచుకోవడానికి, శ్వాస వ్యాయామాలకు నేను ఇక్కడ ఉంటాను. నేను డాక్టర్‌ని కాను, కానీ మీ భావాలను పంచుకోవడానికి సురక్షితమైన ప్రదేశాన్ని అందిస్తాను.";
    }
    if (lang === "Tanglish") {
      return "Nenu MindSafe AI Companion ni. Mee thoughts, daily stress, sleep concerns ni share chesukovadaniki ikkade untanu. Nenu doctor ni kaadu, kani meeku safe supportive space provide chestanu.";
    }
    return "I am MindSafe, your supportive companion. You can chat with me about your stress, sleep, mood, or prepare questions for your doctor. I don't give diagnoses, but I provide a safe, private space to reflect and find calm.";
  }

  // 10. Default reflective continuation tailored to message length
  const preview = latestMessage.length > 50 ? `"${latestMessage.slice(0, 45)}…"` : `"${latestMessage}"`;
  if (lang === "తెలుగు") {
    return isDetailed
      ? `మీరు చెప్పిన ${preview} గురించి ఆలోచిస్తున్నాను. మీ మనసులో ఉన్న భావాలను పంచుకోవడం చాలా మంచి నిర్ణయం. ఈ పరిస్థితిలో మీకు అత్యంత ఉపయోగపడే ఒక చిన్న మార్పు ఏమిటి?`
      : `మీరు చెప్పింది నేను విన్నాను. ఈ క్షణంలో మీకు ఏమి అత్యంత అవసరం అనిపిస్తోంది?`;
  }
  if (lang === "Tanglish") {
    return isDetailed
      ? `Meeru cheppina ${preview} gurinchi nenu vinnaanu. Idi share cheyyadam chala manchi step. Ippudu meeku konchem relief ivvadaniki em cheyyalo alochiddama?`
      : `Meeru cheppindi nenu follow avvagaliganu. Ippudu meeku emi most comforting ga untundi?`;
  }
  return isDetailed
    ? `I hear you on ${preview}. It takes courage to put what you're experiencing into words. Even when solutions aren't immediately clear, giving voice to how you feel is a vital first step. What feels like the kindest thing you can do for yourself in this moment?`
    : `I hear you, and I'm right here with you. What feels like the next most gentle step for your day?`;
}

export async function generateCompanionReplyStream(
  input: CompanionRequest,
  onToken: (text: string) => void,
  signal: AbortSignal,
): Promise<{ safety?: SafetyCategory }> {
  const safety = getSafetyReply(input);
  if (safety) {
    onToken(safety.text);
    return { safety: safety.category };
  }

  const messages = buildMessages(input);
  const maxTokens = input.detailLevel === "detailed" ? 500 : 250;

  if (isGeminiConfigured()) {
    try {
      await streamGemini({
        messages,
        maxTokens,
        signal,
        onToken,
      });
      return {};
    } catch (err) {
      console.warn("[MindSafe Companion] Gemini stream failed, trying fallback:", err);
    }
  }

  try {
    await streamLLM({
      messages,
      maxTokens,
      signal,
      onToken,
    });
  } catch (err) {
    console.warn("[MindSafe Companion] streamLLM fell back to intelligent response:", err);
    const fallback = getDynamicCompanionReply(input);
    const words = fallback.split(" ");
    for (let i = 0; i < words.length; i++) {
      if (signal.aborted) return {};
      onToken((i === 0 ? "" : " ") + words[i]);
      await new Promise(r => setTimeout(r, 25));
    }
  }
  return {};
}

export async function generateCompanionReply(input: CompanionRequest) {
  const safety = getSafetyReply(input);
  if (safety) return safety.text;

  const messages = buildMessages(input);
  const maxTokens = input.detailLevel === "detailed" ? 500 : 250;

  if (isGeminiConfigured()) {
    try {
      const text = await invokeGemini({
        messages,
        maxTokens,
      });
      if (text) return text;
    } catch (err) {
      console.warn("[MindSafe Companion] Gemini invoke failed, trying fallback:", err);
    }
  }

  try {
    const result = await invokeLLM({
      messages,
      maxTokens,
    });
    const content = result.choices?.[0]?.message?.content;
    const text = typeof content === "string" ? content.trim() : "";
    if (text) return text;
  } catch (err) {
    console.warn("[MindSafe Companion] invokeLLM fell back to intelligent response:", err);
  }
  return getDynamicCompanionReply(input);
}

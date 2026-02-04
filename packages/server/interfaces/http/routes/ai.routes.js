/**
 * AI routes - Text improvement with Groq + Langfuse observability
 */

import express from "express";
import { Langfuse } from "langfuse";

/**
 * Create AI routes
 * @param {{
 *   config: { groqApiKey: string, langfuseSecretKey: string, langfusePublicKey: string, langfuseBaseUrl: string },
 *   authenticateToken: Function,
 *   logger: import('../../../logger.js').Logger
 * }} deps
 */
export function createAiRoutes({ config, authenticateToken, logger }) {
  const router = express.Router();

  // Initialize Langfuse (if configured)
  let langfuse = null;
  if (config.langfuseSecretKey && config.langfusePublicKey) {
    langfuse = new Langfuse({
      secretKey: config.langfuseSecretKey,
      publicKey: config.langfusePublicKey,
      baseUrl: config.langfuseBaseUrl,
    });
    logger.info("Langfuse initialized", { baseUrl: config.langfuseBaseUrl });
  } else {
    logger.warning("Langfuse not configured - LLM observability disabled");
  }

  // Improve text with Groq
  router.post("/ai/improve-text", authenticateToken, async (req, res, next) => {
    const startTime = Date.now();
    let trace = null;

    try {
      const { text } = req.body;
      const userId = req.user?.id;
      const username = req.user?.username;

      // Create Langfuse trace
      if (langfuse) {
        trace = langfuse.trace({
          name: "improve-text",
          userId: userId?.toString(),
          metadata: {
            username,
            endpoint: "/api/ai/improve-text",
            textLength: text?.length || 0,
          },
          input: {
            originalText: text,
          },
        });
      }

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        trace?.update({
          output: { error: "Le texte est requis" },
          level: "ERROR",
        });
        return res.status(400).json({ error: "Le texte est requis" });
      }

      if (!config.groqApiKey) {
        trace?.update({
          output: { error: "Service IA non configure" },
          level: "ERROR",
        });
        return res.status(503).json({ error: "Service IA non configure" });
      }

      // Creativity levels configuration
      const creativityLevels = {
        1: {
          name: "correction",
          temperature: 0.2,
          max_tokens: 500,
          prompt: `Tu es un correcteur orthographique et grammatical.

A partir du commentaire de l'utilisateur, tu dois UNIQUEMENT:
- Corriger les fautes d'orthographe
- Corriger les fautes de grammaire
- Corriger la ponctuation
- Garder EXACTEMENT le meme style, les memes mots, la meme longueur
- NE PAS reformuler, NE PAS embellir, NE PAS developper

Reponds UNIQUEMENT avec le texte corrige, sans explications, sans balises, sans commentaires.`,
        },
        2: {
          name: "moderate",
          temperature: 0.5,
          max_tokens: 600,
          prompt: `Tu es un assistant d'ecriture qui aide a ameliorer des commentaires personnels.

A partir du commentaire de l'utilisateur sur sa journee, tu dois:
- Corriger les fautes d'orthographe et de grammaire
- Ameliorer legerement la fluidite et la clarte du texte
- Garder le TON et le STYLE original de l'utilisateur
- Garder une longueur similaire (max +50%)
- NE PAS inventer de details ou d'evenements
- Rester sobre, pas de metaphores excessives

Reponds UNIQUEMENT avec le texte ameliore, sans explications, sans balises, sans commentaires.`,
        },
        3: {
          name: "creative",
          temperature: 0.7,
          max_tokens: 800,
          prompt: `Tu es un ecrivain talentueux qui aide a transformer des notes de journee en textes vivants et expressifs.

A partir du commentaire de l'utilisateur sur sa journee, tu dois:
- Corriger les fautes d'orthographe et de grammaire
- Developper le texte avec un style litteraire agreable (metaphores, expressions, tournures elegantes)
- Ajouter de la personnalite et de l'emotion au recit
- Garder le TON original (si c'est une mauvaise journee, garde le cote negatif/sarcastique/fatigue)
- Rester fidele aux FAITS mentionnes (ne pas inventer d'evenements)
- Doubler ou tripler la longueur si le texte est tres court

Exemples de transformation:
- "journee nulle, fatigue" → "Une de ces journees ou meme le cafe n'a pas reussi a me sortir de ma torpeur. La fatigue m'a colle a la peau du matin au soir."
- "super journee, vu des potes" → "Quelle bouffee d'air frais ! Retrouver mes potes m'a rappele pourquoi ces moments comptent autant. On a ri, on a parle de tout et de rien, et ca m'a fait un bien fou."

Reponds UNIQUEMENT avec le texte ameliore, sans explications, sans balises, sans commentaires.`,
        },
      };

      const level = req.body.level || 2;
      const levelConfig = creativityLevels[level] || creativityLevels[2];

      const systemPrompt = levelConfig.prompt;
      const userPrompt = `Texte original:\n${text}`;

      const models = ["qwen/qwen3-32b", "llama-3.1-8b-instant"];
      let data = null;
      let usedModel = null;
      let attemptNumber = 0;

      for (const model of models) {
        attemptNumber++;
        const attemptStartTime = Date.now();

        // Create Langfuse generation span for each attempt
        const generation = trace?.generation({
          name: `llm-call-attempt-${attemptNumber}`,
          model,
          modelParameters: {
            temperature: levelConfig.temperature,
            max_tokens: levelConfig.max_tokens,
            creativityLevel: level,
            creativityName: levelConfig.name,
          },
          input: {
            system: systemPrompt,
            user: userPrompt,
          },
          metadata: {
            attemptNumber,
            provider: "groq",
            endpoint: "https://api.groq.com/openai/v1/chat/completions",
          },
        });

        try {
          const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${config.groqApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
              ],
              temperature: levelConfig.temperature,
              max_tokens: levelConfig.max_tokens,
            }),
          });

          const attemptDuration = Date.now() - attemptStartTime;

          if (response.ok) {
            data = await response.json();
            usedModel = model;

            // Log successful generation
            generation?.end({
              output: data.choices?.[0]?.message?.content,
              level: "DEFAULT",
              statusMessage: "Success",
              usage: {
                promptTokens: data.usage?.prompt_tokens,
                completionTokens: data.usage?.completion_tokens,
                totalTokens: data.usage?.total_tokens,
              },
              metadata: {
                durationMs: attemptDuration,
                responseId: data.id,
                created: data.created,
                systemFingerprint: data.system_fingerprint,
                finishReason: data.choices?.[0]?.finish_reason,
                groqUsage: data.usage,
                xGroqId: response.headers.get("x-groq-id"),
              },
            });

            break;
          }

          const errorData = await response.text();
          logger.warning(`Groq model ${model} failed, trying next`, { status: response.status, error: errorData });

          // Log failed generation
          generation?.end({
            output: { error: errorData },
            level: "ERROR",
            statusMessage: `HTTP ${response.status}`,
            metadata: {
              durationMs: attemptDuration,
              httpStatus: response.status,
              errorBody: errorData,
            },
          });

        } catch (fetchError) {
          const attemptDuration = Date.now() - attemptStartTime;
          logger.error(`Groq fetch error for ${model}`, { error: fetchError.message });

          generation?.end({
            output: { error: fetchError.message },
            level: "ERROR",
            statusMessage: "Fetch error",
            metadata: {
              durationMs: attemptDuration,
              errorMessage: fetchError.message,
              errorStack: fetchError.stack,
            },
          });
        }
      }

      if (!data) {
        logger.error("All Groq models failed");
        trace?.update({
          output: { error: "All models failed" },
          level: "ERROR",
          metadata: {
            totalDurationMs: Date.now() - startTime,
            attemptedModels: models,
          },
        });
        return res.status(502).json({ error: "Erreur du service IA" });
      }

      let improvedText = data.choices?.[0]?.message?.content?.trim();

      // Remove <think>...</think> tags from Qwen models
      if (improvedText) {
        improvedText = improvedText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      }

      if (!improvedText) {
        trace?.update({
          output: { error: "Empty response from LLM", rawResponse: data },
          level: "ERROR",
        });
        return res.status(502).json({ error: "Reponse IA invalide" });
      }

      const totalDuration = Date.now() - startTime;

      logger.info("Text improved via Groq", {
        model: usedModel,
        originalLength: text.length,
        improvedLength: improvedText.length,
        durationMs: totalDuration,
        userId,
      });

      // Final trace update with success
      trace?.update({
        output: {
          improvedText,
          model: usedModel,
        },
        level: "DEFAULT",
        metadata: {
          totalDurationMs: totalDuration,
          usedModel,
          originalTextLength: text.length,
          improvedTextLength: improvedText.length,
          compressionRatio: (improvedText.length / text.length).toFixed(2),
          totalTokens: data.usage?.total_tokens,
          promptTokens: data.usage?.prompt_tokens,
          completionTokens: data.usage?.completion_tokens,
          attemptsNeeded: attemptNumber,
        },
      });

      res.json({ improvedText });
    } catch (err) {
      const totalDuration = Date.now() - startTime;
      logger.error("AI improve-text error", { error: err.message, stack: err.stack });

      trace?.update({
        output: { error: err.message, stack: err.stack },
        level: "ERROR",
        metadata: {
          totalDurationMs: totalDuration,
          errorType: err.name,
        },
      });

      next(err);
    } finally {
      // Flush Langfuse to ensure data is sent
      if (langfuse) {
        langfuse.flush().catch((flushErr) => {
          logger.warning("Langfuse flush error", { error: flushErr.message });
        });
      }
    }
  });

  return router;
}

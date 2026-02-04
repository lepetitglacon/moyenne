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

      const systemPrompt = `Tu es un assistant qui aide a ameliorer des commentaires personnels sur la journee d'une personne.
L'utilisateur ecrit un commentaire sur sa journee et tu dois l'ameliorer en:
- Corrigeant les fautes d'orthographe et de grammaire
- Rendant le texte plus fluide et agreable a lire
- Gardant le ton et le sens original (si c'est negatif, garde le negatif, si c'est positif, garde le positif)
- Gardant la meme longueur approximative
- NE PAS ajouter de details inventes
- NE PAS changer le sens ou les faits mentionnes

Reponds UNIQUEMENT avec le texte ameliore, sans explications ni commentaires.`;

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
            temperature: 0.3,
            max_tokens: 500,
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
              temperature: 0.3,
              max_tokens: 500,
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

      const improvedText = data.choices?.[0]?.message?.content?.trim();

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

import { Router } from 'express';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { BedrockClient, ListFoundationModelsCommand, ListInferenceProfilesCommand } from '@aws-sdk/client-bedrock';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';

export function createSuggestionsRoutes(getSettings: () => Record<string, string>, authToken: string): Router {
  const router = Router();

  // Auth check
  router.use((req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
    if (token !== authToken) return res.status(401).json({ error: 'Unauthorized' });
    next();
  });

  function resolveModelId(raw: string) {
    return raw.includes('.') && !raw.includes('/') && !raw.startsWith('us.') && !raw.startsWith('eu.') ? `us.${raw}` : raw;
  }

  function getConfig() {
    const s = getSettings();
    return {
      region: s.suggestionsRegion || process.env.AWS_REGION || 'us-east-1',
      profile: s.suggestionsProfile || process.env.AWS_PROFILE || undefined,
      modelId: resolveModelId(s.suggestionsModel || 'amazon.nova-lite-v1:0'),
      count: Number(s.suggestionsCount) || 3,
      enabled: s.suggestionsEnabled !== 'false',
    };
  }

  router.post('/', async (req, res) => {
    const { lastAssistant } = req.body || {};
    const cfg = getConfig();
    if (!lastAssistant || lastAssistant.length < 80 || !cfg.enabled) return res.json({ suggestions: [] });
    try {
      const client = new BedrockRuntimeClient({ region: cfg.region, credentials: fromNodeProviderChain({ profile: cfg.profile || undefined }) });
      const body = JSON.stringify({
        messages: [{ role: 'user', content: [{ text: `You are a helpful assistant. Based on the following conversation, generate exactly ${cfg.count} follow-up questions or actions the user would likely want to do next. Each must be directly related to the specific content discussed, under 80 characters, and phrased as a request to an AI assistant.\n\nCONVERSATION:\n${lastAssistant.slice(0, 2000)}\n\nRespond with ONLY a JSON array of ${cfg.count} strings. No explanation, no markdown, just the array.` }] }],
        inferenceConfig: { maxTokens: 200 }
      });
      const resp = await client.send(new InvokeModelCommand({ modelId: cfg.modelId, contentType: 'application/json', accept: 'application/json', body }));
      const parsed = JSON.parse(new TextDecoder().decode(resp.body));
      const text = parsed.output?.message?.content?.[0]?.text || parsed.content?.[0]?.text || '';
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const suggestions = JSON.parse(match[0]);
        if (Array.isArray(suggestions) && suggestions.every((s: any) => typeof s === 'string')) {
          return res.json({ suggestions: suggestions.slice(0, cfg.count) });
        }
      }
      res.json({ suggestions: [] });
    } catch (e: any) {
      console.error('[suggestions]', e.name, e.message);
      res.json({ suggestions: [], error: `${e.name}: ${e.message}` });
    }
  });

  router.post('/test', async (_req, res) => {
    const cfg = getConfig();
    try {
      const client = new BedrockRuntimeClient({ region: cfg.region, credentials: fromNodeProviderChain({ profile: cfg.profile || undefined }) });
      const body = JSON.stringify({ messages: [{ role: 'user', content: [{ text: 'Say "ok"' }] }], inferenceConfig: { maxTokens: 10 } });
      await client.send(new InvokeModelCommand({ modelId: cfg.modelId, contentType: 'application/json', accept: 'application/json', body }));
      res.json({ ok: true, model: cfg.modelId });
    } catch (e: any) {
      res.json({ ok: false, error: e.message });
    }
  });

  router.get('/models', async (_req, res) => {
    const cfg = getConfig();
    try {
      const client = new BedrockClient({ region: cfg.region, credentials: fromNodeProviderChain({ profile: cfg.profile || undefined }) });
      const [fmResp, ipResp] = await Promise.all([
        client.send(new ListFoundationModelsCommand({ byOutputModality: 'TEXT', byInferenceType: 'ON_DEMAND' })),
        client.send(new ListInferenceProfilesCommand({}))
      ]);
      const fmModels = (fmResp.modelSummaries || []).filter(m => m.modelId).map(m => ({ id: m.modelId!, name: m.modelName || m.modelId!, group: 'Foundation Models' }));
      const ipModels = (ipResp.inferenceProfileSummaries || []).filter(p => p.inferenceProfileId && p.status === 'ACTIVE').map(p => ({ id: p.inferenceProfileId!, name: p.inferenceProfileName || p.inferenceProfileId!, group: 'Inference Profiles' }));
      res.json({ models: [...ipModels, ...fmModels].sort((a, b) => a.name.localeCompare(b.name)) });
    } catch (e: any) {
      res.json({ models: [], error: e.message });
    }
  });

  return router;
}

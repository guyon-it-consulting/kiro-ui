import { buildPrompt } from './prompt.js';
import { getTrustRules, setTrustRules, saveTrust } from './trust.js';

export type ActionHandler = (msg: any, tabId: string, ctx: HandlerContext) => Promise<void>;

export interface HandlerContext {
  getSession: (tabId: string) => any;
  getOrCreateSession: (tabId: string) => Promise<any>;
  createSession: (tabId: string, loadId?: string, cwd?: string) => Promise<any>;
  teardown: (session: any) => void;
  emit: (data: any) => void;
  getWorkspace: () => string;
  trustFile: string;
}

export async function handleAction(msg: any, tabId: string, ctx: HandlerContext): Promise<void> {
  switch (msg.action) {
    case 'prompt': {
      const s = await ctx.getOrCreateSession(tabId);
      const prompt = buildPrompt({ text: msg.text, images: msg.images, files: msg.files });
      const result = await s.conn.prompt({ sessionId: s.sessionId, prompt });
      ctx.emit({ type: 'TurnEnd', tabId, stopReason: result.stopReason });
      break;
    }
    case 'cancel': {
      const s = ctx.getSession(tabId);
      if (s) {
        for (const [, r] of s.permResolvers) r({ outcome: { outcome: 'cancelled' } });
        s.permResolvers.clear();
        await s.conn.cancel({ sessionId: s.sessionId });
      }
      break;
    }
    case 'set_mode': {
      const s = ctx.getSession(tabId);
      if (s) await s.conn.setSessionMode({ sessionId: s.sessionId, modeId: msg.modeId });
      break;
    }
    case 'set_model': {
      const s = ctx.getSession(tabId);
      if (s) await (s.conn as any).unstable_setSessionModel({ sessionId: s.sessionId, modelId: msg.modelId });
      break;
    }
    case 'set_permission_policy': {
      const s = ctx.getSession(tabId);
      if (s) s.permPolicy = msg.policy;
      break;
    }
    case 'permission_response': {
      const s = ctx.getSession(tabId);
      if (s) {
        const resolver = s.permResolvers.get(msg.requestId);
        if (resolver) {
          resolver({ outcome: { outcome: 'selected', optionId: msg.optionId } });
          s.permResolvers.delete(msg.requestId);
          if (msg.optionId === 'allow_always' && msg.title) { const rules = getTrustRules(); rules[msg.title] = 'allow_always'; setTrustRules(rules); saveTrust(ctx.trustFile); }
          else if (msg.optionId === 'reject_always' && msg.title) { const rules = getTrustRules(); rules[msg.title] = 'reject_always'; setTrustRules(rules); saveTrust(ctx.trustFile); }
        }
      }
      break;
    }
    case 'new_chat': {
      const s = ctx.getSession(tabId);
      if (s) ctx.teardown(s);
      const ns = await ctx.createSession(tabId, undefined, msg.cwd);
      ctx.emit({ type: 'ready', tabId, modes: ns.modes, models: ns.models });
      break;
    }
    case 'set_config_option': {
      const s = ctx.getSession(tabId);
      if (s) await (s.conn as any).setSessionConfigOption?.({ sessionId: s.sessionId, configId: msg.configId, value: msg.value });
      break;
    }
    case 'set_debug': {
      // handled externally - all sessions
      break;
    }
  }
}

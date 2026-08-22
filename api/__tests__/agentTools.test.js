import { describe, it, expect } from 'vitest';
import { AGENT_TOOLS } from '../agent.js';

/**
 * The agent's tools once declared a `userId` parameter and executeTool used
 * whatever the model passed back as the row key — against a service-role client
 * that bypasses RLS. The only guard was prompt text asking the model to copy
 * the right UUID. These tests exist so that parameter cannot come back.
 */
describe('agent tool schemas', () => {
  it('exposes tools', () => {
    expect(AGENT_TOOLS.length).toBeGreaterThan(0);
  });

  it('never lets the model name the user it acts on', () => {
    for (const tool of AGENT_TOOLS) {
      const props = Object.keys(tool.input_schema?.properties || {});
      expect(props, `${tool.name} properties`).not.toContain('userId');
      expect(tool.input_schema?.required || [], `${tool.name} required`).not.toContain('userId');
    }
  });

  it('has no identity-shaped parameter under any spelling', () => {
    const identityish = /^(user_?id|uid|account_?id|profile_?id|owner)$/i;
    for (const tool of AGENT_TOOLS) {
      for (const prop of Object.keys(tool.input_schema?.properties || {})) {
        expect(identityish.test(prop), `${tool.name}.${prop} is identity-shaped`).toBe(false);
      }
    }
  });

  it('keeps every required field declared as a property', () => {
    for (const tool of AGENT_TOOLS) {
      const props = Object.keys(tool.input_schema?.properties || {});
      for (const req of tool.input_schema?.required || []) {
        expect(props, `${tool.name} requires ${req}`).toContain(req);
      }
    }
  });
});

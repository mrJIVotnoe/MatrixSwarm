import { describe, it, expect } from 'vitest';
import { WasmGlobalIntentDecomposer, WasmCasteAutonomy, WasmIdentity } from './wasm_bridge';

// Using vitest for basic typescript test assertions for WASM connection
describe('WASM Bridge Initialization and Linking', () => {
  it('should successfully call global intent decomposer via WASM mock structure', () => {
     const intent = "heal the wound";
     // Since WASM is typically async loaded, if we just call the mocked functions in vitest it verifies the TypeScript layer binding
     const tasks = WasmGlobalIntentDecomposer.decompose_intent(intent);
     expect(Array.isArray(tasks)).toBe(true);
     // It should break it into tasks
     expect(tasks.length).toBeGreaterThan(0);
     expect(tasks[0]).toHaveProperty('id');
     expect(tasks[0]).toHaveProperty('assigned_role');
     expect(tasks[0]).toHaveProperty('payload');
  });

  it('should determine roles logically', () => {
    const role = WasmCasteAutonomy.determineRole({ cpu_cores: 8, ram_mb: 8000 });
    expect(typeof role).toBe('string');
  });
});

/**
 * Local LLM Utilities
 * Interface for local LLM operations
 */

export const localLLM = {
  async generateHint(task) {
    try {
      const result = await window.electronAPI.getLLMHint(task);
      return result;
    } catch (error) {
      console.error('LLM hint generation failed:', error);
      return 'Hint generation unavailable';
    }
  },

  async completeCode(code, language) {
    try {
      const result = await window.electronAPI.completeCode(code, language);
      return result;
    } catch (error) {
      console.error('Code completion failed:', error);
      return code;
    }
  },

  async generateSuggestion(context) {
    try {
      const prompt = `Based on this context: ${JSON.stringify(context)}, provide a helpful suggestion.`;
      const result = await window.electronAPI.generateHint(prompt);
      return result;
    } catch (error) {
      console.error('Suggestion generation failed:', error);
      return null;
    }
  }
};


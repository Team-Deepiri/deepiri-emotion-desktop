/**
 * AI Service Integration
 * Connect desktop IDE to microservices AI backend
 */
class AIService {
  constructor() {
    this.apiBase = process.env.API_URL || 'http://localhost:5000/api';
    this.aiServiceBase = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    this.useLocalModel = false;
  }

  async classifyTask(task, description = null) {
    try {
      const result = await window.electronAPI.classifyTask(task, description);
      if (result.success) {
        return result.data.classification;
      }
      throw new Error(result.error || 'Classification failed');
    } catch (error) {
      console.error('Task classification error:', error);
      throw error;
    }
  }

  async generateChallenge(taskData) {
    try {
      if (this.useLocalModel) {
        const result = await window.electronAPI.generateChallengeLocal(taskData.id || '');
        return result;
      } else {
        const result = await window.electronAPI.generateChallenge(taskData);
        if (result.success) {
          return result.data.data;
        }
        throw new Error(result.error || 'Challenge generation failed');
      }
    } catch (error) {
      console.error('Challenge generation error:', error);
      throw error;
    }
  }

  async personalizeChallenge(task, userHistory, context) {
    try {
      const result = await window.electronAPI.apiRequest({
        method: 'POST',
        endpoint: '/personalize/challenge',
        data: {
          user_id: this.getUserId(),
          task,
          user_history: userHistory,
          context
        }
      });
      return result.data;
    } catch (error) {
      console.error('Personalization error:', error);
      throw error;
    }
  }

  async adaptToContext(task, userData) {
    try {
      const result = await window.electronAPI.apiRequest({
        method: 'POST',
        endpoint: '/adapt/context',
        data: {
          user_id: this.getUserId(),
          task,
          user_data: userData
        }
      });
      return result.data;
    } catch (error) {
      console.error('Context adaptation error:', error);
      throw error;
    }
  }

  async selectChallengeWithBandit(context) {
    try {
      const result = await window.electronAPI.apiRequest({
        method: 'POST',
        endpoint: '/bandit/select',
        data: {
          user_id: this.getUserId(),
          context
        }
      });
      return result.data.challenge_type;
    } catch (error) {
      console.error('Bandit selection error:', error);
      return 'timed_completion';
    }
  }

  async updateBandit(challengeType, reward, context) {
    try {
      await window.electronAPI.apiRequest({
        method: 'POST',
        endpoint: '/bandit/update',
        data: {
          user_id: this.getUserId(),
          challenge_type: challengeType,
          reward,
          context
        }
      });
    } catch (error) {
      console.error('Bandit update error:', error);
    }
  }

  async generateWithRAG(task, query) {
    try {
      const result = await window.electronAPI.apiRequest({
        method: 'POST',
        endpoint: '/rag/generate',
        data: { task, query }
      });
      return result.data;
    } catch (error) {
      console.error('RAG generation error:', error);
      throw error;
    }
  }

  async getLLMHint(task) {
    try {
      const result = await window.electronAPI.getLLMHint(task);
      return result;
    } catch (error) {
      console.error('LLM hint error:', error);
      return 'Hint generation unavailable';
    }
  }

  async completeCode(code, language) {
    try {
      const result = await window.electronAPI.completeCode(code, language);
      return result;
    } catch (error) {
      console.error('Code completion error:', error);
      return code;
    }
  }

  setLocalModel(enabled) {
    this.useLocalModel = enabled;
  }

  getUserId() {
    return localStorage.getItem('user_id') || 'default_user';
  }
}

window.aiService = new AIService();


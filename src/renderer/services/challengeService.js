/**
 * Challenge Service
 * Manage challenges and missions in desktop IDE
 */
class ChallengeService {
  constructor() {
    this.activeChallenges = new Map();
    this.aiService = window.aiService;
  }

  async createChallengeFromTask(task) {
    try {
      const classification = await this.aiService.classifyTask(task.title, task.description);
      
      const challenge = await this.aiService.generateChallenge({
        ...task,
        type: classification.type,
        estimatedDuration: classification.estimated_duration
      });

      return challenge;
    } catch (error) {
      console.error('Challenge creation error:', error);
      throw error;
    }
  }

  async createPersonalizedChallenge(task, userHistory, context) {
    try {
      const challenge = await this.aiService.personalizeChallenge(task, userHistory, context);
      return challenge;
    } catch (error) {
      console.error('Personalized challenge creation error:', error);
      throw error;
    }
  }

  async startChallenge(challenge, missionTemplate = 'coding_sprint') {
    if (window.missionSystem) {
      const mission = window.missionSystem.createMission(
        { id: challenge.id || Date.now().toString(), title: challenge.title },
        missionTemplate
      );
      
      this.activeChallenges.set(mission.id, {
        challenge,
        mission,
        startTime: Date.now()
      });

      return mission;
    }
  }

  async completeChallenge(challengeId, metrics = {}) {
    const active = this.activeChallenges.get(challengeId);
    if (!active) return;

    const completionTime = (Date.now() - active.startTime) / 1000 / 60;
    const success = metrics.success !== false;

    try {
      await window.electronAPI.apiRequest({
        method: 'POST',
        endpoint: `/challenges/${challengeId}/complete`,
        data: {
          completion_time: completionTime,
          success,
          metrics
        }
      });

      if (success && active.challenge.pointsReward) {
        await window.electronAPI.awardPoints(active.challenge.pointsReward);
      }

      this.activeChallenges.delete(challengeId);
      
      if (window.missionSystem) {
        await window.missionSystem.completeMission(challengeId, success);
      }
    } catch (error) {
      console.error('Challenge completion error:', error);
    }
  }

  async updateChallengeProgress(challengeId, progress) {
    const active = this.activeChallenges.get(challengeId);
    if (active && window.missionSystem) {
      for (const [criterion, value] of Object.entries(progress)) {
        window.missionSystem.updateProgress(challengeId, criterion, value);
      }
    }
  }

  getActiveChallenges() {
    return Array.from(this.activeChallenges.values());
  }
}

window.challengeService = new ChallengeService();


/**
 * GitHub Integration
 * Import issues as tasks and create missions
 */
class GitHubIntegration {
  constructor() {
    this.connected = false;
    this.repos = [];
  }

  async connect(token) {
    try {
      await window.electronAPI.syncGithubIssues('', token);
      this.connected = true;
      localStorage.setItem('github_token', token);
      return true;
    } catch (error) {
      console.error('GitHub connection error:', error);
      return false;
    }
  }

  async syncIssues(repo) {
    try {
      const issues = await window.electronAPI.syncGithubIssues(repo);
      
      for (const issue of issues) {
        await this.importIssueAsTask(issue);
      }
      
      return issues.length;
    } catch (error) {
      console.error('GitHub sync error:', error);
      return 0;
    }
  }

  async importIssueAsTask(issue) {
    try {
      const task = await window.taskService.createTask(
        issue.title,
        issue.body || '',
        'code'
      );

      if (window.missionSystem) {
        await window.taskService.createMissionFromTask(task, 'coding_sprint');
      }

      return task;
    } catch (error) {
      console.error('Issue import error:', error);
    }
  }

  async createMissionFromPR(pr) {
    const task = await window.taskService.createTask(
      `Review PR: ${pr.title}`,
      pr.body || '',
      'code'
    );

    if (window.missionSystem) {
      return window.missionSystem.createMission(task, 'code_kata');
    }
  }
}

window.githubIntegration = new GitHubIntegration();


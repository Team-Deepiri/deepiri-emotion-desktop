/**
 * Task Service
 * Manage tasks with AI classification
 */
class TaskService {
  constructor() {
    this.tasks = [];
    this.aiService = window.aiService;
  }

  async loadTasks() {
    try {
      const result = await window.electronAPI.getTasks();
      if (result.success) {
        this.tasks = result.data;
        return this.tasks;
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
    return [];
  }

  async createTask(title, description = '', type = null) {
    try {
      let taskType = type;
      
      if (!taskType) {
        const classification = await this.aiService.classifyTask(title, description);
        taskType = classification.type;
      }

      const result = await window.electronAPI.createTask(title, description, taskType);
      
      if (result.success) {
        this.tasks.push(result.data);
        return result.data;
      }
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  async updateTask(taskId, updates) {
    try {
      const result = await window.electronAPI.apiRequest({
        method: 'PATCH',
        endpoint: `/tasks/${taskId}`,
        data: updates
      });
      
      if (result.success) {
        const index = this.tasks.findIndex(t => t.id === taskId);
        if (index !== -1) {
          this.tasks[index] = { ...this.tasks[index], ...updates };
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  async deleteTask(taskId) {
    try {
      const result = await window.electronAPI.apiRequest({
        method: 'DELETE',
        endpoint: `/tasks/${taskId}`
      });
      
      if (result.success) {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
      }
      
      return result;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  async createMissionFromTask(task, template = 'coding_sprint') {
    if (window.missionSystem) {
      return window.missionSystem.createMission(task, template);
    }
  }

  async batchClassifyTasks(tasks) {
    try {
      const result = await window.electronAPI.apiRequest({
        method: 'POST',
        endpoint: '/task/batch-classify',
        data: { tasks }
      });
      return result.data;
    } catch (error) {
      console.error('Batch classification error:', error);
      return tasks;
    }
  }
}

window.taskService = new TaskService();


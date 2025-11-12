/**
 * Notion Integration
 * Sync Notion pages as tasks
 */
class NotionIntegration {
  constructor() {
    this.connected = false;
    this.databases = [];
  }

  async connect(token) {
    try {
      const result = await window.electronAPI.apiRequest({
        method: 'POST',
        endpoint: '/integrations/notion/connect',
        data: { token }
      });
      
      if (result.success) {
        this.connected = true;
        localStorage.setItem('notion_token', token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Notion connection error:', error);
      return false;
    }
  }

  async syncDatabase(databaseId) {
    try {
      const result = await window.electronAPI.apiRequest({
        method: 'POST',
        endpoint: '/integrations/notion/sync',
        data: { database_id: databaseId }
      });
      
      if (result.success) {
        const pages = result.data.pages || [];
        
        for (const page of pages) {
          await this.importPageAsTask(page);
        }
        
        return pages.length;
      }
      return 0;
    } catch (error) {
      console.error('Notion sync error:', error);
      return 0;
    }
  }

  async importPageAsTask(page) {
    try {
      const task = await window.taskService.createTask(
        page.title || 'Untitled',
        page.content || '',
        this._inferTaskType(page)
      );

      if (window.missionSystem && page.properties?.Status?.select?.name === 'To Do') {
        await window.taskService.createMissionFromTask(task);
      }

      return task;
    } catch (error) {
      console.error('Page import error:', error);
    }
  }

  _inferTaskType(page) {
    const content = (page.content || '').toLowerCase();
    if (content.includes('code') || content.includes('function')) return 'code';
    if (content.includes('read') || content.includes('study')) return 'study';
    if (content.includes('write') || content.includes('blog')) return 'creative';
    return 'manual';
  }
}

window.notionIntegration = new NotionIntegration();


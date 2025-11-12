import React, { useState, useEffect } from 'react';
import CodeEditor from './components/CodeEditor';
import FileExplorer from './components/FileExplorer';
import ChallengePanel from './components/ChallengePanel';
import GamificationWidget from './components/GamificationWidget';
import TaskManager from './components/TaskManager';
import AIAssistant from './components/AIAssistant';
import Terminal from './components/Terminal';
import Settings from './components/Settings';
import IntegrationPanel from './components/IntegrationPanel';
import MissionCard from './components/MissionCard';
import { useSession } from './hooks/useSession';
import './services/aiService';
import './services/challengeService';
import './services/taskService';
import './integrations/github';
import './integrations/notion';

const App = () => {
  const [activeFile, setActiveFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [currentView, setCurrentView] = useState('explorer');
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [activeMissions, setActiveMissions] = useState([]);
  const userId = localStorage.getItem('user_id') || 'default_user';
  const { recordKeystroke, recordFileChange } = useSession(userId);

  const initializeApp = async () => {
    try {
      const userId = localStorage.getItem('user_id') || 'default_user';
      const session = await window.electronAPI.startSession(userId);
      setSessionId(session);
      
      loadFiles();
      loadChallenges();
    } catch (error) {
      console.error('Initialization error:', error);
    }
  };

  const loadFiles = async () => {
    try {
      const result = await window.electronAPI.getTasks();
      if (result.success && result.data) {
        const taskFiles = result.data.map(task => ({
          name: task.title,
          type: 'file',
          path: `/tasks/${task.id}`,
          content: task.description || '',
          task: task
        }));
        
        const defaultFiles = [
          {
            name: 'Projects',
            type: 'folder',
            path: '/projects',
            children: [
              { name: 'project1.js', type: 'file', path: '/projects/project1.js', content: '// Your code here' },
              { name: 'project2.py', type: 'file', path: '/projects/project2.py', content: '# Your code here' }
            ]
          },
          {
            name: 'Tasks',
            type: 'folder',
            path: '/tasks',
            children: taskFiles
          }
        ];
        setFiles(defaultFiles);
      } else {
        // Fallback to default files
        const defaultFiles = [
          {
            name: 'Projects',
            type: 'folder',
            path: '/projects',
            children: [
              { name: 'project1.js', type: 'file', path: '/projects/project1.js', content: '// Your code here' },
              { name: 'project2.py', type: 'file', path: '/projects/project2.py', content: '# Your code here' }
            ]
          },
          {
            name: 'Tasks',
            type: 'folder',
            path: '/tasks',
            children: []
          }
        ];
        setFiles(defaultFiles);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      const defaultFiles = [
        {
          name: 'Projects',
          type: 'folder',
          path: '/projects',
          children: [
            { name: 'project1.js', type: 'file', path: '/projects/project1.js', content: '// Your code here' },
            { name: 'project2.py', type: 'file', path: '/projects/project2.py', content: '# Your code here' }
          ]
        },
        {
          name: 'Tasks',
          type: 'folder',
          path: '/tasks',
          children: []
        }
      ];
      setFiles(defaultFiles);
    }
  };

  const loadChallenges = async () => {
    try {
      const result = await window.electronAPI.apiRequest({
        method: 'GET',
        endpoint: '/challenges'
      });
      if (result.success) {
        setChallenges(result.data);
      }
    } catch (error) {
      console.error('Error loading challenges:', error);
    }
  };

  const handleFileSelect = async (file) => {
    if (file.type === 'file') {
      let content = file.content || '';
      
      // If file has a path, try to load it
      if (file.path && !content) {
        try {
          content = await window.electronAPI.openFile(file.path);
        } catch (error) {
          console.error('Error loading file:', error);
        }
      }
      
      setActiveFile({
        ...file,
        content: content
      });
      
      if (sessionId) {
        recordKeystroke('', file.path, 0, 0);
      }
    }
  };

  const handleChallengeStart = async (challenge) => {
    setActiveChallenge(challenge);
    if (window.missionSystem) {
      window.missionSystem.createMission(
        { id: challenge.id, title: challenge.title },
        'coding_sprint'
      );
    }
  };

  const handleCodeChange = (code) => {
    if (activeFile) {
      setActiveFile(prev => ({ ...prev, content: code }));
      recordFileChange(activeFile.path, 'edit', { code_length: code.length });
    }
  };

  const handleTaskSelect = (task) => {
    setActiveFile({
      name: task.title,
      path: `/tasks/${task.id}`,
      content: task.description || '',
      type: 'task'
    });
  };

  const handleCreateMission = async (task) => {
    try {
      const challenge = await window.challengeService.createChallengeFromTask(task);
      const mission = await window.challengeService.startChallenge(challenge);
      if (mission) {
        setActiveMissions(prev => [...prev, mission]);
      }
    } catch (error) {
      console.error('Mission creation error:', error);
    }
  };

  const handleMissionComplete = async (missionId) => {
    try {
      await window.challengeService.completeChallenge(missionId, { success: true });
      setActiveMissions(prev => prev.filter(m => m.id !== missionId));
    } catch (error) {
      console.error('Mission completion error:', error);
    }
  };

  const handleMissionAbandon = (missionId) => {
    setActiveMissions(prev => prev.filter(m => m.id !== missionId));
  };

  const switchView = (view) => {
    setCurrentView(view);
    document.querySelectorAll('.sidebar-content').forEach(el => el.classList.add('hidden'));
    const targetView = document.getElementById(`${view}-view`);
    if (targetView) {
      targetView.classList.remove('hidden');
    }
  };

  return (
    <div className="ide-container">
      <div className="activity-bar">
        <div 
          className={`activity-item ${currentView === 'explorer' ? 'active' : ''}`}
          onClick={() => switchView('explorer')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
          </svg>
        </div>
        <div 
          className={`activity-item ${currentView === 'tasks' ? 'active' : ''}`}
          onClick={() => switchView('tasks')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
          </svg>
        </div>
        <div 
          className={`activity-item ${currentView === 'challenges' ? 'active' : ''}`}
          onClick={() => switchView('challenges')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          </svg>
        </div>
        <div 
          className={`activity-item ${currentView === 'gamification' ? 'active' : ''}`}
          onClick={() => switchView('gamification')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10"/>
          </svg>
        </div>
        <div 
          className={`activity-item ${currentView === 'integrations' ? 'active' : ''}`}
          onClick={() => switchView('integrations')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </div>
        <div 
          className={`activity-item ${showAIAssistant ? 'active' : ''}`}
          onClick={() => setShowAIAssistant(!showAIAssistant)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
        </div>
      </div>

      <div className="sidebar" id="sidebar">
        <div className="sidebar-content" id="explorer-view">
          <div className="sidebar-header">
            <span>EXPLORER</span>
          </div>
          <FileExplorer
            files={files}
            onFileSelect={handleFileSelect}
          />
        </div>

        <div className="sidebar-content hidden" id="challenges-view">
          <div className="sidebar-header">
            <span>CHALLENGES</span>
          </div>
          <ChallengePanel
            onChallengeStart={handleChallengeStart}
            onChallengeComplete={(id) => {
              setActiveChallenge(null);
              loadChallenges();
            }}
          />
        </div>

        <div className="sidebar-content hidden" id="tasks-view">
          <div className="sidebar-header">
            <span>TASKS</span>
          </div>
          <TaskManager
            onTaskSelect={handleTaskSelect}
            onCreateMission={handleCreateMission}
          />
        </div>

        <div className="sidebar-content hidden" id="gamification-view">
          <div className="sidebar-header">
            <span>GAMIFICATION</span>
          </div>
          <GamificationWidget />
        </div>

        <div className="sidebar-content hidden" id="integrations-view">
          <div className="sidebar-header">
            <span>INTEGRATIONS</span>
          </div>
          <IntegrationPanel />
        </div>
      </div>

      <div className="editor-area">
        <div className="tabs-container">
          <div className="tabs">
            {activeFile && (
              <div className="tab active">
                <span>{activeFile.name}</span>
                <span className="tab-close">×</span>
              </div>
            )}
          </div>
        </div>

        <div className="editor-container">
          <div className="editor-main">
            {activeFile ? (
              <CodeEditor
                content={activeFile.content || ''}
                language={getLanguageFromFile(activeFile.name)}
                onChange={handleCodeChange}
                onSave={async () => {
                  if (activeFile.path) {
                    try {
                      await window.electronAPI.saveFile(activeFile.path, activeFile.content || '');
                      recordFileChange(activeFile.path, 'save', {});
                    } catch (error) {
                      console.error('Error saving file:', error);
                    }
                  }
                }}
              />
            ) : (
              <div className="welcome-screen" id="welcome-screen">
                <h1>Deepiri IDE</h1>
                <p>AI-Powered Productivity IDE</p>
                <div className="quick-actions">
                  <button onClick={async () => {
                    const title = prompt('Enter task title:');
                    if (title) {
                      await window.taskService.createTask(title);
                      if (window.taskService.loadTasks) {
                        await window.taskService.loadTasks();
                      }
                    }
                  }}>New Task</button>
                  <button onClick={async () => {
                    const taskText = prompt('Enter task for challenge:');
                    if (taskText) {
                      const task = await window.taskService.createTask(taskText);
                      const challenge = await window.challengeService.createChallengeFromTask(task);
                      await window.challengeService.startChallenge(challenge);
                    }
                  }}>Generate Challenge</button>
                  <button onClick={() => window.ide.openProject()}>Open Project</button>
                </div>
              </div>
            )}
          </div>
          {showAIAssistant && (
            <div className="ai-assistant-panel">
              <AIAssistant />
            </div>
          )}
        </div>
      </div>

      {/* Mission Cards */}
      <div className="mission-container">
        {activeMissions.map(mission => (
          <MissionCard
            key={mission.id}
            mission={mission}
            onComplete={handleMissionComplete}
            onAbandon={handleMissionAbandon}
          />
        ))}
      </div>

      <div className="status-bar">
        <div className="status-item">
          <span id="challenge-status">
            {activeChallenge ? `Active: ${activeChallenge.title}` : 'No active challenge'}
          </span>
        </div>
        <div className="status-item">
          <span id="points-display">0 points</span>
        </div>
        <div className="status-item right">
          <span>Ready</span>
        </div>
      </div>
    </div>
  );
};

function getLanguageFromFile(filename) {
  const ext = filename.split('.').pop();
  const langMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'rs': 'rust',
    'go': 'go',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c'
  };
  return langMap[ext] || 'text';
}

export default App;


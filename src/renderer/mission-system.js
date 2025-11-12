/**
 * Mission Card System
 * Turn tasks into gamified missions with success criteria
 */
class MissionSystem {
    constructor() {
        this.activeMissions = new Map();
        this.missionTemplates = this.loadTemplates();
    }

    loadTemplates() {
        return {
            'coding_sprint': {
                name: 'Coding Sprint',
                duration: 15,
                success_criteria: {
                    'lines_written': 100,
                    'tests_passed': true,
                    'commits_made': 1
                },
                rewards: {
                    'points': 250,
                    'badge': 'sprint_master'
                }
            },
            'read_recall': {
                name: 'Read & Recall',
                duration: 20,
                success_criteria: {
                    'pages_read': 5,
                    'quiz_score': 0.8
                },
                rewards: {
                    'points': 200,
                    'badge': 'knowledge_seeker'
                }
            },
            'code_kata': {
                name: 'Code Kata',
                duration: 30,
                success_criteria: {
                    'tests_written': 5,
                    'all_tests_pass': true
                },
                rewards: {
                    'points': 300,
                    'badge': 'kata_master'
                }
            }
        };
    }

    createMission(task, templateName) {
        const template = this.missionTemplates[templateName];
        if (!template) {
            throw new Error(`Template not found: ${templateName}`);
        }

        const mission = {
            id: `mission_${Date.now()}`,
            task_id: task.id,
            template: templateName,
            title: `${template.name}: ${task.title}`,
            duration: template.duration,
            start_time: Date.now(),
            success_criteria: template.success_criteria,
            progress: {},
            rewards: template.rewards,
            status: 'active'
        };

        this.activeMissions.set(mission.id, mission);
        this.renderMissionCard(mission);
        this.startMissionTracking(mission);

        return mission;
    }

    renderMissionCard(mission) {
        const missionContainer = document.getElementById('mission-container') || this.createMissionContainer();
        
        const card = document.createElement('div');
        card.className = 'mission-card';
        card.id = `mission-${mission.id}`;
        card.innerHTML = `
            <div class="mission-header">
                <h3>${mission.title}</h3>
                <div class="mission-timer" id="timer-${mission.id}">${mission.duration}:00</div>
            </div>
            <div class="mission-progress">
                ${this.renderProgress(mission)}
            </div>
            <div class="mission-actions">
                <button onclick="window.missionSystem.completeMission('${mission.id}')">Complete</button>
                <button onclick="window.missionSystem.abandonMission('${mission.id}')">Abandon</button>
            </div>
        `;

        missionContainer.appendChild(card);
    }

    renderProgress(mission) {
        let html = '<div class="progress-items">';
        for (const [criterion, target] of Object.entries(mission.success_criteria)) {
            const current = mission.progress[criterion] || 0;
            const percentage = typeof target === 'number' 
                ? Math.min((current / target) * 100, 100)
                : (current ? 100 : 0);
            
            html += `
                <div class="progress-item">
                    <div class="progress-label">${criterion.replace(/_/g, ' ')}</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percentage}%"></div>
                    </div>
                    <div class="progress-value">${current}${typeof target === 'number' ? ` / ${target}` : ''}</div>
                </div>
            `;
        }
        html += '</div>';
        return html;
    }

    startMissionTracking(mission) {
        const interval = setInterval(() => {
            const elapsed = (Date.now() - mission.start_time) / 1000 / 60;
            const remaining = Math.max(0, mission.duration - elapsed);
            
            const timerEl = document.getElementById(`timer-${mission.id}`);
            if (timerEl) {
                const mins = Math.floor(remaining);
                const secs = Math.floor((remaining - mins) * 60);
                timerEl.textContent = `${mins}:${String(secs).padStart(2, '0')}`;
            }

            if (remaining <= 0) {
                clearInterval(interval);
                this.handleMissionTimeout(mission);
            }
        }, 1000);
    }

    updateProgress(missionId, criterion, value) {
        const mission = this.activeMissions.get(missionId);
        if (!mission) return;

        mission.progress[criterion] = value;
        this.renderProgress(mission);
        
        if (this.checkSuccess(mission)) {
            this.completeMission(missionId, true);
        }
    }

    checkSuccess(mission) {
        for (const [criterion, target] of Object.entries(mission.success_criteria)) {
            const current = mission.progress[criterion] || 0;
            if (typeof target === 'number' && current < target) {
                return false;
            }
            if (typeof target === 'boolean' && current !== target) {
                return false;
            }
        }
        return true;
    }

    async completeMission(missionId, success = false) {
        const mission = this.activeMissions.get(missionId);
        if (!mission) return;

        mission.status = success ? 'completed' : 'failed';
        this.activeMissions.delete(missionId);

        if (success) {
            await this.awardRewards(mission.rewards);
            this.showCompletionAnimation(mission);
        }

        const card = document.getElementById(`mission-${missionId}`);
        if (card) {
            card.remove();
        }
    }

    async awardRewards(rewards) {
        if (rewards.points) {
            await window.electronAPI.apiRequest({
                method: 'POST',
                endpoint: '/gamification/award-points',
                data: { points: rewards.points }
            });
        }

        if (rewards.badge) {
            await window.electronAPI.apiRequest({
                method: 'POST',
                endpoint: '/gamification/award-badge',
                data: { badge: rewards.badge }
            });
        }
    }

    showCompletionAnimation(mission) {
        const notification = document.createElement('div');
        notification.className = 'mission-complete';
        notification.innerHTML = `
            <h2>🎉 Mission Complete!</h2>
            <p>${mission.title}</p>
            <p>+${mission.rewards.points} points</p>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 3000);
    }

    createMissionContainer() {
        const container = document.createElement('div');
        container.id = 'mission-container';
        container.className = 'mission-container';
        document.querySelector('.editor-area').appendChild(container);
        return container;
    }
}

window.missionSystem = new MissionSystem();


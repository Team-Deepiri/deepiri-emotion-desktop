/**
 * Plugin System for Deepiri IDE
 * Sandboxed plugin runtime with permissions
 */
class PluginSystem {
    constructor() {
        this.plugins = new Map();
        this.permissions = new Map();
        this.sandbox = this.createSandbox();
    }

    createSandbox() {
        return {
            api: {
                tasks: {
                    create: (task) => this.createTask(task),
                    list: () => this.listTasks(),
                    update: (id, updates) => this.updateTask(id, updates)
                },
                challenges: {
                    generate: (taskId) => this.generateChallenge(taskId),
                    start: (challengeId) => this.startChallenge(challengeId)
                },
                ui: {
                    showNotification: (message) => this.showNotification(message),
                    openPanel: (panelId) => this.openPanel(panelId)
                }
            },
            storage: {
                get: (key) => localStorage.getItem(`plugin_${key}`),
                set: (key, value) => localStorage.setItem(`plugin_${key}`, value)
            }
        };
    }

    registerPlugin(pluginId, pluginCode, permissions = []) {
        try {
            const pluginFunction = new Function('sandbox', `
                ${pluginCode}
                return { init, destroy, onMessage };
            `);

            const plugin = pluginFunction(this.sandbox);
            this.plugins.set(pluginId, plugin);
            this.permissions.set(pluginId, permissions);

            if (plugin.init) {
                plugin.init();
            }

            console.log(`Plugin registered: ${pluginId}`);
        } catch (error) {
            console.error(`Plugin registration failed: ${pluginId}`, error);
        }
    }

    unregisterPlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (plugin && plugin.destroy) {
            plugin.destroy();
        }
        this.plugins.delete(pluginId);
        this.permissions.delete(pluginId);
    }

    sendMessage(pluginId, message) {
        const plugin = this.plugins.get(pluginId);
        if (plugin && plugin.onMessage) {
            return plugin.onMessage(message);
        }
    }

    async createTask(task) {
        return await window.electronAPI.apiRequest({
            method: 'POST',
            endpoint: '/tasks',
            data: task
        });
    }

    async listTasks() {
        return await window.electronAPI.apiRequest({
            method: 'GET',
            endpoint: '/tasks'
        });
    }

    async generateChallenge(taskId) {
        return await window.electronAPI.generateChallenge({ taskId });
    }

    showNotification(message) {
        // Show system notification
        console.log('Notification:', message);
    }

    openPanel(panelId) {
        // Open IDE panel
        console.log('Opening panel:', panelId);
    }
}

// Example plugin: Pomodoro Timer
const pomodoroPlugin = `
function init() {
    console.log('Pomodoro plugin initialized');
    sandbox.api.ui.showNotification('Pomodoro timer ready!');
}

function destroy() {
    console.log('Pomodoro plugin destroyed');
}

function onMessage(message) {
    if (message.type === 'start') {
        startTimer(message.duration || 25);
    }
}

function startTimer(minutes) {
    let seconds = minutes * 60;
    const interval = setInterval(() => {
        seconds--;
        if (seconds <= 0) {
            clearInterval(interval);
            sandbox.api.ui.showNotification('Pomodoro complete!');
        }
    }, 1000);
}
`;

window.pluginSystem = new PluginSystem();


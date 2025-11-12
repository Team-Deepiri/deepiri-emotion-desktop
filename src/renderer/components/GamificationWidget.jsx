import React, { useState, useEffect } from 'react';

const GamificationWidget = () => {
  const [stats, setStats] = useState({
    points: 0,
    level: 1,
    xp: 0,
    streak: 0,
    badges: []
  });

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const result = await window.electronAPI.apiRequest({
        method: 'GET',
        endpoint: '/gamification/stats'
      });
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const xpForNextLevel = stats.level * 1000;
  const xpProgress = (stats.xp / xpForNextLevel) * 100;

  return (
    <div className="gamification-widget">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-value">{stats.points.toLocaleString()}</div>
          <div className="stat-label">Points</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-value">Level {stats.level}</div>
          <div className="stat-label">Level</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔥</div>
          <div className="stat-value">{stats.streak}</div>
          <div className="stat-label">Day Streak</div>
        </div>
      </div>
      <div className="xp-progress">
        <div className="xp-label">XP to Next Level</div>
        <div className="xp-bar">
          <div className="xp-fill" style={{ width: `${xpProgress}%` }}></div>
        </div>
        <div className="xp-text">{stats.xp} / {xpForNextLevel} XP</div>
      </div>
      {stats.badges.length > 0 && (
        <div className="badges-section">
          <div className="badges-title">Recent Badges</div>
          <div className="badges-list">
            {stats.badges.slice(0, 5).map((badge, idx) => (
              <div key={idx} className="badge-item" title={badge.name}>
                {badge.emoji || '🏆'}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GamificationWidget;


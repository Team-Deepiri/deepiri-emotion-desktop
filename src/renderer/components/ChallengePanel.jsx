import React, { useState, useEffect } from 'react';

const ChallengePanel = ({ onChallengeStart, onChallengeComplete }) => {
  const [challenges, setChallenges] = useState([]);
  const [activeChallenge, setActiveChallenge] = useState(null);

  useEffect(() => {
    loadChallenges();
  }, []);

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

  const handleStart = async (challenge) => {
    setActiveChallenge(challenge);
    if (onChallengeStart) {
      onChallengeStart(challenge);
    }
  };

  const handleComplete = async (challengeId) => {
    try {
      await window.electronAPI.apiRequest({
        method: 'POST',
        endpoint: `/challenges/${challengeId}/complete`
      });
      setActiveChallenge(null);
      if (onChallengeComplete) {
        onChallengeComplete(challengeId);
      }
      loadChallenges();
    } catch (error) {
      console.error('Error completing challenge:', error);
    }
  };

  return (
    <div className="challenge-panel">
      <div className="challenge-panel-header">
        <h3>Active Challenges</h3>
        <button onClick={loadChallenges}>Refresh</button>
      </div>
      <div className="challenge-list">
        {challenges.map(challenge => (
          <div
            key={challenge.id}
            className={`challenge-item ${activeChallenge?.id === challenge.id ? 'active' : ''}`}
          >
            <div className="challenge-header">
              <h4>{challenge.title}</h4>
              <span className="challenge-difficulty">{challenge.difficulty}</span>
            </div>
            <p className="challenge-description">{challenge.description}</p>
            <div className="challenge-meta">
              <span>⭐ {challenge.pointsReward} points</span>
              <span>⏱️ {challenge.configuration?.timeLimit || 'N/A'} min</span>
            </div>
            <div className="challenge-actions">
              {activeChallenge?.id === challenge.id ? (
                <button onClick={() => handleComplete(challenge.id)}>Complete</button>
              ) : (
                <button onClick={() => handleStart(challenge)}>Start</button>
              )}
            </div>
          </div>
        ))}
        {challenges.length === 0 && (
          <div className="empty-state">
            <p>No active challenges</p>
            <button onClick={() => window.ide.generateChallenge()}>Create Challenge</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChallengePanel;


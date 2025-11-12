import { useState, useEffect, useCallback } from 'react';

export const useSession = (userId) => {
  const [sessionId, setSessionId] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (userId) {
      startSession();
    }
    return () => {
      if (sessionId) {
        endSession();
      }
    };
  }, [userId]);

  const startSession = async () => {
    try {
      const id = await window.electronAPI.startSession(userId);
      setSessionId(id);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const endSession = async () => {
    if (!sessionId) return;
    
    try {
      const result = await window.electronAPI.endSession();
      setSessionId(null);
      setIsRecording(false);
      return result;
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  const recordKeystroke = useCallback((key, file, line, column) => {
    if (sessionId) {
      window.electronAPI.recordKeystroke(key, file, line, column);
    }
  }, [sessionId]);

  const recordFileChange = useCallback((file, changeType, details) => {
    if (sessionId) {
      window.electronAPI.recordFileChange(file, changeType, details);
    }
  }, [sessionId]);

  return {
    sessionId,
    isRecording,
    startSession,
    endSession,
    recordKeystroke,
    recordFileChange
  };
};


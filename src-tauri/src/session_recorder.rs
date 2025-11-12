// Session Recording and Replay
// Record keystrokes, changes, generate insights
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionEvent {
    pub timestamp: DateTime<Utc>,
    pub event_type: String,
    pub data: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Session {
    pub session_id: String,
    pub user_id: String,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub events: Vec<SessionEvent>,
    pub summary: Option<String>,
}

pub struct SessionRecorder {
    current_session: Option<Session>,
    event_buffer: VecDeque<SessionEvent>,
    max_buffer_size: usize,
}

impl SessionRecorder {
    pub fn new() -> Self {
        Self {
            current_session: None,
            event_buffer: VecDeque::new(),
            max_buffer_size: 10000,
        }
    }

    pub fn start_session(&mut self, user_id: String) -> String {
        let session_id = uuid::Uuid::new_v4().to_string();
        let session = Session {
            session_id: session_id.clone(),
            user_id,
            start_time: Utc::now(),
            end_time: None,
            events: vec![],
            summary: None,
        };
        self.current_session = Some(session);
        session_id
    }

    pub fn record_event(&mut self, event_type: String, data: serde_json::Value) {
        let event = SessionEvent {
            timestamp: Utc::now(),
            event_type,
            data,
        };

        if let Some(ref mut session) = self.current_session {
            session.events.push(event.clone());
        }

        self.event_buffer.push_back(event);
        if self.event_buffer.len() > self.max_buffer_size {
            self.event_buffer.pop_front();
        }
    }

    pub fn record_keystroke(&mut self, key: String, file: String, line: usize, column: usize) {
        self.record_event(
            "keystroke".to_string(),
            serde_json::json!({
                "key": key,
                "file": file,
                "line": line,
                "column": column
            }),
        );
    }

    pub fn record_file_change(&mut self, file: String, change_type: String, details: serde_json::Value) {
        self.record_event(
            "file_change".to_string(),
            serde_json::json!({
                "file": file,
                "change_type": change_type,
                "details": details
            }),
        );
    }

    pub fn record_challenge_start(&mut self, challenge_id: String, challenge_data: serde_json::Value) {
        self.record_event(
            "challenge_start".to_string(),
            serde_json::json!({
                "challenge_id": challenge_id,
                "challenge_data": challenge_data
            }),
        );
    }

    pub fn record_challenge_complete(&mut self, challenge_id: String, success: bool, metrics: serde_json::Value) {
        self.record_event(
            "challenge_complete".to_string(),
            serde_json::json!({
                "challenge_id": challenge_id,
                "success": success,
                "metrics": metrics
            }),
        );
    }

    pub fn end_session(&mut self) -> Option<Session> {
        if let Some(mut session) = self.current_session.take() {
            session.end_time = Some(Utc::now());
            Some(session)
        } else {
            None
        }
    }

    pub fn generate_summary(&self, session: &Session) -> String {
        let duration = if let Some(end) = session.end_time {
            (end - session.start_time).num_minutes()
        } else {
            (Utc::now() - session.start_time).num_minutes()
        };

        let keystrokes = session.events.iter()
            .filter(|e| e.event_type == "keystroke")
            .count();

        let challenges = session.events.iter()
            .filter(|e| e.event_type == "challenge_complete")
            .count();

        format!(
            "Session Summary:\n- Duration: {} minutes\n- Keystrokes: {}\n- Challenges completed: {}",
            duration, keystrokes, challenges
        )
    }

    pub fn get_highlights(&self, session: &Session) -> Vec<String> {
        let mut highlights = vec![];

        for event in &session.events {
            match event.event_type.as_str() {
                "challenge_complete" => {
                    if let Some(success) = event.data.get("success") {
                        if success.as_bool().unwrap_or(false) {
                            highlights.push(format!(
                                "Completed challenge: {}",
                                event.data.get("challenge_id").unwrap_or(&serde_json::Value::Null)
                            ));
                        }
                    }
                }
                "file_change" => {
                    if event.data.get("change_type") == Some(&serde_json::Value::String("save".to_string())) {
                        highlights.push(format!(
                            "Saved file: {}",
                            event.data.get("file").unwrap_or(&serde_json::Value::Null)
                        ));
                    }
                }
                _ => {}
            }
        }

        highlights
    }
}


// Tauri Commands
// IPC handlers for frontend communication
use tauri::State;
use crate::gamification::GamificationEngine;
use crate::integrations::IntegrationService;
use crate::local_llm::LLMManager;
use crate::session_recorder::SessionRecorder;
use crate::AppState;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: String,
    pub task_type: String,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Challenge {
    pub id: String,
    pub title: String,
    pub description: String,
    pub difficulty: String,
    pub points_reward: i32,
    pub time_limit: i32,
}

#[tauri::command]
pub async fn create_task(
    title: String,
    description: String,
    task_type: String,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    let task_id = uuid::Uuid::new_v4().to_string();
    let status = "pending".to_string();

    sqlx::query(
        "INSERT INTO tasks (id, title, description, task_type, status) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(&task_id)
    .bind(&title)
    .bind(&description)
    .bind(&task_type)
    .bind(&status)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "success": true,
        "data": {
            "id": task_id,
            "title": title,
            "description": description,
            "task_type": task_type,
            "status": status
        }
    }))
}

#[tauri::command]
pub async fn get_tasks(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db = state.db.lock().unwrap();
    let pool = db.as_ref().ok_or("Database not initialized")?;
    
    let rows = sqlx::query("SELECT id, title, description, task_type, status FROM tasks")
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    let tasks: Vec<serde_json::Value> = rows
        .iter()
        .map(|row| serde_json::json!({
            "id": row.get::<String, _>(0),
            "title": row.get::<String, _>(1),
            "description": row.get::<String, _>(2),
            "task_type": row.get::<String, _>(3),
            "status": row.get::<String, _>(4),
        }))
        .collect();

    Ok(serde_json::json!({
        "success": true,
        "data": tasks
    }))
}

#[tauri::command]
pub async fn generate_challenge_local(
    task_id: String,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let llm = state.llm.lock().unwrap();
    let prompt = format!("Generate a gamified challenge for task: {}", task_id);
    
    let generated = match llm.generate_hint(prompt.clone()).await {
        Ok(hint) => hint,
        Err(_) => format!("Complete the task: {}", task_id)
    };

    Ok(serde_json::json!({
        "success": true,
        "data": {
            "id": uuid::Uuid::new_v4().to_string(),
            "title": "Generated Challenge",
            "description": generated,
            "difficulty": "medium",
            "pointsReward": 100,
            "timeLimit": 30
        }
    }))
}

#[tauri::command]
pub async fn award_points(
    points: i64,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let user_id = "default_user".to_string(); // Get from context
    let gamification = state.gamification.lock().unwrap();
    if let Some(ref gam) = *gamification {
        gam.award_points(&user_id, points)
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(serde_json::json!({"success": true}))
}

#[tauri::command]
pub async fn get_gamification_state(
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let user_id = "default_user".to_string();
    let gamification = state.gamification.lock().unwrap();
    if let Some(ref gam) = *gamification {
        let gam_state = gam.get_state(&user_id)
            .await
            .map_err(|e| e.to_string())?;
        return Ok(serde_json::json!({
            "success": true,
            "data": serde_json::to_value(gam_state).unwrap()
        }));
    }
    Ok(serde_json::json!({
        "success": true,
        "data": {
            "points": 0,
            "level": 1,
            "xp": 0,
            "streak": 0,
            "badges": []
        }
    }))
}

#[tauri::command]
pub async fn sync_github_issues(
    repo: String,
    token: Option<String>,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let mut integrations = state.integrations.lock().unwrap();
    if let Some(t) = token {
        integrations.connect_github(t).await?;
    }
    let issues = integrations.fetch_github_issues(&repo).await?;
    Ok(serde_json::json!({
        "success": true,
        "data": issues
    }))
}

#[tauri::command]
pub async fn get_llm_hint(
    task: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let llm = state.llm.lock().unwrap();
    llm.generate_hint(task).await
}

#[tauri::command]
pub async fn complete_code(
    code: String,
    language: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let llm = state.llm.lock().unwrap();
    llm.complete_code(code, language).await
}

#[tauri::command]
pub async fn start_session(
    user_id: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let mut recorder = state.recorder.lock().unwrap();
    Ok(recorder.start_session(user_id))
}

#[tauri::command]
pub async fn record_keystroke(
    key: String,
    file: String,
    line: usize,
    column: usize,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut recorder = state.recorder.lock().unwrap();
    recorder.record_keystroke(key, file, line, column);
    Ok(())
}

#[tauri::command]
pub async fn end_session(
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let mut recorder = state.recorder.lock().unwrap();
    if let Some(session) = recorder.end_session() {
        let summary = recorder.generate_summary(&session);
        let highlights = recorder.get_highlights(&session);
        Ok(serde_json::json!({
            "success": true,
            "data": {
                "session": session,
                "summary": summary,
                "highlights": highlights
            }
        }))
    } else {
        Err("No active session".to_string())
    }
}

#[tauri::command]
pub async fn api_request(
    method: String,
    endpoint: String,
    data: Option<serde_json::Value>,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let api_url = std::env::var("API_URL").unwrap_or_else(|_| "http://localhost:5000/api".to_string());
    let url = format!("{}{}", api_url, endpoint);
    
    let mut request = match method.as_str() {
        "GET" => client.get(&url),
        "POST" => client.post(&url).json(&data),
        "PUT" => client.put(&url).json(&data),
        "PATCH" => client.patch(&url).json(&data),
        "DELETE" => client.delete(&url),
        _ => return Err("Unsupported method".to_string()),
    };
    
    let response = request
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    let json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    Ok(json)
}


// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod gamification;
mod integrations;
mod local_llm;
mod session_recorder;
mod commands;

use tauri::{Manager, Window};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use sqlx::SqlitePool;
use gamification::GamificationEngine;
use integrations::IntegrationService;
use local_llm::LLMManager;
use session_recorder::SessionRecorder;
use commands::*;

#[derive(Debug, Serialize, Deserialize)]
struct Task {
    id: String,
    title: String,
    description: String,
    task_type: String,
    status: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct Challenge {
    id: String,
    title: String,
    description: String,
    difficulty: String,
    points_reward: i32,
    time_limit: i32,
}

struct AppState {
    db: Mutex<Option<SqlitePool>>,
    gamification: Mutex<Option<GamificationEngine>>,
    integrations: Mutex<IntegrationService>,
    llm: Mutex<LLMManager>,
    recorder: Mutex<SessionRecorder>,
}


async fn init_db() -> Result<SqlitePool, sqlx::Error> {
    let pool = SqlitePool::connect("sqlite:deepiri.db").await?;
    
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            task_type TEXT,
            status TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        "#
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS challenges (
            id TEXT PRIMARY KEY,
            task_id TEXT,
            title TEXT NOT NULL,
            description TEXT,
            difficulty TEXT,
            points_reward INTEGER,
            time_limit INTEGER,
            status TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        "#
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS gamification (
            user_id TEXT PRIMARY KEY,
            total_points INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            xp INTEGER DEFAULT 0,
            streak INTEGER DEFAULT 0,
            badges TEXT DEFAULT '[]',
            last_active DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        "#
    )
    .execute(&pool)
    .await?;

    Ok(pool)
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            tauri::async_runtime::block_on(async {
                let db = match init_db().await {
                    Ok(pool) => {
                        let gamification = GamificationEngine::new(pool.clone());
                        app.manage(AppState {
                            db: Mutex::new(Some(pool.clone())),
                            gamification: Mutex::new(Some(gamification)),
                            integrations: Mutex::new(IntegrationService::new()),
                            llm: Mutex::new(LLMManager::new()),
                            recorder: Mutex::new(SessionRecorder::new()),
                        });
                    }
                    Err(e) => {
                        eprintln!("Database initialization failed: {}", e);
                        app.manage(AppState {
                            db: Mutex::new(None),
                            gamification: Mutex::new(None),
                            integrations: Mutex::new(IntegrationService::new()),
                            llm: Mutex::new(LLMManager::new()),
                            recorder: Mutex::new(SessionRecorder::new()),
                        });
                    }
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            create_task,
            get_tasks,
            generate_challenge_local,
            award_points,
            get_gamification_state,
            sync_github_issues,
            get_llm_hint,
            complete_code,
            start_session,
            record_keystroke,
            end_session,
            api_request
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


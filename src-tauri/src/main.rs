// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod file_system;
mod gamification;
mod integrations;
mod local_llm;
mod session_recorder;

use tauri::{Manager, Window};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use sqlx::SqlitePool;
use file_system::*;
use gamification::GamificationEngine;
use integrations::IntegrationService;
use local_llm::LLMManager;
use session_recorder::SessionRecorder;
use commands::*;
use std::path::PathBuf;

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

pub struct AppState {
    db: Mutex<Option<SqlitePool>>,
    gamification: Mutex<Option<GamificationEngine>>,
    integrations: Mutex<IntegrationService>,
    llm: Mutex<LLMManager>,
    recorder: Mutex<SessionRecorder>,
    project_root: Mutex<Option<String>>,
    config_path: Mutex<Option<PathBuf>>,
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
            let config_path = app.path_resolver()
                .app_data_dir()
                .map(|d| {
                    let _ = std::fs::create_dir_all(&d);
                    d.join("deepiri_ai_settings.json")
                })
                .ok();
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
                            project_root: Mutex::new(None),
                            config_path: Mutex::new(config_path),
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
                            project_root: Mutex::new(None),
                            config_path: Mutex::new(config_path),
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
            record_file_change,
            end_session,
            api_request,
            get_project_root,
            set_project_root,
            get_ai_settings,
            set_ai_settings,
            open_file,
            save_file,
            list_directory,
            list_workspace_files,
            create_file,
            create_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


// External Integrations
// GitHub, Notion, Trello, Google Docs connectors
use serde::{Deserialize, Serialize};
use reqwest::Client;
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
pub struct IntegrationConfig {
    pub provider: String,
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_at: Option<i64>,
}

pub struct IntegrationService {
    client: Client,
    configs: HashMap<String, IntegrationConfig>,
}

impl IntegrationService {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            configs: HashMap::new(),
        }
    }

    pub async fn connect_github(&mut self, token: String) -> Result<(), String> {
        let config = IntegrationConfig {
            provider: "github".to_string(),
            access_token: token,
            refresh_token: None,
            expires_at: None,
        };
        self.configs.insert("github".to_string(), config);
        Ok(())
    }

    pub async fn fetch_github_issues(&self, repo: &str) -> Result<Vec<serde_json::Value>, String> {
        if let Some(config) = self.configs.get("github") {
            let url = format!("https://api.github.com/repos/{}/issues", repo);
            let response = self
                .client
                .get(&url)
                .header("Authorization", format!("token {}", config.access_token))
                .header("Accept", "application/vnd.github.v3+json")
                .send()
                .await
                .map_err(|e| e.to_string())?;

            let issues: Vec<serde_json::Value> = response.json().await.map_err(|e| e.to_string())?;
            Ok(issues)
        } else {
            Err("GitHub not connected".to_string())
        }
    }

    pub async fn connect_notion(&mut self, token: String) -> Result<(), String> {
        let config = IntegrationConfig {
            provider: "notion".to_string(),
            access_token: token,
            refresh_token: None,
            expires_at: None,
        };
        self.configs.insert("notion".to_string(), config);
        Ok(())
    }

    pub async fn fetch_notion_tasks(&self, database_id: &str) -> Result<Vec<serde_json::Value>, String> {
        if let Some(config) = self.configs.get("notion") {
            let url = format!("https://api.notion.com/v1/databases/{}/query", database_id);
            let response = self
                .client
                .post(&url)
                .header("Authorization", format!("Bearer {}", config.access_token))
                .header("Notion-Version", "2022-06-28")
                .header("Content-Type", "application/json")
                .send()
                .await
                .map_err(|e| e.to_string())?;

            let data: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
            Ok(data["results"].as_array().unwrap_or(&vec![]).clone())
        } else {
            Err("Notion not connected".to_string())
        }
    }

    pub async fn sync_tasks(&self, provider: &str) -> Result<Vec<serde_json::Value>, String> {
        match provider {
            "github" => {
                // Fetch from multiple repos
                Ok(vec![])
            }
            "notion" => {
                // Fetch from Notion databases
                Ok(vec![])
            }
            _ => Err("Unknown provider".to_string()),
        }
    }
}


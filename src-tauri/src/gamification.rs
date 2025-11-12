// Local Gamification Engine
// Points, badges, streaks, achievements
use sqlx::{SqlitePool, Row};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc, NaiveDate};

#[derive(Debug, Serialize, Deserialize)]
pub struct GamificationState {
    pub user_id: String,
    pub total_points: i64,
    pub level: i32,
    pub xp: i64,
    pub streak: i32,
    pub badges: Vec<String>,
    pub last_active: DateTime<Utc>,
}

pub struct GamificationEngine {
    pool: SqlitePool,
}

impl GamificationEngine {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn award_points(&self, user_id: &str, points: i64) -> Result<(), sqlx::Error> {
        sqlx::query(
            "UPDATE gamification SET total_points = total_points + ?, xp = xp + ? WHERE user_id = ?"
        )
        .bind(points)
        .bind(points)
        .bind(user_id)
        .execute(&self.pool)
        .await?;

        self.update_level(user_id).await?;
        Ok(())
    }

    pub async fn update_level(&self, user_id: &str) -> Result<(), sqlx::Error> {
        let row = sqlx::query("SELECT xp FROM gamification WHERE user_id = ?")
            .bind(user_id)
            .fetch_one(&self.pool)
            .await?;

        let xp: i64 = row.get(0);
        let new_level = (xp / 1000) as i32 + 1;

        sqlx::query("UPDATE gamification SET level = ? WHERE user_id = ?")
            .bind(new_level)
            .bind(user_id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn update_streak(&self, user_id: &str) -> Result<(), sqlx::Error> {
        let today = Utc::now().date_naive();
        
        let row = sqlx::query("SELECT last_active FROM gamification WHERE user_id = ?")
            .bind(user_id)
            .fetch_optional(&self.pool)
            .await?;

        if let Some(row) = row {
            let last_active: DateTime<Utc> = row.get(0);
            let last_date = last_active.date_naive();
            
            let days_diff = (today - last_date).num_days();
            
            if days_diff == 1 {
                // Consecutive day
                sqlx::query("UPDATE gamification SET streak = streak + 1, last_active = ? WHERE user_id = ?")
                    .bind(Utc::now())
                    .bind(user_id)
                    .execute(&self.pool)
                    .await?;
            } else if days_diff > 1 {
                // Streak broken
                sqlx::query("UPDATE gamification SET streak = 1, last_active = ? WHERE user_id = ?")
                    .bind(Utc::now())
                    .bind(user_id)
                    .execute(&self.pool)
                    .await?;
            }
        } else {
            // First time
            sqlx::query(
                "INSERT INTO gamification (user_id, streak, last_active) VALUES (?, 1, ?)"
            )
            .bind(user_id)
            .bind(Utc::now())
            .execute(&self.pool)
            .await?;
        }

        Ok(())
    }

    pub async fn award_badge(&self, user_id: &str, badge: &str) -> Result<(), sqlx::Error> {
        let row = sqlx::query("SELECT badges FROM gamification WHERE user_id = ?")
            .bind(user_id)
            .fetch_optional(&self.pool)
            .await?;

        let mut badges: Vec<String> = if let Some(row) = row {
            serde_json::from_str(row.get::<String, _>(0).as_str()).unwrap_or_default()
        } else {
            vec![]
        };

        if !badges.contains(&badge.to_string()) {
            badges.push(badge.to_string());
            let badges_json = serde_json::to_string(&badges).unwrap();

            sqlx::query("UPDATE gamification SET badges = ? WHERE user_id = ?")
                .bind(badges_json)
                .bind(user_id)
                .execute(&self.pool)
                .await?;
        }

        Ok(())
    }

    pub async fn get_state(&self, user_id: &str) -> Result<GamificationState, sqlx::Error> {
        let row = sqlx::query(
            "SELECT total_points, level, xp, streak, badges, last_active FROM gamification WHERE user_id = ?"
        )
        .bind(user_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(GamificationState {
            user_id: user_id.to_string(),
            total_points: row.get(0),
            level: row.get(1),
            xp: row.get(2),
            streak: row.get(3),
            badges: serde_json::from_str(row.get::<String, _>(4).as_str()).unwrap_or_default(),
            last_active: row.get(5),
        })
    }
}


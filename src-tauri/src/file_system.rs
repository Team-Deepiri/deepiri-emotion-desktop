// File system commands: read/write files, list dir, create file/folder
use std::path::Path;
use tokio::fs;

const SKIP_DIRS: &[&str] = &[
    "node_modules", ".git", "dist", "dist-renderer", "build", ".next",
    "__pycache__", ".venv", "venv",
];

async fn list_workspace_recursive(
    root: &Path,
    relative_dir: &str,
    out: &mut Vec<serde_json::Value>,
    skip_dirs: &std::collections::HashSet<String>,
    max_files: usize,
) -> Result<(), String> {
    if out.len() >= max_files {
        return Ok(());
    }
    let mut read_dir = fs::read_dir(root).await.map_err(|e| e.to_string())?;
    while let Some(entry) = read_dir.next_entry().await.map_err(|e| e.to_string())? {
        if out.len() >= max_files {
            break;
        }
        let name = entry.file_name().to_string_lossy().into_owned();
        let path_buf = entry.path();
        let full_path = path_buf.to_string_lossy().into_owned();
        let is_dir = entry.file_type().await.map_err(|e| e.to_string())?.is_dir();
        let rel = if relative_dir.is_empty() {
            name.clone()
        } else {
            format!("{}/{}", relative_dir, name)
        };
        if is_dir {
            if skip_dirs.contains(&name) {
                continue;
            }
            out.push(serde_json::json!({
                "path": full_path,
                "name": name,
                "isDirectory": true,
                "relativePath": rel
            }));
            list_workspace_recursive(
                &path_buf,
                &rel,
                out,
                skip_dirs,
                max_files,
            )
            .await?;
        } else {
            out.push(serde_json::json!({
                "path": full_path,
                "name": name,
                "isDirectory": false,
                "relativePath": rel
            }));
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn list_workspace_files(
    root_dir: String,
    exclude_patterns: Option<String>,
) -> Result<serde_json::Value, String> {
    if root_dir.is_empty() {
        return Ok(serde_json::json!({
            "files": [],
            "totalFiles": 0,
            "totalFolders": 0
        }));
    }
    let skip_dirs: std::collections::HashSet<String> = if let Some(pat) = exclude_patterns {
        pat.split(',')
            .map(|s| s.trim().to_lowercase())
            .filter(|s| !s.is_empty() && !s.contains('*') && !s.contains('/'))
            .chain(SKIP_DIRS.iter().map(|s| s.to_string()))
            .collect()
    } else {
        SKIP_DIRS.iter().map(|s| s.to_string()).collect()
    };
    let root = Path::new(&root_dir);
    if !root.is_dir() {
        return Err("Not a directory".to_string());
    }
    let mut files = Vec::new();
    list_workspace_recursive(root, "", &mut files, &skip_dirs, 2000).await?;
    let total_files = files.iter().filter(|v| !v["isDirectory"].as_bool().unwrap_or(false)).count();
    let total_folders = files.iter().filter(|v| v["isDirectory"].as_bool().unwrap_or(false)).count();
    Ok(serde_json::json!({
        "files": files,
        "totalFiles": total_files,
        "totalFolders": total_folders
    }))
}

#[tauri::command]
pub async fn open_file(path: String) -> Result<String, String> {
    let path = Path::new(&path);
    if !path.exists() {
        return Err("File not found".to_string());
    }
    fs::read_to_string(path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_file(path: String, contents: String) -> Result<(), String> {
    let path = Path::new(&path);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).await.map_err(|e| e.to_string())?;
    }
    fs::write(path, contents).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_directory(dir_path: String) -> Result<Vec<serde_json::Value>, String> {
    let path = Path::new(&dir_path);
    if !path.is_dir() {
        return Err("Not a directory".to_string());
    }
    let mut entries = Vec::new();
    let mut read_dir = fs::read_dir(path).await.map_err(|e| e.to_string())?;
    while let Some(entry) = read_dir.next_entry().await.map_err(|e| e.to_string())? {
        let name = entry.file_name().to_string_lossy().into_owned();
        let path_buf = entry.path();
        let full_path = path_buf.to_string_lossy().into_owned();
        let is_dir = entry.file_type().await.map_err(|e| e.to_string())?.is_dir();
        entries.push(serde_json::json!({
            "name": name,
            "path": full_path,
            "isDirectory": is_dir
        }));
    }
    Ok(entries)
}

#[tauri::command]
pub async fn create_file(dir_path: String, name: String) -> Result<String, String> {
    let path = Path::new(&dir_path).join(&name);
    fs::File::create(&path).await.map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
pub async fn create_folder(dir_path: String, name: String) -> Result<String, String> {
    let path = Path::new(&dir_path).join(&name);
    fs::create_dir_all(&path).await.map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().into_owned())
}

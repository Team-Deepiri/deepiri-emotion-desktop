/**
 * Shared constants (storage keys, limits). Single source for main and renderer.
 */
export const STORAGE_KEYS = {
  SETTINGS: 'deepiri_settings',
  THEME: 'deepiri_theme',
  EDITOR_FONT_SIZE: 'deepiri_editor_font_size',
  SIDEBAR_WIDTH: 'deepiri_sidebar_width',
  SIDEBAR_COLLAPSED: 'deepiri_sidebar_collapsed',
  PANEL_HEIGHT: 'deepiri_panel_height',
  RECENT_FOLDERS: 'deepiri_recent_folders',
  RECENT_FILES: 'deepiri_recent_files',
  USER_ID: 'user_id'
};

export const MAX_RECENT_FOLDERS = 10;
export const MAX_RECENT_FILES = 20;
export const INDEXING_MAX_FILES = 2000;
export const SEARCH_MAX_RESULTS = 500;

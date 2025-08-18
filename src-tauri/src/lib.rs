mod models;
mod rclone;
mod config;
mod schedule;
mod aws;
mod dependencies;

use rclone::*;
use config::*;
use schedule::*;
use aws::*;
use dependencies::*;

#[tauri::command]
async fn ping() -> String {
    "pong".to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            ping,
            get_profiles,
            create_profile,
            update_profile,
            delete_profile,
            get_active_profile,
            set_active_profile,
            auto_configure_rclone,
            generate_rclone_config,
            auto_setup_rclone_complete,
            detect_rclone,
            validate_rclone_config,
            list_cloud_files,
            backup_run,
            backup_preview,
            restore_files,
            get_backup_logs,
            schedule_backup,
            unschedule_backup,
            get_schedule_status,
            check_aws_credentials,
            configure_aws_credentials,
            validate_aws_permissions,
            setup_aws_infrastructure,
            generate_employee_rclone_config,
            get_employee_credentials,
            check_dependencies,
            install_dependency
        ])
        .setup(|app| {
            let app_handle = app.handle();
            
            // Initialize configuration directory
            tauri::async_runtime::spawn(async move {
                if let Err(e) = initialize_config().await {
                    eprintln!("Failed to initialize config: {}", e);
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
fn main() {
    // Kill any running instance before the linker tries to replace the exe.
    // On Windows the linker fails with os error 32 if the old binary is open.
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("taskkill")
            .args(["/F", "/IM", "velaris.exe", "/T"])
            .output()
            .ok();
    }
    tauri_build::build()
}

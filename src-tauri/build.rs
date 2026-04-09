fn main() {
    // A rerun-if-changed pointing to a nonexistent file forces Cargo to
    // re-run this build script on every invocation (Cargo Book: "if the path
    // does not exist the script will be re-run every time cargo runs").
    // Without this the script is cached and the taskkill never fires again
    // after the first build.
    println!("cargo:rerun-if-changed=__force_rerun__");

    // Kill any running instance before the linker tries to replace the exe.
    // On Windows the linker fails with os error 32 if the old binary is open.
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("taskkill")
            .args(["/F", "/IM", "velaris.exe", "/T"])
            .output();
        // Give Windows a moment to release the file handle before Cargo
        // tries to delete the old exe.
        std::thread::sleep(std::time::Duration::from_millis(300));
    }

    tauri_build::build()
}

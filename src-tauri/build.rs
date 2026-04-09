fn main() {
    // A rerun-if-changed pointing to a nonexistent file forces Cargo to
    // re-run this build script on every invocation (Cargo Book: "if the path
    // does not exist the script will be re-run every time cargo runs").
    println!("cargo:rerun-if-changed=__force_rerun__");

    #[cfg(target_os = "windows")]
    {
        // 1. Kill the running instance.
        let _ = std::process::Command::new("taskkill")
            .args(["/F", "/IM", "velaris.exe", "/T"])
            .output();

        // 2. Give Windows a moment to start releasing handles.
        std::thread::sleep(std::time::Duration::from_millis(400));

        // 3. Rename the old exe so the linker can create a fresh one at the
        //    same path, even if Windows hasn't fully released the file handle yet.
        //    On Windows you can rename (but not delete) a file that still has
        //    open read/execute handles — this frees the name immediately.
        let pid = std::process::id();
        for path in [
            "target\\debug\\velaris.exe",
            "target\\debug\\deps\\velaris.exe",
        ] {
            let p = std::path::Path::new(path);
            if p.exists() {
                let temp = format!("{}.{}.del", path, pid);
                if std::fs::rename(p, &temp).is_ok() {
                    // Best-effort cleanup; Windows will delete it once all
                    // handles close if this fails now.
                    let _ = std::fs::remove_file(&temp);
                }
            }
        }
    }

    tauri_build::build()
}

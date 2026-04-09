fn main() {
    // A rerun-if-changed pointing to a nonexistent file forces Cargo to
    // re-run this build script on every invocation.
    println!("cargo:rerun-if-changed=__force_rerun__");

    #[cfg(target_os = "windows")]
    kill_and_free_exe();

    tauri_build::build()
}

#[cfg(target_os = "windows")]
fn kill_and_free_exe() {
    use std::{path::Path, process::Command, thread, time::Duration};

    // 1. Kill all running instances (including child processes).
    let _ = Command::new("taskkill").args(["/F", "/IM", "velaris.exe", "/T"]).output();
    // Second attempt via wmic in case taskkill misses it.
    let _ = Command::new("wmic")
        .args(["process", "where", "name='velaris.exe'", "delete"])
        .output();

    let pid = std::process::id();
    let targets = [
        "target\\debug\\velaris.exe",
        "target\\debug\\deps\\velaris.exe",
    ];

    // 2. Retry loop: poll every 250 ms for up to 3 s.
    //    On each attempt try to rename the file to free the path for the linker.
    //    Renaming (unlike deleting) works even when Windows hasn't fully
    //    released the mapped-section lock yet.
    'retry: for attempt in 0u32..12 {
        thread::sleep(Duration::from_millis(250));

        for path in &targets {
            let p = Path::new(path);
            if !p.exists() {
                continue;
            }
            let tmp = format!("{}.{}.del", path, pid);
            if std::fs::rename(p, &tmp).is_ok() {
                let _ = std::fs::remove_file(&tmp);
                break 'retry; // freed — let the linker proceed
            }
            // Rename failed (Defender / antivirus still holding it).
            // Keep trying; re-issue taskkill on each odd attempt.
            if attempt % 2 == 1 {
                let _ = Command::new("taskkill")
                    .args(["/F", "/IM", "velaris.exe", "/T"])
                    .output();
            }
        }
    }
}

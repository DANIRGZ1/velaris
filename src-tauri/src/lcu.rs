// ——— LCU API Connection Module ———————————————————————————————————
//
// Reads the League Client lockfile, establishes a connection,
// and watches for game phase changes via WebSocket.
//
// The lockfile is located at:
//   C:\Riot Games\League of Legends\lockfile
//   (or wherever League is installed)
//
// Format: process_name:pid:port:password:protocol

use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;
use base64::Engine;
use tauri::{Emitter, Manager, WebviewWindowBuilder, WebviewUrl};
use tauri_plugin_notification::NotificationExt;

#[cfg(windows)]
use std::sync::OnceLock;
#[cfg(windows)]
use std::sync::atomic::{AtomicIsize, Ordering};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[derive(Debug, Clone)]
pub struct Lockfile {
    pub port: u16,
    pub password: String,
    #[allow(dead_code)]
    pub protocol: String,
}

/// Default League installation paths to check
const LEAGUE_PATHS: &[&str] = &[
    "C:\\Riot Games\\League of Legends\\lockfile",
    "C:\\Riot Games\\League Of Legends\\lockfile",
    "D:\\Riot Games\\League of Legends\\lockfile",
    "D:\\Riot Games\\League Of Legends\\lockfile",
    "C:\\Program Files\\Riot Games\\League of Legends\\lockfile",
    "D:\\Program Files\\Riot Games\\League of Legends\\lockfile",
    "C:\\Program Files (x86)\\Riot Games\\League of Legends\\lockfile",
];

pub fn find_lockfile_path() -> Option<PathBuf> {
    // Strategy 1: Check hardcoded common paths
    for path in LEAGUE_PATHS {
        let p = PathBuf::from(path);
        if p.exists() {
            return Some(p);
        }
    }

    // Strategy 2: Find dynamically from the running LeagueClientUx.exe process
    find_lockfile_from_process()
}

/// Dynamically finds the lockfile by locating the running LeagueClientUx.exe process.
/// Uses WMIC on Windows to get the executable path, then derives the lockfile location.
#[cfg(target_os = "windows")]
fn find_lockfile_from_process() -> Option<PathBuf> {
    // CREATE_NO_WINDOW (0x08000000) prevents a cmd.exe flash
    let output = std::process::Command::new("wmic")
        .args(["process", "where", "name='LeagueClientUx.exe'", "get", "ExecutablePath", "/format:list"])
        .creation_flags(0x08000000)
        .output()
        .ok()?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        if let Some(path_str) = line.strip_prefix("ExecutablePath=") {
            let exe_path = PathBuf::from(path_str.trim());
            if let Some(parent) = exe_path.parent() {
                let lockfile = parent.join("lockfile");
                if lockfile.exists() {
                    return Some(lockfile);
                }
            }
        }
    }
    None
}

#[cfg(not(target_os = "windows"))]
fn find_lockfile_from_process() -> Option<PathBuf> {
    None
}

pub fn read_lockfile() -> Result<Lockfile, String> {
    let path = find_lockfile_path()
        .ok_or_else(|| "League of Legends lockfile not found. Is the client running?".to_string())?;

    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read lockfile: {}", e))?;

    let parts: Vec<&str> = content.trim().split(':').collect();
    if parts.len() < 5 {
        return Err("Invalid lockfile format".to_string());
    }

    Ok(Lockfile {
        port: parts[2].parse().map_err(|_| "Invalid port in lockfile")?,
        password: parts[3].to_string(),
        protocol: parts[4].to_string(),
    })
}

pub fn create_client(lockfile: &Lockfile) -> Result<reqwest::Client, String> {
    let auth = base64::engine::general_purpose::STANDARD.encode(format!("riot:{}", lockfile.password));

    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert(
        reqwest::header::AUTHORIZATION,
        reqwest::header::HeaderValue::from_str(&format!("Basic {}", auth))
            .map_err(|e| e.to_string())?,
    );

    reqwest::Client::builder()
        .danger_accept_invalid_certs(true) // LCU uses self-signed certs
        .default_headers(headers)
        .build()
        .map_err(|e| e.to_string())
}

/// Watches the LCU gameflow phase and emits events to the frontend.
/// This runs in a background thread and polls every 2 seconds.
///
/// Emitted event: "lcu-phase-changed"
/// Payloads: "CONNECTING", "DISCONNECTED", "LOBBY", "MATCHMAKING",
///           "READY_CHECK", "CHAMP_SELECT", "IN_GAME"
pub async fn watch_client_state(handle: tauri::AppHandle) {
    let mut last_phase = String::new();

    loop {

        // Primary: LCU phase via lockfile
        let lcu_phase = get_current_phase().await;

        // Secondary: if LCU says we're in game OR Live Client API responds → IN_GAME
        let phase_str: &str = match &lcu_phase {
            Ok(p) => match p.as_str() {
                "None"        => "LOBBY",   // Client open at home screen — show as connected
                "Lobby"       => "LOBBY",
                "Matchmaking" => "MATCHMAKING",
                "CheckedIntoTournament" => "MATCHMAKING",
                "ReadyCheck"  => "READY_CHECK",
                "ChampSelect" => "CHAMP_SELECT",
                "InProgress" | "GameStart" | "Reconnect" => "IN_GAME",
                "WaitingForStats" | "PreEndOfGame" | "EndOfGame" => "END_OF_GAME",
                // Unknown transient phases: skip without changing state
                _ => continue,
            },
            Err(_) => {
                // LCU not reachable. Only stay IN_GAME if we were already in game
                // AND the live client API still responds. This prevents a race where
                // the LCU briefly restarts after a game (reporting an error) while
                // port 2999 is still shutting down — which would incorrectly re-open
                // the overlay right after it was closed.
                if last_phase == "IN_GAME" && is_live_client_running().await {
                    continue; // stay IN_GAME, don't touch the overlay
                }
                "DISCONNECTED"
            }
        };

        if phase_str != last_phase {
            let _ = handle.emit("lcu-phase-changed", phase_str);

            // ── Desktop notifications on key transitions ─────────────────────
            match phase_str {
                "READY_CHECK" => {
                    let _ = handle.notification()
                        .builder()
                        .title("¡Partida encontrada! 🎮")
                        .body("Acepta en los próximos 30 segundos.")
                        .show();
                }
                "END_OF_GAME" => {
                    let _ = handle.notification()
                        .builder()
                        .title("Partida finalizada")
                        .body("Velaris está analizando tu partida…")
                        .show();
                }
                _ => {}
            }

            // ── Window management ─────────────────────────────────────────────
            match phase_str {
                "IN_GAME" => {
                    if let Some(main) = handle.get_webview_window("main") {
                        let _ = main.hide();
                    }
                    // Small delay: if we just closed the overlay (e.g., came from END_OF_GAME
                    // directly into a new game), give Tauri time to deregister the old window
                    // before we try to create a new one.
                    if last_phase == "END_OF_GAME" || last_phase == "LOBBY" || last_phase == "DISCONNECTED" {
                        let h = handle.clone();
                        tauri::async_runtime::spawn(async move {
                            tokio::time::sleep(Duration::from_millis(300)).await;
                            open_overlay_window(&h);
                        });
                    } else {
                        open_overlay_window(&handle);
                    }
                }
                "END_OF_GAME" | "LOBBY" | "DISCONNECTED" => {
                    close_overlay_window(&handle);
                    if let Some(main) = handle.get_webview_window("main") {
                        let _ = main.show();
                        let _ = main.set_focus();
                    }
                }
                _ => {}
            }

            last_phase = phase_str.to_string();
        }

        // Poll faster when disconnected (trying to detect client startup quickly),
        // slower when connected (reduce LCU request noise).
        let delay = if phase_str == "DISCONNECTED" || last_phase.is_empty() {
            Duration::from_millis(1500)
        } else {
            Duration::from_secs(2)
        };
        tokio::time::sleep(delay).await;
    }
}

pub fn open_overlay_window(handle: &tauri::AppHandle) {
    // Don't create if already open
    if handle.get_webview_window("overlay").is_some() {
        return;
    }

    // Get primary monitor resolution so the overlay covers the full screen.
    // Avoid maximized/fullscreen modes — on Windows they use exclusive compositing
    // that breaks per-pixel transparency.
    let (mon_w, mon_h) = handle
        .primary_monitor()
        .ok()
        .flatten()
        .map(|m| (m.size().width as f64, m.size().height as f64))
        .unwrap_or((1920.0, 1080.0));

    match WebviewWindowBuilder::new(
        handle,
        "overlay",
        WebviewUrl::App("overlay".into()),
    )
    .title("Velaris Overlay")
    .transparent(true)
    .decorations(false)
    .always_on_top(true)
    .position(0.0, 0.0)
    .inner_size(mon_w, mon_h)
    .skip_taskbar(true)
    .focused(false)
    .build()
    {
        Ok(win) => {
            // Click-through by default: mouse events pass through to the game
            let _ = win.set_ignore_cursor_events(true);
            // Prevent overlay from ever capturing keyboard focus (Windows)
            #[cfg(windows)]
            set_noactivate(&win);
            // WebView2 creates its HWND tree asynchronously after the window is shown.
            // We must wait for it to finish, then patch every child HWND with
            // WS_EX_TRANSPARENT so that mouse events truly reach the game beneath.
            #[cfg(windows)]
            {
                let win2 = win.clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(Duration::from_millis(1000)).await;
                    fix_overlay_clickthrough(&win2, true);
                });
            }
        }
        Err(e) => eprintln!("[Velaris] Failed to create overlay window: {e}"),
    }
}

/// Sets WS_EX_NOACTIVATE on the overlay window so it never steals
/// keyboard focus from the game, even if it's always-on-top.
#[cfg(windows)]
fn set_noactivate(win: &tauri::WebviewWindow) {
    use raw_window_handle::{HasWindowHandle, RawWindowHandle};
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetWindowLongPtrW, SetWindowLongPtrW, GWL_EXSTYLE, WS_EX_NOACTIVATE,
    };

    if let Ok(handle) = win.window_handle() {
        if let RawWindowHandle::Win32(h) = handle.as_raw() {
            let hwnd = h.hwnd.get() as *mut std::ffi::c_void;
            unsafe {
                let ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
                SetWindowLongPtrW(hwnd, GWL_EXSTYLE, ex_style | WS_EX_NOACTIVATE as isize);
            }
        }
    }
}


/// Sets or clears WS_EX_TRANSPARENT on the overlay window AND all its WebView2 child
/// HWNDs so that mouse events truly pass through (or don't) to the game.
///
/// Tauri's set_ignore_cursor_events() only touches the top-level HWND.
/// WebView2 renders in a separate child HWND tree that still intercepts mouse input
/// unless we enumerate children and patch them here too.
///
/// Must be called AFTER WebView2 has created its HWND tree (≥300 ms after window creation).
#[cfg(windows)]
pub fn fix_overlay_clickthrough(win: &tauri::WebviewWindow, clickthrough: bool) {
    use raw_window_handle::{HasWindowHandle, RawWindowHandle};
    use windows_sys::Win32::{
        Foundation::{BOOL, HWND, LPARAM},
        UI::WindowsAndMessaging::{
            EnumChildWindows, GetWindowLongPtrW, SetWindowLongPtrW,
            GWL_EXSTYLE, WS_EX_TRANSPARENT,
        },
    };

    unsafe extern "system" fn enum_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
        use windows_sys::Win32::UI::WindowsAndMessaging::{
            GetWindowLongPtrW, SetWindowLongPtrW, GWL_EXSTYLE, WS_EX_TRANSPARENT,
        };
        let ex = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
        if lparam != 0 {
            SetWindowLongPtrW(hwnd, GWL_EXSTYLE, ex | WS_EX_TRANSPARENT as isize);
        } else {
            SetWindowLongPtrW(hwnd, GWL_EXSTYLE, ex & !(WS_EX_TRANSPARENT as isize));
        }
        1 // TRUE — continue enumeration
    }

    if let Ok(handle) = win.window_handle() {
        if let RawWindowHandle::Win32(h) = handle.as_raw() {
            let hwnd = h.hwnd.get() as HWND;
            unsafe {
                // Also patch the top-level HWND to stay in sync
                let ex = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
                if clickthrough {
                    SetWindowLongPtrW(hwnd, GWL_EXSTYLE, ex | WS_EX_TRANSPARENT as isize);
                } else {
                    SetWindowLongPtrW(hwnd, GWL_EXSTYLE, ex & !(WS_EX_TRANSPARENT as isize));
                }
                EnumChildWindows(hwnd, Some(enum_proc), if clickthrough { 1 } else { 0 });
            }
        }
    }
}

pub fn close_overlay_window(handle: &tauri::AppHandle) {
    if let Some(win) = handle.get_webview_window("overlay") {
        let _ = win.close();
    }
}

// ─── Low-level keyboard hook for overlay hotkeys (Windows only) ───────────────
//
// RegisterHotKey (used by tauri_plugin_global_shortcut) can fail when a
// fullscreen game like LoL has keyboard focus. WH_KEYBOARD_LL fires at the
// OS level before any application processes the key, so it works even when
// LoL is the foreground window.

#[cfg(windows)]
static KBD_HOOK: AtomicIsize = AtomicIsize::new(0);

#[cfg(windows)]
static MOUSE_HOOK: AtomicIsize = AtomicIsize::new(0);
#[cfg(windows)]
static MOUSE_THREAD_ID: std::sync::atomic::AtomicU32 = std::sync::atomic::AtomicU32::new(0);
/// Set to true on LBUTTONDOWN so we only forward MOUSEMOVE events during an active drag.
#[cfg(windows)]
pub static IS_DRAGGING: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

#[cfg(windows)]
static KBD_APP_HANDLE: OnceLock<Mutex<Option<tauri::AppHandle>>> = OnceLock::new();

// ─── Shared helper: emit an event to the overlay window ───────────────────────
#[cfg(windows)]
fn emit_to_overlay(event: &str, payload: impl serde::Serialize + Clone) {
    if let Some(mtx) = KBD_APP_HANDLE.get() {
        if let Ok(guard) = mtx.try_lock() {
            if let Some(app) = guard.as_ref() {
                if let Some(overlay) = app.get_webview_window("overlay") {
                    let _ = overlay.emit(event, payload);
                }
            }
        }
    }
}

// ─── WH_KEYBOARD_LL callback ──────────────────────────────────────────────────
#[cfg(windows)]
unsafe extern "system" fn low_level_kbd_proc(
    code: i32,
    wparam: windows_sys::Win32::Foundation::WPARAM,
    lparam: windows_sys::Win32::Foundation::LPARAM,
) -> windows_sys::Win32::Foundation::LRESULT {
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        CallNextHookEx, HC_ACTION, KBDLLHOOKSTRUCT, WM_KEYUP, WM_SYSKEYUP,
    };
    // Fire on KEYUP: KEYDOWN repeats while held, causing rapid ON/OFF toggles.
    if code == HC_ACTION as i32 && (wparam as u32 == WM_KEYUP || wparam as u32 == WM_SYSKEYUP) {
        let kb = &*(lparam as *const KBDLLHOOKSTRUCT);
        let ev: Option<&str> = match kb.vkCode {
            119 => Some("overlay-toggle-interactive"), // F8
            120 => Some("overlay-toggle-visibility"),  // F9
            _ => None,
        };
        if let Some(name) = ev {
            emit_to_overlay(name, ());
        }
    }
    CallNextHookEx(KBD_HOOK.load(Ordering::Relaxed) as _, code, wparam, lparam)
}

// ─── WH_MOUSE_LL callback ─────────────────────────────────────────────────────
#[cfg(windows)]
unsafe extern "system" fn low_level_mouse_proc(
    code: i32,
    wparam: windows_sys::Win32::Foundation::WPARAM,
    lparam: windows_sys::Win32::Foundation::LPARAM,
) -> windows_sys::Win32::Foundation::LRESULT {
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        CallNextHookEx, HC_ACTION, MSLLHOOKSTRUCT,
        WM_LBUTTONDOWN, WM_LBUTTONUP, WM_MOUSEMOVE,
    };
    if code == HC_ACTION as i32 {
        let ms = &*(lparam as *const MSLLHOOKSTRUCT);
        match wparam as u32 {
            WM_LBUTTONDOWN => {
                // Optimistically start drag — React will ignore if not on a widget
                IS_DRAGGING.store(true, Ordering::Relaxed);
                emit_to_overlay("overlay-mouse-down", (ms.pt.x, ms.pt.y));
            }
            WM_MOUSEMOVE if IS_DRAGGING.load(Ordering::Relaxed) => {
                // Only emit moves during an active drag to avoid flooding IPC
                emit_to_overlay("overlay-mouse-move", (ms.pt.x, ms.pt.y));
            }
            WM_LBUTTONUP => {
                if IS_DRAGGING.load(Ordering::Relaxed) {
                    IS_DRAGGING.store(false, Ordering::Relaxed);
                    emit_to_overlay("overlay-mouse-up", ());
                }
            }
            _ => {}
        }
    }
    CallNextHookEx(MOUSE_HOOK.load(Ordering::Relaxed) as _, code, wparam, lparam)
}

/// Installs a WH_KEYBOARD_LL hook for F8/F9. Runs on a dedicated thread.
#[cfg(windows)]
pub fn install_keyboard_hook(app: tauri::AppHandle) {
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        DispatchMessageW, GetMessageW, SetWindowsHookExW, TranslateMessage, WH_KEYBOARD_LL, MSG,
    };
    let mtx = KBD_APP_HANDLE.get_or_init(|| Mutex::new(None));
    if let Ok(mut g) = mtx.lock() { *g = Some(app); }

    std::thread::Builder::new()
        .name("velaris-kbd-hook".into())
        .spawn(|| unsafe {
            let hook = SetWindowsHookExW(WH_KEYBOARD_LL, Some(low_level_kbd_proc), std::ptr::null_mut(), 0);
            if hook == std::ptr::null_mut() { return; }
            KBD_HOOK.store(hook as isize, Ordering::Relaxed);
            let mut msg: MSG = std::mem::zeroed();
            while GetMessageW(&mut msg, std::ptr::null_mut(), 0, 0) > 0 {
                TranslateMessage(&msg);
                DispatchMessageW(&msg);
            }
        })
        .expect("failed to spawn keyboard hook thread");
}

/// Installs a WH_MOUSE_LL hook for drag-mode. Runs on a dedicated thread.
/// Safe to call multiple times — skips if already installed.
#[cfg(windows)]
pub fn install_mouse_hook() {
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        DispatchMessageW, GetMessageW, SetWindowsHookExW, TranslateMessage, WH_MOUSE_LL, MSG,
    };
    use windows_sys::Win32::System::Threading::GetCurrentThreadId;

    if MOUSE_HOOK.load(Ordering::Relaxed) != 0 { return; }

    std::thread::Builder::new()
        .name("velaris-mouse-hook".into())
        .spawn(|| unsafe {
            MOUSE_THREAD_ID.store(GetCurrentThreadId(), Ordering::Relaxed);
            let hook = SetWindowsHookExW(WH_MOUSE_LL, Some(low_level_mouse_proc), std::ptr::null_mut(), 0);
            if hook == std::ptr::null_mut() {
                MOUSE_THREAD_ID.store(0, Ordering::Relaxed);
                return;
            }
            MOUSE_HOOK.store(hook as isize, Ordering::Relaxed);
            let mut msg: MSG = std::mem::zeroed();
            while GetMessageW(&mut msg, std::ptr::null_mut(), 0, 0) > 0 {
                TranslateMessage(&msg);
                DispatchMessageW(&msg);
            }
            // WM_QUIT received — unhook and clean up
            use windows_sys::Win32::UI::WindowsAndMessaging::UnhookWindowsHookEx;
            UnhookWindowsHookEx(MOUSE_HOOK.swap(0, Ordering::Relaxed) as _);
            MOUSE_THREAD_ID.store(0, Ordering::Relaxed);
        })
        .expect("failed to spawn mouse hook thread");
}

/// Uninstalls the WH_MOUSE_LL hook by posting WM_QUIT to its message pump thread.
#[cfg(windows)]
pub fn uninstall_mouse_hook() {
    use windows_sys::Win32::UI::WindowsAndMessaging::{PostThreadMessageW, WM_QUIT};
    IS_DRAGGING.store(false, Ordering::Relaxed);
    let tid = MOUSE_THREAD_ID.load(Ordering::Relaxed);
    if tid != 0 {
        unsafe { PostThreadMessageW(tid, WM_QUIT, 0, 0); }
    }
}

async fn get_current_phase() -> Result<String, String> {
    let lockfile = read_lockfile()?;
    let client = create_client(&lockfile)?;

    let resp: serde_json::Value = client
        .get(&format!("https://127.0.0.1:{}/lol-gameflow/v1/gameflow-phase", lockfile.port))
        .send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;

    resp.as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Invalid phase response".to_string())
}

/// Returns true if the League of Legends in-game client (port 2999) is responding.
/// This works even when the LCU (lobby client) is not available.
async fn is_live_client_running() -> bool {
    let client = match reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .timeout(Duration::from_millis(800))
        .build()
    {
        Ok(c) => c,
        Err(_) => return false,
    };

    client
        .get("https://127.0.0.1:2999/liveclientdata/activeplayername")
        .send()
        .await
        .is_ok()
}
// Velaris desktop entry point — delegates to the library crate.
// All commands, plugins, and setup live in lib.rs (velaris_lib).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    velaris_lib::run();
}

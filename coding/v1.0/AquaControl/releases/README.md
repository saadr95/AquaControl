# Firmware releases

This folder is just a local staging spot for `firmware.bin` before publishing
it as a GitHub Release asset — the `.bin` itself isn't committed to git (see
root `.gitignore`), only this note.

## Publishing a new OTA release

1. Bump `FW_VERSION` in `AquaControl/config.h`.
2. Compile with the OTA-sized partition scheme (required — the default
   scheme doesn't leave enough room for future updates):
   ```
   arduino-cli compile --fqbn "esp32:esp32:esp32:PartitionScheme=min_spiffs" AquaControl --export-binaries
   ```
3. Copy `AquaControl/build/esp32.esp32.esp32/AquaControl.ino.bin` to
   `AquaControl/releases/firmware.bin` (overwrite it).
4. On GitHub: **Releases → Draft a new release**. Tag it `vX.Y.Z` matching
   `FW_VERSION`, attach `firmware.bin` as the asset (must keep that exact
   filename — the firmware's OTA URL always requests `firmware.bin`), and
   publish as a **full release, not a pre-release** (GitHub's "latest"
   alias — which the OTA URL relies on — skips pre-releases and drafts).
5. Trigger the update from the app (or `{"cmd":"OTA_UPDATE"}` over MQTT) on
   any board with the pump/valve idle — it refuses to start OTA otherwise,
   since the download blocks the safety-check loop for up to a minute.

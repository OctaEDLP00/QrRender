# @qr-render/cli

## 0.2.0

### Minor Changes

- 1a87119: Added a terminal picture viewer and a safer WiFi workflow:

  - **`qr wifi`** subcommand: builds the `WIFI:` string for you (SSID first, reserved characters
    `\ ; , : "` backslash-escaped per the ZXing convention used by Android and iOS), so a `;` or `:`
    inside the SSID/password can no longer silently truncate the field and make phones report a
    wrong password. It supports every display flag of the main command (`--output`, `--ink`, …).
  - **`--ink`**: shows the QR as a real picture in the terminal (SVG source rasterized on the fly)
    via ink-picture with automatic protocol detection (Kitty, iTerm2, Sixel) and
    half-block/Braille/ASCII fallbacks.
  - **`--ink-picture`**: same as `--ink` but feeding the PNG bytes directly.
  - **`-w, --width`, `-h, --height`, `-m, --margin`**: picture size in terminal cells and margin
    around it (only valid with `--ink`/`--ink-picture`). `--help` has no short alias anymore so `-h`
    stays free.

## 0.1.1

### Patch Changes

- d63baf7: Cambio de `tsup` a `tsdown` (Rolldown) en el toolchain de build y migración del
  type-check a TypeScript 7 nativo. Sin cambios de API ni de comportamiento.
- Updated dependencies [d63baf7]
  - @qr-render/core@0.1.1

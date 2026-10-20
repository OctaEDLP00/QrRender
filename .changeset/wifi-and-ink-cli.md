---
'@qr-render/cli': minor
---

Added a terminal picture viewer and a safer WiFi workflow:

- **`qr wifi`** subcommand: builds the `WIFI:` string for you (SSID first, reserved
  characters `\ ; , : "` backslash-escaped per the ZXing convention used by Android and
  iOS), so a `;` or `:` inside the SSID/password can no longer silently truncate the
  field and make phones report a wrong password. It supports every display flag of the
  main command (`--output`, `--ink`, …).
- **`--ink`**: shows the QR as a real picture in the terminal (SVG source rasterized on
  the fly) via ink-picture with automatic protocol detection (Kitty, iTerm2, Sixel) and
  half-block/Braille/ASCII fallbacks.
- **`--ink-picture`**: same as `--ink` but feeding the PNG bytes directly.
- **`-w, --width`, `-h, --height`, `-m, --margin`**: picture size in terminal cells and
  margin around it (only valid with `--ink`/`--ink-picture`). `--help` has no short
  alias anymore so `-h` stays free.

# Custom Audio Player

A browser-based audio player built with vanilla HTML, CSS, and the Web Audio API.
No frameworks, no dependencies — just open `index.html` in any modern browser.

## File structure

```
audio-player/
├── index.html          ← Main HTML (structure + markup)
├── css/
│   └── styles.css      ← All styling
├── js/
│   └── player.js       ← All Web Audio API logic
└── README.md
```

## Features

| Feature | Detail |
|---|---|
| Audio playback | Load any browser-supported audio file (mp3, wav, ogg, flac, …) |
| Play / Pause | Button + `Space` key |
| Volume control | Slider (0–100 %) |
| Mute / Unmute | Button + `M` key |
| Loop / Repeat | Button + `L` key |
| Playback speed | Slider (0.5 × – 2.0 ×) |
| Seek bar | Click anywhere on the bar to scrub |
| Current time | Live timestamp display |
| Skip ±10 s | Buttons + `←` / `→` keys |
| Keyboard controls | Space, M, L, ←, →, ↑, ↓ |
| Frequency visualiser | Real-time bars via `AnalyserNode` |
| Demo tone | 440 Hz sine wave — no file needed |
| Drag & drop | Drag an audio file onto the upload area |

## How to run

Just open `index.html` directly in Chrome, Firefox, Edge, or Safari.

```
# macOS / Linux
open index.html

# Windows
start index.html
```

> No build step, no server, no npm install needed.

## Web Audio API graph

```
[File]  HTMLAudioElement
           |
           v
  MediaElementSourceNode
           |
           v
       AnalyserNode  ──→  frequency data for visualiser bars
           |
           v
   AudioContext.destination  (speakers)

[Demo] OscillatorNode → GainNode → AnalyserNode → destination
```

## Browser support

Works in all modern browsers that support the Web Audio API (Chrome 14+, Firefox 25+, Safari 6+, Edge 79+).

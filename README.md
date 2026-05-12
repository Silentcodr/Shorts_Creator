# 🎬 Shorts Creator

Turn your text into engaging, animated vertical videos (YouTube Shorts / Instagram Reels) — with AI voiceover, lyrical subtitles, dramatic pauses, and more. All from your browser.

---

## ✨ Features

- **AI Voiceover (ElevenLabs)** — Generate ultra-realistic, emotional voice narration using the free tier of ElevenLabs. Choose from multiple voice styles.
- **Lyrical Subtitle Animation** — Words appear on screen in real-time, highlighted as they are spoken — just like YouTube CC or karaoke lyrics.
- **Character-Weighted Sync** — Text timing is weighted by word length and punctuation for smooth, natural synchronization with the audio.
- **Dramatic Pauses (`---`)** — Type `---` anywhere in your script to insert a cinematic 1.2-second silence for emotional impact.
- **Multiple Backgrounds** — Choose from Deep Space (dark), Neon Purple, Ocean Depth, or Dark Sunset gradients for your video.
- **Thumbnail Generator** — Instantly create a bold, black-background thumbnail image (1080×1920) with your text — ready for upload.
- **Microphone Mode** — Record your own voiceover while the text animates on screen.
- **Basic TTS Fallback** — Use your browser's built-in Microsoft voices if you don't have an API key.
- **One-Click Download** — Export your video as a `.webm` file with audio baked in, ready for YouTube or Instagram.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- A free [ElevenLabs](https://elevenlabs.io/) account (for AI voices)

### Installation

```bash
git clone https://github.com/Silentcodr/Shorts_Creator.git
cd Shorts_Creator
npm install
npm run dev
```

Open your browser and go to `http://localhost:5173/`

### Setting Up ElevenLabs (Free)

1. Go to [elevenlabs.io](https://elevenlabs.io/) and sign up (no credit card needed).
2. Click your profile icon → **Profile + API Key**.
3. Copy the API key.
4. Paste it into the app under **ElevenLabs AI → API Key** field.

> **Free Tier:** 10,000 characters/month ≈ 10–12 one-minute videos.

---

## 🎯 How to Use

1. **Write your script** in the text area.
2. **Add pauses** by typing `---` between sentences for dramatic effect.
3. **Choose a voice** from the ElevenLabs dropdown (or use Basic TTS / Mic).
4. **Pick a background** — dark, purple, blue, or sunset.
5. **Click "Generate Video"** — watch the live preview animate in real-time.
6. **Download** your finished `.webm` video file.
7. **Generate a thumbnail** using the Thumbnail Generator below the preview.

### Example Script

```
I've been keeping a secret from you --- for a very long time. --- And today, I'm finally going to reveal it.
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **React + Vite** | Frontend framework & dev server |
| **HTML5 Canvas** | Frame-by-frame video rendering (1080×1920) |
| **MediaRecorder API** | Browser-native video recording |
| **Web Audio API** | Captures ElevenLabs audio into the video file |
| **ElevenLabs API** | AI text-to-speech with emotional voices |
| **Web Speech API** | Fallback browser TTS (Microsoft voices) |

---

## 📁 Project Structure

```
├── public/
├── src/
│   ├── App.jsx        # Main application logic
│   ├── index.css       # Premium glassmorphism styling
│   └── main.jsx        # React entry point
├── index.html
├── package.json
└── vite.config.js
```

---

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

---

**Built with ❤️ by [Silentcodr](https://github.com/Silentcodr)**

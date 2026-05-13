import { useState, useRef, useEffect } from 'react';
import { Play, Download, Type, Loader2, Image } from 'lucide-react';

function App() {
  const [text, setText] = useState('Welcome to the future of content.\nThis is an auto-generated short.\nType your script here!');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [audioMode, setAudioMode] = useState('elevenlabs'); // 'tts' or 'elevenlabs'
  const [currentWord, setCurrentWord] = useState('');
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [backgroundStyle, setBackgroundStyle] = useState('dark');
  const [thumbnailText, setThumbnailText] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  
  // ElevenLabs Settings
  const [elevenLabsKey, setElevenLabsKey] = useState(localStorage.getItem('elevenlabs_key') || '');
  const [elevenLabsVoices, setElevenLabsVoices] = useState([]);
  const [elevenLabsVoice, setElevenLabsVoice] = useState('');
  
  const BACKGROUNDS = {
    dark: { type: 'color', value: '#050508', label: 'Deep Space (Dark)' },
    purple: { type: 'gradient', colors: ['#2E0854', '#8E2DE2'], label: 'Neon Purple' },
    blue: { type: 'gradient', colors: ['#0f2027', '#203a43', '#2c5364'], label: 'Ocean Depth' },
    sunset: { type: 'gradient', colors: ['#4A0000', '#ff416c'], label: 'Dark Sunset' },
  };

  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunks = useRef([]);
  const animationFrameRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const activeAudioRef = useRef(null);       // track currently playing Audio element
  const activeAudioCtxRef = useRef(null);     // track active AudioContext
  const isStoppedRef = useRef(false);         // flag to signal stop to async loops

  useEffect(() => {
    if (audioMode === 'elevenlabs' && elevenLabsKey.trim()) {
      fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': elevenLabsKey }
      })
      .then(res => res.json())
      .then(data => {
         if (data.voices) {
            // Filter to only include voices that are guaranteed available
            setElevenLabsVoices(data.voices);
            if (data.voices.length > 0) {
               setElevenLabsVoice(data.voices[0].voice_id);
            }
         }
      })
      .catch(err => console.error("Failed to load voices", err));
    }
  }, [elevenLabsKey, audioMode]);

  useEffect(() => {
    // Load available voices for softer voice options
    const loadVoices = () => {
      // Filter strictly for Microsoft voices
      const availableVoices = window.speechSynthesis.getVoices().filter(v => v.name.toLowerCase().includes('microsoft'));
      
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
        // Try to select a softer/female voice by default (Zira is a common Microsoft female voice)
        const softVoice = availableVoices.find(v => 
          v.name.includes('Female') || 
          v.name.includes('Zira') || 
          v.name.includes('Aria')
        );
        setSelectedVoice(softVoice ? softVoice.name : availableVoices[0].name);
      } else {
        // Fallback if no microsoft voices found, but still clear the array
        setVoices([]);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    // Initialize canvas black background
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 80px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PREVIEW', canvas.width / 2, canvas.height / 2);
    }
  }, []);

  const drawFrame = (ctx, width, height, phraseData, wordTime, bgStyle) => {
    // Clear background dynamically
    const bg = BACKGROUNDS[bgStyle] || BACKGROUNDS.dark;
    
    if (bg.type === 'color') {
      ctx.fillStyle = bg.value;
      ctx.fillRect(0, 0, width, height);
    } else if (bg.type === 'gradient') {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      bg.colors.forEach((c, i) => gradient.addColorStop(i / (bg.colors.length - 1), c));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // Draw grid pattern for aesthetics
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 2;
    for(let i=0; i<width; i+=100) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
    }
    for(let i=0; i<height; i+=100) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke();
    }

    if (!phraseData || !phraseData.words || phraseData.words.length === 0) return;

    ctx.font = 'bold 90px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const maxWidth = width * 0.85;
    const lines = [];
    let currentLine = [];
    let currentLineWidth = 0;
    
    // Layout phrase statically so words don't jump
    for (let i = 0; i < phraseData.words.length; i++) {
        const w = phraseData.words[i].toUpperCase();
        const wWidth = ctx.measureText(w + " ").width;
        if (currentLineWidth + wWidth > maxWidth && currentLine.length > 0) {
            lines.push(currentLine);
            currentLine = [{ text: w, index: i }];
            currentLineWidth = wWidth;
        } else {
            currentLine.push({ text: w, index: i });
            currentLineWidth += wWidth;
        }
    }
    if (currentLine.length > 0) lines.push(currentLine);
    
    const lineHeight = 110;
    const totalHeight = lines.length * lineHeight;
    let startY = (height - totalHeight) / 2 + (lineHeight / 2);
    
    lines.forEach(line => {
        let lineWidth = 0;
        line.forEach(lw => lineWidth += ctx.measureText(lw.text + " ").width);
        
        let startX = (width - lineWidth) / 2;
        
        line.forEach(lw => {
            const wordWidth = ctx.measureText(lw.text).width;
            const textCenter = startX + wordWidth / 2;
            
            if (lw.index === phraseData.activeIndex) {
                // Current spoken word: Highlight & Pop
                const age = performance.now() - wordTime;
                const progress = Math.min(age / 150, 1);
                const easeOut = 1 - Math.pow(1 - progress, 3);
                
                ctx.save();
                ctx.translate(textCenter, startY);
                const scale = 0.85 + (0.15 * easeOut);
                ctx.scale(scale, scale);
                ctx.globalAlpha = easeOut;
                
                ctx.fillStyle = '#FF3366';
                ctx.shadowColor = 'rgba(255, 51, 102, 0.6)';
                ctx.shadowBlur = 20;
                ctx.fillText(lw.text, 0, 0);
                
                ctx.restore();
            } else if (lw.index < phraseData.activeIndex) {
                // Past words: White
                ctx.fillStyle = '#ffffff';
                ctx.shadowBlur = 0;
                ctx.fillText(lw.text, textCenter, startY);
            } else {
                // Future words: Dimmed
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.shadowBlur = 0;
                ctx.fillText(lw.text, textCenter, startY);
            }
            
            startX += ctx.measureText(lw.text + " ").width;
        });
        startY += lineHeight;
    });
  };

  const startGeneration = async () => {
    if (!text.trim()) return;
    
    if (audioMode === 'elevenlabs' && !elevenLabsKey.trim()) {
      alert("Please enter your ElevenLabs API Key to use Premium Voices.");
      return;
    }

    // --- CLEANUP any previous session ---
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.src = '';
      activeAudioRef.current = null;
    }
    if (activeAudioCtxRef.current) {
      try { activeAudioCtxRef.current.close(); } catch(e) {}
      activeAudioCtxRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    isStoppedRef.current = false;
    // --- END CLEANUP ---

    setIsGenerating(true);
    setVideoUrl(null);
    recordedChunks.current = [];

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Get Canvas Stream (30 FPS)
    const canvasStream = canvas.captureStream(30);
    let finalStream = canvasStream;

    // Setup MediaRecorder with HIGH QUALITY settings
    const recorderOptions = { 
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 10000000 // 10 Mbps for HD quality
    };
    let recorder;
    try {
      recorder = new MediaRecorder(finalStream, recorderOptions);
    } catch (e) {
      try {
        recorder = new MediaRecorder(finalStream, { mimeType: 'video/webm', videoBitsPerSecond: 10000000 });
      } catch (e2) {
        recorder = new MediaRecorder(finalStream);
      }
    }
    
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
      setVideoUrl(URL.createObjectURL(blob));
      setIsGenerating(false);
      setCurrentWord('');
    };

    if (audioMode === 'elevenlabs') {
      // Set up Web Audio API to capture ElevenLabs audio into the recording
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      activeAudioCtxRef.current = audioContext; // store for cleanup
      const audioDest = audioContext.createMediaStreamDestination();
      
      // Add audio track to the recording stream so video has sound
      audioDest.stream.getAudioTracks().forEach(track => {
        finalStream.addTrack(track);
      });
      
      // Now start the recorder AFTER audio track is added
      recorder.start();

      let wordTime = performance.now();
      setCurrentWord('');

      const processElevenLabs = async () => {
        try {
          const chunks = text.split('---');
          
          for (let i = 0; i < chunks.length; i++) {
            const chunkText = chunks[i].trim();
            if (!chunkText) continue;

            // Fetch audio WITH timestamps from ElevenLabs for perfect sync
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoice}/with-timestamps`, {
              method: 'POST',
              headers: {
                'xi-api-key': elevenLabsKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                text: chunkText,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                  stability: 0.5,
                  similarity_boost: 0.75
                }
              })
            });

            if (!response.ok) {
              const err = await response.json();
              throw new Error(err.detail?.message || 'ElevenLabs API Error');
            }

            const data = await response.json();
            const audioBytes = Uint8Array.from(atob(data.audio_base64), c => c.charCodeAt(0));
            const audioBlob = new Blob([audioBytes], { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.crossOrigin = 'anonymous';

            // Use normalized_alignment (what was actually spoken) for accurate sync
            // Fall back to alignment if normalized is unavailable
            const alignment = data.normalized_alignment || data.alignment;
            const chars = alignment.characters;
            const charStarts = alignment.character_start_times_seconds;
            const charEnds = alignment.character_end_times_seconds;

            // Build words directly from alignment characters
            // This avoids drift caused by ElevenLabs text normalization
            const wordTimestamps = []; // { word, startTime, endTime }
            let currentWordChars = '';
            let currentWordStart = null;
            let currentWordEnd = null;

            for (let ci = 0; ci < chars.length; ci++) {
              const ch = chars[ci];
              if (ch === ' ' || ch === '\n' || ch === '\t') {
                // Whitespace: flush current word
                if (currentWordChars.length > 0) {
                  wordTimestamps.push({
                    word: currentWordChars,
                    startTime: currentWordStart,
                    endTime: currentWordEnd
                  });
                  currentWordChars = '';
                  currentWordStart = null;
                  currentWordEnd = null;
                }
              } else {
                // Non-whitespace: accumulate
                if (currentWordStart === null) {
                  currentWordStart = charStarts[ci];
                }
                currentWordEnd = charEnds[ci];
                currentWordChars += ch;
              }
            }
            // Flush last word
            if (currentWordChars.length > 0) {
              wordTimestamps.push({
                word: currentWordChars,
                startTime: currentWordStart,
                endTime: currentWordEnd
              });
            }

            // Extract display words from timestamps
            const words = wordTimestamps.map(wt => wt.word);

            // Group words into phrases (sentences or max 5 words for readability)
            const phrases = [];
            let currentPhrase = [];
            for (let j = 0; j < words.length; j++) {
                currentPhrase.push(words[j]);
                if (words[j].match(/[.,!?;:]$/) || currentPhrase.length >= 5) {
                    phrases.push({ startIndex: j - currentPhrase.length + 1, words: [...currentPhrase] });
                    currentPhrase = [];
                }
            }
            if (currentPhrase.length > 0) {
                phrases.push({ startIndex: words.length - currentPhrase.length, words: [...currentPhrase] });
            }

            await new Promise((resolve) => {
              audio.onloadedmetadata = () => {
                if (isStoppedRef.current) { resolve(); return; }
                
                activeAudioRef.current = audio; // track for cleanup
                
                // Pipe audio through AudioContext so MediaRecorder captures it
                const source = audioContext.createMediaElementSource(audio);
                source.connect(audioDest);          // -> recording
                source.connect(audioContext.destination); // -> speakers

                let lastWordIndex = -1;
                audio.play();
                
                const animate = () => {
                  if (isStoppedRef.current) {
                    audio.pause();
                    resolve();
                    return;
                  }
                  if (!audio.paused && !audio.ended) {
                    const currentTime = audio.currentTime;
                    
                    // Find the word currently being spoken using exact timestamps
                    // Use binary-search style: find last word whose startTime <= currentTime
                    let wordIndex = 0;
                    for (let w = 0; w < wordTimestamps.length; w++) {
                      if (currentTime >= wordTimestamps[w].startTime) {
                        wordIndex = w;
                      } else {
                        break;
                      }
                    }
                    
                    if (wordIndex !== lastWordIndex) {
                      lastWordIndex = wordIndex;
                      wordTime = performance.now();
                      setCurrentWord(words[wordIndex]);
                    }
                    
                    // Find active phrase for this word
                    const activePhrase = phrases.find(p => wordIndex >= p.startIndex && wordIndex < p.startIndex + p.words.length) || phrases[phrases.length - 1];
                    const phraseData = {
                        words: activePhrase.words,
                        activeIndex: wordIndex - activePhrase.startIndex
                    };
                    
                    drawFrame(ctx, canvas.width, canvas.height, phraseData, wordTime, backgroundStyle);
                    animationFrameRef.current = requestAnimationFrame(animate);
                  } else if (audio.ended) {
                    activeAudioRef.current = null;
                    resolve();
                  }
                };
                animationFrameRef.current = requestAnimationFrame(animate);
              };
            });

            if (isStoppedRef.current) break; // exit chunk loop if stopped

            if (i < chunks.length - 1) {
              wordTime = performance.now();
              setCurrentWord('');
              
              const pauseAnimate = () => {
                 if (isStoppedRef.current) return;
                 drawFrame(ctx, canvas.width, canvas.height, {words: [], activeIndex: -1}, performance.now(), backgroundStyle);
                 animationFrameRef.current = requestAnimationFrame(pauseAnimate);
              }
              animationFrameRef.current = requestAnimationFrame(pauseAnimate);
              
              await new Promise(r => setTimeout(r, 1200));
              cancelAnimationFrame(animationFrameRef.current);
            }
          }
          
          drawFrame(ctx, canvas.width, canvas.height, {words: [], activeIndex: -1}, performance.now(), backgroundStyle);
          setTimeout(() => {
            if (recorder.state === 'recording') recorder.stop();
            try { audioContext.close(); } catch(e) {}
            activeAudioCtxRef.current = null;
          }, 500);

        } catch (error) {
          alert("Error generating voice: " + error.message);
          if (recorder.state === 'recording') recorder.stop();
          try { audioContext.close(); } catch(e) {}
          activeAudioCtxRef.current = null;
        }
      };

      processElevenLabs();

    } else if (audioMode === 'tts') {
      recorder.start();
      let isPlaying = true;
      let wordTime = performance.now();
      setCurrentWord('');

      const processTTS = async () => {
        // Split text by the pause syntax "---"
        const chunks = text.split('---');
        
        for (let i = 0; i < chunks.length; i++) {
          const chunkText = chunks[i].trim();
          if (!chunkText) continue;

          await new Promise((resolve) => {
            const utterance = new SpeechSynthesisUtterance(chunkText);
            
            if (selectedVoice) {
              const voice = voices.find(v => v.name === selectedVoice);
              if (voice) utterance.voice = voice;
            }
            
            utterance.rate = 0.9; 
            utterance.pitch = 1.0;
            
            const words = chunkText.split(/\s+/).filter(w => w);
            
            // Build char-index-to-word-index map for accurate sync
            const wordBoundaries = []; // { charStart, charEnd, wordIndex }
            let charPos = 0;
            for (let wi = 0; wi < words.length; wi++) {
              const idx = chunkText.indexOf(words[wi], charPos);
              if (idx !== -1) {
                wordBoundaries.push({ charStart: idx, charEnd: idx + words[wi].length, wordIndex: wi });
                charPos = idx + words[wi].length;
              }
            }
            
            const phrases = [];
            let currentPhrase = [];
            for (let j = 0; j < words.length; j++) {
                currentPhrase.push(words[j]);
                if (words[j].match(/[.,!?;:]$/) || currentPhrase.length >= 5) {
                    phrases.push({ startIndex: j - currentPhrase.length + 1, words: [...currentPhrase] });
                    currentPhrase = [];
                }
            }
            if (currentPhrase.length > 0) {
                phrases.push({ startIndex: words.length - currentPhrase.length, words: [...currentPhrase] });
            }

            let absoluteWordIndex = 0;

            if (words.length > 0) {
              wordTime = performance.now();
              setCurrentWord(words[0]);
            }
            
            utterance.onboundary = (event) => {
              if (event.name === 'word') {
                 // Use charIndex to find which word is being spoken
                 const ci = event.charIndex;
                 const found = wordBoundaries.find(wb => ci >= wb.charStart && ci < wb.charEnd);
                 if (found) {
                   absoluteWordIndex = found.wordIndex;
                 } else {
                   // Fallback: find nearest word boundary
                   let closest = 0;
                   let minDist = Infinity;
                   for (let wb of wordBoundaries) {
                     const dist = Math.abs(ci - wb.charStart);
                     if (dist < minDist) { minDist = dist; closest = wb.wordIndex; }
                   }
                   absoluteWordIndex = closest;
                 }
                 if (absoluteWordIndex >= words.length) absoluteWordIndex = words.length - 1;
                 wordTime = performance.now();
                 setCurrentWord(words[absoluteWordIndex]);
              }
            };

            utterance.onend = resolve;
            utterance.onerror = resolve;
            
            const ttsAnimate = () => {
               if (isPlaying) {
                  const activePhrase = phrases.find(p => absoluteWordIndex >= p.startIndex && absoluteWordIndex < p.startIndex + p.words.length) || phrases[phrases.length - 1];
                  const phraseData = {
                      words: activePhrase ? activePhrase.words : [],
                      activeIndex: activePhrase ? absoluteWordIndex - activePhrase.startIndex : 0
                  };
                  drawFrame(ctx, canvas.width, canvas.height, phraseData, wordTime, backgroundStyle);
                  animationFrameRef.current = requestAnimationFrame(ttsAnimate);
               }
            }
            animationFrameRef.current = requestAnimationFrame(ttsAnimate);
            
            synthRef.current.speak(utterance);
          });

          if (i < chunks.length - 1 && isPlaying) {
            wordTime = performance.now();
            setCurrentWord('');
            await new Promise(r => setTimeout(r, 1200));
          }
        }
        
        isPlaying = false;
        drawFrame(ctx, canvas.width, canvas.height, {words: [], activeIndex: -1}, performance.now(), backgroundStyle);
        setTimeout(() => {
          if (recorder.state === 'recording') recorder.stop();
        }, 500); 
      };

      processTTS();
    }
  };

  const stopEarly = () => {
    // Signal all async loops to stop
    isStoppedRef.current = true;
    
    // Stop any playing ElevenLabs audio
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.src = '';
      activeAudioRef.current = null;
    }
    
    // Close AudioContext
    if (activeAudioCtxRef.current) {
      try { activeAudioCtxRef.current.close(); } catch(e) {}
      activeAudioCtxRef.current = null;
    }
    
    // Cancel animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Stop browser TTS
    if (synthRef.current) synthRef.current.cancel();
    
    // Stop recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const generateThumbnail = () => {
    if (!thumbnailText.trim()) return;
    
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 1080;
    thumbCanvas.height = 1920;
    const ctx = thumbCanvas.getContext('2d');
    
    // Black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height);
    
    // Setup bold white text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const maxWidth = thumbCanvas.width * 0.8;
    const inputText = thumbnailText.toUpperCase();
    
    // Word-wrap the text into lines
    let fontSize = 120;
    ctx.font = `900 ${fontSize}px Outfit, sans-serif`;
    
    const wrapText = (text, maxW) => {
      const wordsArr = text.split(' ');
      const lines = [];
      let currentLine = '';
      
      wordsArr.forEach(word => {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxW && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });
      if (currentLine) lines.push(currentLine);
      return lines;
    };
    
    let lines = wrapText(inputText, maxWidth);
    
    // Scale down font if too many lines to fit
    const lineHeight = fontSize * 1.2;
    const totalTextHeight = lines.length * lineHeight;
    if (totalTextHeight > thumbCanvas.height * 0.7) {
      fontSize = Math.floor(fontSize * (thumbCanvas.height * 0.7) / totalTextHeight);
      ctx.font = `900 ${fontSize}px Outfit, sans-serif`;
      lines = wrapText(inputText, maxWidth);
    }
    
    const finalLineHeight = fontSize * 1.2;
    const finalTotalHeight = lines.length * finalLineHeight;
    let startY = (thumbCanvas.height - finalTotalHeight) / 2 + (finalLineHeight / 2);
    
    // Draw each line
    lines.forEach(line => {
      // Subtle text shadow
      ctx.shadowColor = 'rgba(255, 255, 255, 0.15)';
      ctx.shadowBlur = 15;
      ctx.fillText(line, thumbCanvas.width / 2, startY);
      ctx.shadowBlur = 0;
      startY += finalLineHeight;
    });
    
    // Convert to downloadable PNG
    const dataUrl = thumbCanvas.toDataURL('image/png');
    setThumbnailUrl(dataUrl);
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>Shorts Creator</h1>
        <p>Turn your text into engaging, animated vertical videos instantly.</p>
      </header>

      <main className="main-content">
        <section className="glass-panel input-section">
          <div className="input-group">
            <label>Script & Dialogue</label>
            <textarea 
              className="textarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your dialogue here... Use --- for a dramatic pause!"
              disabled={isGenerating}
            />
            <small style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Pro tip: Type <strong>---</strong> anywhere in your text to make the AI take a dramatic 1.2-second pause!
            </small>
          </div>

          <div className="input-group">
            <label>Audio Source</label>
            <div className="settings-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <button 
                className={`btn ${audioMode === 'elevenlabs' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setAudioMode('elevenlabs')}
                disabled={isGenerating}
                style={{ padding: '0.8rem' }}
              >
                ElevenLabs AI
              </button>
              <button 
                className={`btn ${audioMode === 'tts' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setAudioMode('tts')}
                disabled={isGenerating}
                style={{ padding: '0.8rem' }}
              >
                <Type size={16} /> Basic TTS
              </button>
            </div>
            
            {audioMode === 'elevenlabs' && (
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <input 
                  type="password"
                  className="textarea"
                  style={{ height: 'auto', padding: '0.8rem' }}
                  placeholder="Paste your ElevenLabs API Key"
                  value={elevenLabsKey}
                  onChange={(e) => {
                    setElevenLabsKey(e.target.value);
                    localStorage.setItem('elevenlabs_key', e.target.value);
                  }}
                  disabled={isGenerating}
                />
                <div className="select-wrapper">
                  <select 
                    value={elevenLabsVoice} 
                    onChange={(e) => setElevenLabsVoice(e.target.value)}
                    disabled={isGenerating || elevenLabsVoices.length === 0}
                  >
                    {elevenLabsVoices.length === 0 ? (
                      <option value="">Loading voices...</option>
                    ) : (
                      elevenLabsVoices.map(voice => (
                        <option key={voice.voice_id} value={voice.voice_id}>
                          {voice.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
            )}
            
            {audioMode === 'tts' && voices.length > 0 && (
              <div className="select-wrapper" style={{ marginTop: '0.5rem' }}>
                <select 
                  value={selectedVoice} 
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  disabled={isGenerating}
                >
                  {voices.map(voice => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <small style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              {audioMode === 'tts' ? 'Uses browser speech. Audio may not embed in the downloaded file directly yet.' : 'Premium AI voices with perfect audio-video sync.'}
            </small>
          </div>

          <div className="input-group">
            <label>Video Background</label>
            <div className="select-wrapper">
              <select 
                value={backgroundStyle} 
                onChange={(e) => setBackgroundStyle(e.target.value)}
                disabled={isGenerating}
              >
                {Object.keys(BACKGROUNDS).map(key => (
                  <option key={key} value={key}>
                    {BACKGROUNDS[key].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="button-group" style={{ marginTop: 'auto' }}>
            {!isGenerating ? (
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={startGeneration}>
                <Play size={20} /> Generate Video
              </button>
            ) : (
              <button className="btn btn-primary" style={{ width: '100%', background: '#ff3333' }} onClick={stopEarly}>
                <Loader2 size={20} className="spinner" style={{ animation: 'spin 1s linear infinite' }}/> Stop Recording
              </button>
            )}
          </div>
        </section>

        <section className="glass-panel preview-section">
          <div className="video-container">
            {isGenerating && (
              <div className="status-badge recording">
                Recording {currentWord ? `"${currentWord}"` : ''}
              </div>
            )}
            <canvas 
              ref={canvasRef} 
              className="video-canvas"
            />
          </div>
          
          {videoUrl && !isGenerating && (
            <a href={videoUrl} download="my-short.webm" className="btn btn-primary" style={{ width: '100%' }}>
              <Download size={20} /> Download Video
            </a>
          )}

          {/* Thumbnail Generator */}
          <div style={{ width: '100%', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ 
              borderTop: '1px solid rgba(255,255,255,0.08)',
              paddingTop: '1.5rem',
            }}>
              <label style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem', display: 'block' }}>Thumbnail Generator</label>
              <input 
                type="text"
                className="textarea"
                style={{ height: 'auto', padding: '0.8rem', marginBottom: '0.8rem' }}
                placeholder="Enter thumbnail text..."
                value={thumbnailText}
                onChange={(e) => setThumbnailText(e.target.value)}
              />
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={generateThumbnail}>
                <Image size={18} /> Generate Thumbnail
              </button>
            </div>

            {thumbnailUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'center' }}>
                <img 
                  src={thumbnailUrl} 
                  alt="Thumbnail Preview" 
                  style={{ 
                    width: '100%', 
                    maxWidth: '200px', 
                    borderRadius: '12px', 
                    border: '2px solid rgba(255,255,255,0.1)' 
                  }} 
                />
                <a href={thumbnailUrl} download="thumbnail.png" className="btn btn-primary" style={{ width: '100%' }}>
                  <Download size={18} /> Download Thumbnail
                </a>
              </div>
            )}
          </div>
        </section>
      </main>
      
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default App;

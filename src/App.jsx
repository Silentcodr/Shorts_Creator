import { useState, useRef, useEffect } from 'react';
import { Play, Download, Type, Loader2, Image, Upload, MonitorPlay } from 'lucide-react';

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
  
  // Google Cloud Settings
  const [googleApiKey, setGoogleApiKey] = useState(localStorage.getItem('google_tts_key') || '');
  const [googleVoice, setGoogleVoice] = useState('en-US-Neural2-F');
  const googleVoicesList = [
    // Confirmed Female voices
    { id: 'en-US-Neural2-F', name: '★ Neural2 F - Bright Female (River-like)' },
    { id: 'en-US-Neural2-H', name: '★ Neural2 H - Energetic Female' },
    { id: 'en-US-Neural2-G', name: 'Neural2 G - Warm Female' },
    { id: 'en-US-Neural2-C', name: 'Neural2 C - Calm Female' },
    { id: 'en-US-Neural2-E', name: 'Neural2 E - Soft Female' },
    { id: 'en-US-Studio-O', name: 'Studio O - Professional Female' },
    { id: 'en-US-Wavenet-F', name: 'Wavenet F - Clear Female' },
    { id: 'en-US-Wavenet-C', name: 'Wavenet C - Natural Female' },
    { id: 'en-US-Wavenet-E', name: 'Wavenet E - Gentle Female' },
    { id: 'en-US-Journey-F', name: 'Journey F - Soft Female' },
    // Confirmed Male voices
    { id: 'en-US-Neural2-D', name: 'Neural2 D - Deep Male' },
    { id: 'en-US-Neural2-J', name: 'Neural2 J - Crisp Male' },
    { id: 'en-US-Neural2-A', name: 'Neural2 A - Standard Male' },
    { id: 'en-US-Casual-K', name: 'Casual K - Conversational Male' },
    { id: 'en-US-Journey-D', name: 'Journey D - Deep Male' },
  ];
  const [googleUsage, setGoogleUsage] = useState(() => {
    const storedMonth = localStorage.getItem('google_tts_month');
    const currentMonth = new Date().getMonth().toString();
    if (storedMonth !== currentMonth) {
      localStorage.setItem('google_tts_month', currentMonth);
      localStorage.setItem('google_tts_usage', '0');
      return 0;
    }
    return parseInt(localStorage.getItem('google_tts_usage') || '0', 10);
  });
  
  
  // YouTube Upload Settings
  const [ytClientId, setYtClientId] = useState(localStorage.getItem('yt_client_id') || '');
  const [ytUploading, setYtUploading] = useState(false);
  const [ytResult, setYtResult] = useState(null);
  const [videoTitle, setVideoTitle] = useState('My Short');
  const [videoDescription, setVideoDescription] = useState('');
  
  const BACKGROUNDS = {
    black_pure: { type: 'color', value: '#000000', label: 'Pure Black (No Grid)', noGrid: true },
    charcoal: { type: 'color', value: '#121212', label: 'Charcoal Dark' },
    dark: { type: 'color', value: '#050508', label: 'Deep Space (Dark)' },
    crimson_dark: { type: 'gradient', colors: ['#1a0000', '#330000'], label: 'Dark Crimson' },
    forest_dark: { type: 'gradient', colors: ['#001a09', '#003311'], label: 'Dark Forest' },
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
  const generationIdRef = useRef(0);

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

    // Draw grid pattern for aesthetics (unless disabled)
    if (!bg.noGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 2;
      for(let i=0; i<width; i+=100) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
      }
      for(let i=0; i<height; i+=100) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke();
      }
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



  // YouTube Shorts Upload
  const uploadToYouTube = async () => {
    if (!videoUrl || !ytClientId.trim()) {
      alert('Please enter your YouTube Client ID and generate a video first.');
      return;
    }
    
    setYtUploading(true);
    setYtResult(null);
    
    try {
      // Step 1: Get OAuth token via popup
      const redirectUri = window.location.origin;
      const scope = 'https://www.googleapis.com/auth/youtube.upload';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(ytClientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}&prompt=consent`;
      
      const accessToken = await new Promise((resolve, reject) => {
        const popup = window.open(authUrl, 'YouTube Auth', 'width=500,height=600');
        if (!popup) { reject(new Error('Popup blocked. Please allow popups.')); return; }
        
        const interval = setInterval(() => {
          try {
            if (popup.closed) {
              clearInterval(interval);
              reject(new Error('Auth cancelled.'));
              return;
            }
            const popupUrl = popup.location.href;
            if (popupUrl.includes('access_token=')) {
              clearInterval(interval);
              const params = new URLSearchParams(popupUrl.split('#')[1]);
              const token = params.get('access_token');
              popup.close();
              if (token) resolve(token);
              else reject(new Error('No token received.'));
            }
          } catch(e) {
            // Cross-origin, popup hasn't redirected yet — keep waiting
          }
        }, 500);
      });

      // Step 2: Fetch the video blob
      const videoBlob = await fetch(videoUrl).then(r => r.blob());
      
      // Step 3: Upload via YouTube Data API v3 (resumable upload)
      const metadata = {
        snippet: {
          title: videoTitle || 'My Short',
          description: videoDescription || 'Created with Shorts Creator',
          categoryId: '22', // People & Blogs
        },
        status: {
          privacyStatus: 'private', // Start as private, user can change later
          selfDeclaredMadeForKids: false,
        },
      };
      
      // Initiate resumable upload
      const initResponse = await fetch(
        'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metadata),
        }
      );
      
      if (!initResponse.ok) {
        const err = await initResponse.json();
        throw new Error(err.error?.message || 'Failed to initiate upload');
      }
      
      const uploadUrl = initResponse.headers.get('Location');
      
      // Upload the actual video
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'video/webm',
        },
        body: videoBlob,
      });
      
      if (!uploadResponse.ok) {
        const err = await uploadResponse.json();
        throw new Error(err.error?.message || 'Upload failed');
      }
      
      const result = await uploadResponse.json();
      setYtResult({ 
        success: true, 
        videoId: result.id,
        url: `https://youtube.com/shorts/${result.id}`
      });
      
    } catch (error) {
      setYtResult({ success: false, error: error.message });
    } finally {
      setYtUploading(false);
    }
  };

  const startGeneration = async () => {
    if (!text.trim()) return;
    
    if (audioMode === 'elevenlabs' && !elevenLabsKey.trim()) {
      alert("Please enter your ElevenLabs API Key to use Premium Voices.");
      return;
    }
    if (audioMode === 'google' && !googleApiKey.trim()) {
      alert("Please enter your Google Cloud API Key to use Google Cloud voices.");
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
    // Detach old recorder handlers BEFORE stopping so they don't interfere
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      if (mediaRecorderRef.current.state === 'recording') {
        try { mediaRecorderRef.current.stop(); } catch(e) {}
      }
      mediaRecorderRef.current = null;
    }
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    // Revoke old video URL to free memory
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    isStoppedRef.current = false;
    const currentGenId = Date.now();
    generationIdRef.current = currentGenId;
    const isCancelled = () => isStoppedRef.current || generationIdRef.current !== currentGenId;
    // --- END CLEANUP ---

    setIsGenerating(true);
    setVideoUrl(null);
    recordedChunks.current = [];

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Get Canvas Stream (30 FPS)
    const canvasStream = canvas.captureStream(30);
    const videoTrack = canvasStream.getVideoTracks()[0];
    let finalStream = new MediaStream([videoTrack]);

    // Setup MediaRecorder — prefer MP4 (H.264) for best compatibility, fallback to WebM
    let recorderMimeType = 'video/webm;codecs=vp9';
    const mp4Mime = 'video/mp4;codecs=avc1,opus';
    const mp4MimeAlt = 'video/mp4';
    
    if (typeof MediaRecorder.isTypeSupported === 'function') {
      if (MediaRecorder.isTypeSupported(mp4Mime)) {
        recorderMimeType = mp4Mime;
      } else if (MediaRecorder.isTypeSupported(mp4MimeAlt)) {
        recorderMimeType = mp4MimeAlt;
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        recorderMimeType = 'video/webm;codecs=vp9';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        recorderMimeType = 'video/webm';
      }
    }
    
    const isMP4 = recorderMimeType.startsWith('video/mp4');
    let recorder;
    try {
      recorder = new MediaRecorder(finalStream, { 
        mimeType: recorderMimeType,
        videoBitsPerSecond: 15_000_000 // 15 Mbps for maximum quality
      });
    } catch (e) {
      try {
        recorder = new MediaRecorder(finalStream, { mimeType: 'video/webm', videoBitsPerSecond: 15_000_000 });
      } catch (e2) {
        recorder = new MediaRecorder(finalStream);
      }
    }
    
    const outputMimeType = isMP4 ? 'video/mp4' : 'video/webm';
    const outputExtension = isMP4 ? 'mp4' : 'webm';
    
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.current.push(e.data);
    };
    recorder.onstop = () => {
      // Only update state if this recorder belongs to the current generation
      if (generationIdRef.current !== currentGenId) return;
      const blob = new Blob(recordedChunks.current, { type: outputMimeType });
      setVideoUrl(URL.createObjectURL(blob));
      setIsGenerating(false);
      setCurrentWord('');
      // Store the extension for download
      window.__videoExtension = outputExtension;
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

            // Pre-build word-to-phrase index for O(1) lookup (critical for long videos)
            const wordToPhraseIdx = new Array(words.length);
            for (let pi = 0; pi < phrases.length; pi++) {
              for (let wi = phrases[pi].startIndex; wi < phrases[pi].startIndex + phrases[pi].words.length; wi++) {
                wordToPhraseIdx[wi] = pi;
              }
            }

            await new Promise((resolve) => {
              audio.onloadedmetadata = () => {
                if (isCancelled()) { resolve(); return; }
                
                activeAudioRef.current = audio; // track for cleanup
                
                // Pipe audio through AudioContext so MediaRecorder captures it
                const source = audioContext.createMediaElementSource(audio);
                source.connect(audioDest);          // -> recording
                source.connect(audioContext.destination); // -> speakers

                let lastWordIndex = -1;

                audio.play();
                
                const animate = () => {
                  if (isCancelled()) {
                    audio.pause();
                    resolve();
                    return;
                  }
                  if (!audio.paused && !audio.ended) {
                    const currentTime = audio.currentTime;
                    
                    // Binary search for the word currently being spoken
                    // Add small offset (50ms) so text appears precisely with voice, not ahead of it
                    const syncOffset = 0.05; // 50ms delay to prevent text appearing before voice
                    const syncedTime = Math.max(0, currentTime - syncOffset);
                    let lo = 0, hi = wordTimestamps.length - 1, wordIndex = 0;
                    while (lo <= hi) {
                      const mid = (lo + hi) >>> 1;
                      if (wordTimestamps[mid].startTime <= syncedTime) {
                        wordIndex = mid;
                        lo = mid + 1;
                      } else {
                        hi = mid - 1;
                      }
                    }
                    
                    if (wordIndex !== lastWordIndex) {
                      lastWordIndex = wordIndex;
                      wordTime = performance.now();
                      setCurrentWord(words[wordIndex]);
                    }
                    
                    // O(1) phrase lookup using pre-built index
                    const phraseIdx = wordToPhraseIdx[wordIndex] ?? phrases.length - 1;
                    const activePhrase = phrases[phraseIdx];
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

            if (isCancelled()) break; // exit chunk loop if stopped

            if (i < chunks.length - 1) {
              wordTime = performance.now();
              setCurrentWord('');
              
              const pauseAnimate = () => {
                 if (isCancelled()) return;
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
          setIsGenerating(false);
          setCurrentWord('');
          if (recorder.state === 'recording') recorder.stop();
          try { audioContext.close(); } catch(e) {}
          activeAudioCtxRef.current = null;
        }
      };

      processElevenLabs();

    } else if (audioMode === 'google') {
      if (!googleApiKey.trim()) {
        alert("Please enter your Google Cloud API Key to use Premium Voices.");
        setIsGenerating(false);
        setCurrentWord('');
        return;
      }

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      activeAudioCtxRef.current = audioContext;
      const audioDest = audioContext.createMediaStreamDestination();
      
      audioDest.stream.getAudioTracks().forEach(track => {
        finalStream.addTrack(track);
      });
      
      recorder.start();

      let wordTime = performance.now();
      setCurrentWord('');

      const processGoogleTTS = async () => {
        try {
          const chunks = text.split('---');
          
          for (let i = 0; i < chunks.length; i++) {
            const chunkText = chunks[i].trim();
            if (!chunkText) continue;

            const words = chunkText.split(/\s+/).filter(w => w);

            // Journey and Studio voices don't support SSML marks.
            // Neural2, Wavenet, and Casual voices DO support them, allowing perfect sync.
            const supportsTimepoints = !googleVoice.includes('Journey') && !googleVoice.includes('Studio');
            let requestBody;
            let apiEndpoint;

            if (!supportsTimepoints) {
              // Plain text request on v1 endpoint (Journey and Studio only)
              apiEndpoint = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleApiKey}`;
              requestBody = {
                input: { text: chunkText },
                voice: { languageCode: googleVoice.substring(0, 5), name: googleVoice },
                audioConfig: { audioEncoding: "MP3", speakingRate: 1.0 }
              };
            } else {
              // SSML with marks on v1beta1 for exact word-level timing
              let ssml = '<speak>';
              words.forEach((w, idx) => {
                ssml += `<mark name="w${idx}"/>${w} `;
              });
              ssml += '</speak>';
              apiEndpoint = `https://texttospeech.googleapis.com/v1beta1/text:synthesize?key=${googleApiKey}`;
              requestBody = {
                input: { ssml: ssml },
                voice: { languageCode: googleVoice.substring(0, 5), name: googleVoice },
                audioConfig: { audioEncoding: "MP3", speakingRate: 1.0 },
                enableTimePointing: ["SSML_MARK"]
              };
            }

            const response = await fetch(apiEndpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
              const err = await response.json();
              throw new Error(err.error?.message || 'Google TTS API Error');
            }

            const data = await response.json();
            
            // Track local usage
            setGoogleUsage(prev => {
              const newUsage = prev + chunkText.length;
              localStorage.setItem('google_tts_usage', newUsage.toString());
              return newUsage;
            });
            const audioBytes = Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0));
            const audioBlob = new Blob([audioBytes], { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.crossOrigin = 'anonymous';
            
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

            const wordToPhraseIdx = new Array(words.length);
            for (let pi = 0; pi < phrases.length; pi++) {
              for (let wi = phrases[pi].startIndex; wi < phrases[pi].startIndex + phrases[pi].words.length; wi++) {
                wordToPhraseIdx[wi] = pi;
              }
            }

            await new Promise((resolve) => {
              audio.onloadedmetadata = () => {
                if (isCancelled()) { resolve(); return; }
                
                // Build word timestamps from Google's exact timepoints
                const wordTimestamps = [];
                const timepoints = data.timepoints || [];
                
                if (timepoints.length > 0) {
                  // Use exact timestamps from Google
                  timepoints.forEach(tp => {
                    const idx = parseInt(tp.markName.replace('w', ''), 10);
                    if (idx < words.length) {
                      wordTimestamps.push({ startTime: tp.timeSeconds, word: words[idx] });
                    }
                  });
                } else {
                  // Fallback: character-weighted estimation if timepoints unavailable
                  const totalDuration = audio.duration;
                  const PUNCT_PAUSE = 3;
                  const totalWeight = words.reduce((acc, w) => {
                    let weight = w.length;
                    if (w.match(/[.,!?;:]$/)) weight += PUNCT_PAUSE;
                    return acc + weight;
                  }, 0);
                  let currentTimeAcc = 0;
                  words.forEach(w => {
                    wordTimestamps.push({ startTime: currentTimeAcc, word: w });
                    let weight = w.length;
                    if (w.match(/[.,!?;:]$/)) weight += PUNCT_PAUSE;
                    currentTimeAcc += (weight / totalWeight) * totalDuration;
                  });
                }

                activeAudioRef.current = audio;
                
                const source = audioContext.createMediaElementSource(audio);
                source.connect(audioDest);
                source.connect(audioContext.destination);

                let lastWordIndex = -1;
                audio.play();
                
                const animate = () => {
                  if (isCancelled()) {
                    audio.pause();
                    resolve();
                    return;
                  }
                  if (!audio.paused && !audio.ended) {
                    // MP3 encoder adds ~26ms silence at the start; compensate
                    const syncedTime = Math.max(0, audio.currentTime - 0.026);
                    
                    let wordIndex = 0;
                    for (let wIdx = 0; wIdx < wordTimestamps.length; wIdx++) {
                      if (wordTimestamps[wIdx].startTime <= syncedTime) {
                        wordIndex = wIdx;
                      } else {
                        break;
                      }
                    }
                    
                    if (wordIndex !== lastWordIndex) {
                      lastWordIndex = wordIndex;
                      wordTime = performance.now();
                      setCurrentWord(words[wordIndex]);
                    }
                    
                    const phraseIdx = wordToPhraseIdx[wordIndex] ?? phrases.length - 1;
                    const activePhrase = phrases[phraseIdx];
                    const phraseData = {
                        words: activePhrase ? activePhrase.words : [],
                        activeIndex: activePhrase ? wordIndex - activePhrase.startIndex : 0
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

            if (isCancelled()) break;

            if (i < chunks.length - 1) {
              wordTime = performance.now();
              setCurrentWord('');
              
              const pauseAnimate = () => {
                 if (isCancelled()) return;
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
          alert("Error generating Google voice: " + error.message);
          setIsGenerating(false);
          setCurrentWord('');
          if (recorder.state === 'recording') recorder.stop();
          try { audioContext.close(); } catch(e) {}
          activeAudioCtxRef.current = null;
        }
      };

      processGoogleTTS();

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
            
            utterance.rate = 0.85; 
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

            // Pre-build word-to-phrase index for O(1) lookup
            const wordToPhraseIdx = new Array(words.length);
            for (let pi = 0; pi < phrases.length; pi++) {
              for (let wi = phrases[pi].startIndex; wi < phrases[pi].startIndex + phrases[pi].words.length; wi++) {
                wordToPhraseIdx[wi] = pi;
              }
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
                  // O(1) phrase lookup using pre-built index
                  const phraseIdx = wordToPhraseIdx[absoluteWordIndex] ?? phrases.length - 1;
                  const activePhrase = phrases[phraseIdx];
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
            <div className="settings-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <button 
                className={`btn ${audioMode === 'elevenlabs' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setAudioMode('elevenlabs')}
                disabled={isGenerating}
                style={{ padding: '0.8rem' }}
              >
                ElevenLabs
              </button>
              <button 
                className={`btn ${audioMode === 'google' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setAudioMode('google')}
                disabled={isGenerating}
                style={{ padding: '0.8rem' }}
              >
                Google Cloud
              </button>
              <button 
                className={`btn ${audioMode === 'tts' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setAudioMode('tts')}
                disabled={isGenerating}
                style={{ padding: '0.8rem' }}
              >
                <Type size={16} /> Browser
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

            {audioMode === 'google' && (
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <input 
                  type="password"
                  className="textarea"
                  style={{ height: 'auto', padding: '0.8rem' }}
                  placeholder="Paste your Google Cloud API Key"
                  value={googleApiKey}
                  onChange={(e) => {
                    setGoogleApiKey(e.target.value);
                    localStorage.setItem('google_tts_key', e.target.value);
                  }}
                  disabled={isGenerating}
                />
                <div className="select-wrapper">
                  <select 
                    value={googleVoice} 
                    onChange={(e) => setGoogleVoice(e.target.value)}
                    disabled={isGenerating}
                  >
                    {googleVoicesList.map(voice => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div style={{ marginTop: '0.2rem', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                    <span>Free Tier Usage (Local)</span>
                    <span style={{ color: googleUsage > 900000 ? '#ff3333' : '#4CAF50' }}>
                      {googleUsage.toLocaleString()} / 1,000,000
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${Math.min((googleUsage / 1000000) * 100, 100)}%`, 
                      background: googleUsage > 900000 ? '#ff3333' : '#4CAF50',
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                </div>
                <details style={{ marginTop: '0.3rem' }}>
                  <summary style={{ color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}>
                    🔧 How to get a FREE Google Cloud API Key
                  </summary>
                  <div style={{ 
                    marginTop: '0.8rem', padding: '1rem', 
                    background: 'rgba(0,0,0,0.3)', borderRadius: '12px',
                    fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.7
                  }}>
                    <ol style={{ paddingLeft: '1.2rem', margin: 0 }}>
                      <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" style={{ color: '#FF3366' }}>console.cloud.google.com</a></li>
                      <li>Create a new project (or use existing)</li>
                      <li>Search for <strong>Cloud Text-to-Speech API</strong> and click <strong>Enable</strong></li>
                      <li>Go to <strong>APIs & Services</strong> → <strong>Credentials</strong></li>
                      <li>Click <strong>+ CREATE CREDENTIALS</strong> → <strong>API Key</strong></li>
                      <li>Copy the key (starts with <strong>AIza...</strong>) and paste above</li>
                    </ol>
                    <p style={{ margin: '0.8rem 0 0 0', color: '#4CAF50', fontSize: '0.8rem' }}>
                      💡 <strong>1,000,000 characters/month FREE</strong> — no charges if you stay within the limit!
                    </p>
                  </div>
                </details>
              </div>
            )}
            
            <small style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              {audioMode === 'tts' ? 'Uses browser speech. Audio may not embed in the downloaded file directly yet.' : audioMode === 'google' ? '1M free chars/month. Premium neural voices with audio-video sync.' : 'Premium AI voices with perfect audio-video sync.'}
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
            <a href={videoUrl} download={`my-short.${window.__videoExtension || 'mp4'}`} className="btn btn-primary" style={{ width: '100%' }}>
              <Download size={20} /> Download Video
            </a>
          )}

          {/* YouTube Upload Section */}
          {videoUrl && !isGenerating && (
            <div style={{ 
              width: '100%', 
              borderTop: '1px solid rgba(255,255,255,0.08)',
              paddingTop: '1.5rem',
              display: 'flex', flexDirection: 'column', gap: '0.8rem'
            }}>
              <label style={{ fontWeight: 600, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MonitorPlay size={20} style={{ color: '#FF0000' }} /> Upload to YouTube Shorts
              </label>
              
              <input 
                type="text"
                className="textarea"
                style={{ height: 'auto', padding: '0.8rem' }}
                placeholder="Video Title"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
              />
              <input 
                type="text"
                className="textarea"
                style={{ height: 'auto', padding: '0.8rem' }}
                placeholder="Description (optional)"
                value={videoDescription}
                onChange={(e) => setVideoDescription(e.target.value)}
              />
              <input 
                type="password"
                className="textarea"
                style={{ height: 'auto', padding: '0.8rem' }}
                placeholder="Google OAuth Client ID"
                value={ytClientId}
                onChange={(e) => {
                  setYtClientId(e.target.value);
                  localStorage.setItem('yt_client_id', e.target.value);
                }}
              />
              
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', background: ytUploading ? '#666' : 'linear-gradient(135deg, #FF0000 0%, #CC0000 100%)' }}
                onClick={uploadToYouTube}
                disabled={ytUploading || !ytClientId.trim()}
              >
                {ytUploading ? (
                  <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Uploading...</>
                ) : (
                  <><Upload size={18} /> Upload as Private Short</>
                )}
              </button>
              
              <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Uploads as <strong>Private</strong> — you can change visibility on YouTube later.
              </small>

              {ytResult && (
                <div style={{
                  padding: '0.8rem 1rem',
                  borderRadius: '12px',
                  background: ytResult.success ? 'rgba(0, 200, 80, 0.1)' : 'rgba(255, 50, 50, 0.1)',
                  border: `1px solid ${ytResult.success ? 'rgba(0, 200, 80, 0.3)' : 'rgba(255, 50, 50, 0.3)'}`,
                  fontSize: '0.9rem'
                }}>
                  {ytResult.success ? (
                    <span>✅ Uploaded! <a href={ytResult.url} target="_blank" rel="noopener noreferrer" style={{ color: '#FF3366', textDecoration: 'underline' }}>View on YouTube →</a></span>
                  ) : (
                    <span>❌ {ytResult.error}</span>
                  )}
                </div>
              )}

              {/* Setup Guide */}
              <details style={{ marginTop: '0.3rem' }}>
                <summary style={{ color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}>
                  🔧 How to get a YouTube Client ID (first time only)
                </summary>
                <div style={{ 
                  marginTop: '0.8rem', padding: '1rem', 
                  background: 'rgba(0,0,0,0.3)', borderRadius: '12px',
                  fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.7
                }}>
                  <ol style={{ paddingLeft: '1.2rem', margin: 0 }}>
                    <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" style={{ color: '#FF3366' }}>console.cloud.google.com</a></li>
                    <li>Create a new project (or use existing)</li>
                    <li>Enable <strong>YouTube Data API v3</strong> in APIs & Services</li>
                    <li>Go to <strong>Credentials</strong> → <strong>Create Credentials</strong> → <strong>OAuth Client ID</strong></li>
                    <li>Set type to <strong>Web application</strong></li>
                    <li>Add <strong>{window.location.origin}</strong> as an authorized redirect URI</li>
                    <li>Copy the <strong>Client ID</strong> and paste it above</li>
                  </ol>
                </div>
              </details>
            </div>
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

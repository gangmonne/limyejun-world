/**
 * Lim Yejun Retro Odyssey - Client Javascript
 * Handles audio synthesis, dialogue tree engine, interactive SVG map, and keyboard/mouse controls.
 */

// ==========================================================================
// AUDIO SYNTHESIZER ENGINE (Web Audio API)
// ==========================================================================
let audioCtx = null;
let masterGain = null;
let ambientHumSource = null;
let lfo = null;
let isAudioEnabled = false;
let isSoundMuted = false;

/**
 * Initializes the audio context and sets up master gain nodes.
 */
function initAudio() {
  if (audioCtx) return;
  
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.6, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);
    isAudioEnabled = true;
  } catch (e) {
    console.error("Web Audio API not supported", e);
  }
}

/**
 * Synthesizes a PS1-style boot chime (deep pad sweep + bright bell chords)
 */
function playBootChime() {
  if (!isAudioEnabled || isSoundMuted) return;
  
  const now = audioCtx.currentTime;
  
  // 1. Deep Bass Pad (Low resonant drone)
  const bassFreqs = [55, 82.4, 110]; // A1, E2, A2
  bassFreqs.forEach((freq, index) => {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    
    osc.type = index === 0 ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    
    osc.detune.setValueAtTime((index - 1) * 8, now);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(80, now);
    filter.frequency.exponentialRampToValueAtTime(350, now + 2.5);
    filter.frequency.exponentialRampToValueAtTime(100, now + 5.0);
    filter.Q.setValueAtTime(5, now);
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.25, now + 1.0);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 5.5);
    
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(masterGain);
    
    osc.start(now);
    osc.stop(now + 6.0);
  });
  
  // 2. High Chime Bell (Sweet glass synth chime)
  const chimeNotes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
  chimeNotes.forEach((freq, index) => {
    const startDelay = 1.8 + (index * 0.15);
    const chimeOsc = audioCtx.createOscillator();
    const chimeGain = audioCtx.createGain();
    
    chimeOsc.type = 'sine';
    chimeOsc.frequency.setValueAtTime(freq, now + startDelay);
    
    chimeGain.gain.setValueAtTime(0, now);
    chimeGain.gain.setValueAtTime(0, now + startDelay);
    chimeGain.gain.linearRampToValueAtTime(0.12, now + startDelay + 0.05);
    chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + startDelay + 3.0);
    
    chimeOsc.connect(chimeGain);
    chimeGain.connect(masterGain);
    
    chimeOsc.start(now);
    chimeOsc.stop(now + startDelay + 3.5);
  });
}

/**
 * Plays a retro click navigation sound
 */
function playClickSound() {
  if (!isAudioEnabled || isSoundMuted) return;
  
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
  
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
  
  osc.connect(gain);
  gain.connect(masterGain);
  
  osc.start(now);
  osc.stop(now + 0.1);
}

/**
 * Plays a quick typewriter keystroke blip
 */
function playTypewriterSound() {
  if (!isAudioEnabled || isSoundMuted) return;
  
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'sine';
  const pitch = 650 + (Math.random() * 100);
  osc.frequency.setValueAtTime(pitch, now);
  
  gain.gain.setValueAtTime(0.03, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
  
  osc.connect(gain);
  gain.connect(masterGain);
  
  osc.start(now);
  osc.stop(now + 0.03);
}

/**
 * Starts continuous warm, atmospheric ambient pad
 */
function startAmbientHum() {
  if (!isAudioEnabled || ambientHumSource) return;
  
  const now = audioCtx.currentTime;
  
  // Warm Zelda chord: A2, E3, A3, E4
  const freqs = [110, 164.8, 220, 329.6];
  const oscillators = [];
  const humGain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(300, now);
  filter.Q.setValueAtTime(2, now);
  
  // Slow LFO to simulate gentle breathing/wind
  lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(0.08, now); // Very slow 0.08 Hz modulation
  lfoGain.gain.setValueAtTime(60, now); // Sweep filter frequency +/- 60Hz
  
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start(now);
  
  freqs.forEach((freq, idx) => {
    const osc = audioCtx.createOscillator();
    osc.type = 'triangle'; // Smooth warm triangle wave
    osc.frequency.setValueAtTime(freq, now);
    
    // Soft detuning for chorus warming
    osc.detune.setValueAtTime((idx - 1.5) * 5, now);
    
    osc.connect(filter);
    osc.start(now);
    oscillators.push(osc);
  });
  
  humGain.gain.setValueAtTime(0, now);
  humGain.gain.linearRampToValueAtTime(0.25, now + 3.0); // Gentle fade-in
  
  filter.connect(humGain);
  humGain.connect(masterGain);
  
  ambientHumSource = {
    oscillators,
    humGain,
    filter,
    lfo,
    lfoGain
  };
}

/**
 * Fades out and tears down ambient drone
 */
function stopAmbientHum() {
  if (!ambientHumSource) return;
  
  const now = audioCtx.currentTime;
  const source = ambientHumSource;
  ambientHumSource = null;
  
  source.humGain.gain.setValueAtTime(source.humGain.gain.value, now);
  source.humGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
  
  setTimeout(() => {
    try {
      source.oscillators.forEach(osc => osc.stop());
      source.lfo.stop();
    } catch(e) {}
  }, 1600);
}

// ==========================================================================
// 10 INTERCONNECTED WORLDS DATABASE
// ==========================================================================
const WORLDS = [
  {
    id: "korea_smart",
    name: "I am not smart anymore",
    type: "Seoul, Korea // Drama",
    desc: "A character-driven story questioning intellect and identity in the fast-paced heart of Seoul.",
    image: "assets/photo_seoul.png",
    filter: "saturate(1.2) contrast(1.1) brightness(0.95)",
    link: "https://github.com/LimYejun",
    linkText: "[ VIEW SEOUL PROJECT ]",
    cx: 338, cy: 122,
    connections: ["korea_loess", "korea_pohang", "korea_gyeongbuk", "china_jade"]
  },
  {
    id: "korea_pohang",
    name: "Tourists",
    type: "Pohang, Korea // Scenic Narrative",
    desc: "An exploration of transient visitors and memories left behind along the coastal lines of Pohang.",
    image: "assets/world_surreal.png",
    filter: "hue-rotate(280deg) saturate(1.3)",
    link: "https://github.com/LimYejun",
    linkText: "[ VIEW POHANG PROJECT ]",
    cx: 345, cy: 125,
    connections: ["korea_smart", "korea_loess"]
  },
  {
    id: "korea_ho",
    name: "HO",
    type: "Jeollanam-do, Korea // Regional Folklore",
    desc: "A rich narrative journey through the misty agricultural planes and traditions of Jeollanam-do.",
    image: "assets/world_leaves.png",
    filter: "sepia(0.2) saturate(1.4) contrast(1.05)",
    link: "https://github.com/LimYejun",
    linkText: "[ VIEW HO PROJECT ]",
    cx: 335, cy: 132,
    connections: ["korea_loess", "korea_gyeongbuk"]
  },
  {
    id: "korea_gyeongbuk",
    name: "Chiggy-ggun",
    type: "Gyeongsangbuk-do, Korea // Historical Folk",
    desc: "A storytelling project centering around traditional A-frame jigge carriers in Gyeongsangbuk-do.",
    image: "assets/photo_seoul.png",
    filter: "hue-rotate(180deg) saturate(0.8) contrast(1.2)",
    link: "https://korean-war-porter.vercel.app/",
    linkText: "[ PLAY GAME IN NEW WINDOW ]",
    cx: 346, cy: 121,
    connections: ["korea_smart", "korea_ho"]
  },
  {
    id: "korea_loess",
    name: "Taste Of Loess",
    type: "Mendoza-Incheon Connected // Live-action Short Film",
    desc: "A live-action short film in progress, bridging the loess soils of Incheon, Korea with Mendoza, Argentina.",
    image: "assets/world_crt.png",
    filter: "sepia(0.4) saturate(1.2) contrast(1.1)",
    link: "https://github.com/LimYejun",
    linkText: "[ VIEW TASTE OF LOESS ]",
    cx: 130, cy: 240, // Mendoza, Argentina
    cx2: 334, cy2: 120, // Incheon, Korea
    label1: "Mendoza",
    label2: "Incheon",
    connections: ["korea_smart", "korea_pohang", "korea_ho", "usa_manhattan"]
  },
  {
    id: "usa_manhattan",
    name: "Bigball / Economic",
    type: "Manhattan, New York // Meta AI Cinema",
    desc: "A cutting-edge meta AI cinema piece analyzing economic power dynamics in Manhattan, New York.",
    image: "assets/world_crt.png",
    filter: "contrast(1.3) brightness(0.85) grayscale(20%)",
    link: "https://youtu.be/Uaq6Gbmo6C4",
    linkText: "[ WATCH TRAILER ON YOUTUBE ]",
    iframe: "https://www.youtube.com/embed/Uaq6Gbmo6C4?autoplay=1",
    cx: 115, cy: 110,
    connections: ["syria_canada", "korea_loess"]
  },
  {
    id: "china_jade",
    name: "I want to hug you but I have no hands",
    type: "China // Solar-punk Drama",
    desc: "A touching speculative fiction narrative set in a solar-punk China, exploring touch, technology, and isolation.",
    image: "assets/world_samorost.png",
    filter: "hue-rotate(50deg) saturate(1.3)",
    link: "https://github.com/LimYejun",
    linkText: "[ VIEW CHINA PROJECT ]",
    cx: 310, cy: 125,
    connections: ["korea_smart", "syria_canada", "venice_joseon"]
  },
  {
    id: "syria_canada",
    name: "The Intrepreneur",
    type: "Syria-Canada Connected // 3-channel Multi Video",
    desc: "An immersive 3-channel multi-video documentary mapping entrepreneurial spirits spanning Damascus, Syria and Montreal, Canada.",
    image: "assets/world_desk.png",
    filter: "sepia(0.4) saturate(1.2) contrast(1.1)",
    link: "https://github.com/LimYejun",
    linkText: "[ VIEW INTREPRENEUR ]",
    cx: 90, cy: 75, // Canada
    cx2: 228, cy2: 126, // Syria
    label1: "Canada",
    label2: "Syria",
    connections: ["usa_manhattan", "china_jade", "venice_joseon"]
  },
  {
    id: "venice_joseon",
    name: "The bright world (광명세계)",
    type: "Venice-Joseon Connected // Historic Narrative",
    desc: "A connected historic narrative bridging Venice, Italy and the Joseon Dynasty of Korea, exploring early global ties.",
    image: "assets/world_leaves.png",
    filter: "hue-rotate(120deg) brightness(0.95)",
    link: "https://github.com/LimYejun",
    linkText: "[ EXPLORE THE BRIGHT WORLD ]",
    cx: 205, cy: 105, // Venice, Italy
    cx2: 338, cy2: 122, // Joseon Dynasty, Korea
    label1: "Venice",
    label2: "Joseon",
    connections: ["syria_canada", "china_jade"]
  },
  {
    id: "space_nebula",
    name: "Nebula Outpost",
    type: "Outer Space // Atmospheric Diary",
    desc: "A sci-fi interactive diary of a research scientist operating a solar observatory near a glowing purple nebula.",
    image: "assets/world_surreal.png",
    filter: "hue-rotate(240deg) saturate(1.8) contrast(1.3)",
    link: "https://github.com/LimYejun",
    linkText: "[ DOCK WITH OUTPOST ]",
    cx: 30, cy: 30,
    connections: []
  },
  {
    id: "space_broadcast",
    name: "Deep Broadcast",
    type: "Outer Space // Cosmic Signal Decipher",
    desc: "An audio-visual game deciphering strange retro signals broadcast from an abandoned alien probe in the deep void.",
    image: "assets/world_crt.png",
    filter: "hue-rotate(140deg) contrast(1.4) brightness(0.8)",
    link: "https://github.com/LimYejun",
    linkText: "[ LISTEN TO SIGNAL ]",
    cx: 370, cy: 30,
    connections: []
  }
];

// Special info dossier node
const DOSSIER_NODE = {
  speaker: "YEJUN_AI",
  text: "SUBJECT DOSSIER // Lim Yejun. Film maker and story-teller. Current Status: Student (Last semester enrolling) studying film-making & multi-media. Located in Seoul, South Korea.",
  choices: [
    { text: "[Read Technical Skillset Sheet]", action: "skills" },
    { text: "[Read Artistic Philosophy Sheet]", action: "philosophy" },
    { text: "[Return to Main Directory]", action: "map" }
  ]
};

const SKILLS_NODE = {
  speaker: "YEJUN_AI",
  text: "SYSTEM SPEC // Technical capabilities: HTML5 layout systems, Vanilla CSS/JS design structures, Web Audio API synthesis, responsive structures, and autonomous multi-agent pipelines.",
  choices: [
    { text: "[Return to Dossier Menu]", action: "dossier" },
    { text: "[Return to Main Directory]", action: "map" }
  ]
};

const PHILOSOPHY_NODE = {
  speaker: "YEJUN_AI",
  text: "CREATIVE DIRECTIVE // Focuses on digital nostalgia, liminal space environments, and mid-90s psychological horror aesthetics. Striving to replace clean corporate layouts with textured weight.",
  choices: [
    { text: "[Return to Dossier Menu]", action: "dossier" },
    { text: "[Return to Main Directory]", action: "map" }
  ]
};

// ==========================================================================
// STATE ENGINE VARIABLES
// ==========================================================================
let isTypewriting = false;
let typewriteInterval = null;
let currentTextToType = "";
let currentTypedLength = 0;
let currentChoiceIndex = 0; // Highlighted menu/dossier item OR map node index
let sceneActiveIndex = 0; // 0: audio, 1: boot, 2: menu, 3: game, 4: shutdown
let isViewingWorldDetail = false;
let currentDossierState = "map"; // map, dossier, skills, philosophy

// DOM Cache
const scenes = {
  audio: document.getElementById("sceneAudioSetup"),
  boot: document.getElementById("sceneBoot"),
  menu: document.getElementById("sceneMainMenu"),
  game: document.getElementById("sceneGame"),
  shutdown: document.getElementById("sceneShutdown")
};

function enableSidebarPortalLink(url, text) {
  const link = document.getElementById("btnExternalLink");
  if (link) {
    link.href = url;
    link.textContent = text || "[ PORTAL AVAILABLE ]";
    link.classList.remove("disabled");
  }
}

function disableSidebarPortalLink() {
  const link = document.getElementById("btnExternalLink");
  if (link) {
    link.href = "#";
    link.textContent = "[ LINK DISABLED ]";
    link.classList.add("disabled");
  }
}

// ==========================================================================
// SCENE & SYSTEM TRANSITIONS
// ==========================================================================
function activateScene(sceneName) {
  Object.keys(scenes).forEach(key => {
    if (key === sceneName) {
      if (scenes[key]) scenes[key].classList.add("active");
    } else {
      if (scenes[key]) scenes[key].classList.remove("active");
    }
  });
  
  // Manage back button visibility for non-game scenes
  const backBtn = document.getElementById("btnBackToMap");
  if (backBtn) {
    if (sceneName !== 'game') {
      backBtn.classList.add("hidden");
    }
  }
  
  if (sceneName === 'menu') {
    sceneActiveIndex = 2;
    currentChoiceIndex = 0;
    updateMainMenuSelection();
    hidePlaylistBar(); // Hide on main menu screen!
  } else if (sceneName === 'game') {
    sceneActiveIndex = 3;
    currentChoiceIndex = 0;
    isViewingWorldDetail = false;
    currentDossierState = "map";
    
    // Clear details layout and restore map with safety checks
    const mapSvg = document.getElementById("worldMapSvg");
    if (mapSvg) mapSvg.classList.remove("hidden");
    
    const viewportImg = document.getElementById("viewportImage");
    if (viewportImg) viewportImg.classList.add("hidden");
    
    const iframeEl = document.getElementById("viewportIframe");
    if (iframeEl) {
      iframeEl.src = "";
      iframeEl.classList.add("hidden");
    }
    
    if (backBtn) {
      backBtn.textContent = "[ ◀ BACK ]";
      backBtn.classList.remove("hidden");
    }
    
    disableSidebarPortalLink();
    
    // Render and build map coordinates
    buildSVGMap();
    highlightMapNode(0);
    showPlaylistBar(); // Show playlist on game scene!
    
    // Autoplay the playlist music at a soft 30% volume after a small 1s transition delay
    setTimeout(() => {
      if (ytPlayer && typeof ytPlayer.playVideo === 'function' && !isPlayerPlaying) {
        togglePlayPause();
      }
    }, 1000);
  } else if (sceneName === 'shutdown') {
    sceneActiveIndex = 4;
    hidePlaylistBar();
  } else {
    hidePlaylistBar();
  }
}

/**
 * PS1-Style Boot Sequence
 */
function startBootSequence() {
  initAudio();
  activateScene("boot");
  sceneActiveIndex = 1;
  
  const loaderContainer = document.getElementById("bootLoaderContainer");
  const loadingBar = document.getElementById("bootLoadingBar");
  
  playBootChime();
  if (loaderContainer) loaderContainer.style.display = "flex";
  
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += Math.floor(Math.random() * 8) + 2;
    if (progress >= 100) {
      progress = 100;
      clearInterval(progressInterval);
      
      setTimeout(() => {
        triggerGlitchEffect(() => {
          activateScene("menu");
          if (!isSoundMuted) startAmbientHum();
        });
      }, 600);
    }
    if (loadingBar) loadingBar.style.width = progress + "%";
  }, 100);
}

/**
 * Triggers a full screen CRT glitch overlay animation
 */
function triggerGlitchEffect(callback) {
  const staticOverlay = document.getElementById("staticOverlay");
  staticOverlay.classList.add("active");
  playClickSound();
  
  setTimeout(() => {
    staticOverlay.classList.remove("active");
    if (callback) callback();
  }, 400);
}

// ==========================================================================
// INTERACTIVE MAP ENGINE
// ==========================================================================

/**
 * Draws the SVG nodes and connection lines based on coordinates database.
 */
function buildSVGMap() {
  const linesGroup = document.getElementById("mapLines");
  const nodesGroup = document.getElementById("mapNodes");
  
  if (!linesGroup || !nodesGroup) {
    console.warn("Map SVG groups not found. Browser caching might be showing an old version. Please perform a hard refresh (Cmd+Shift+R).");
    return;
  }
  
  linesGroup.innerHTML = "";
  nodesGroup.innerHTML = "";
  
  // 1. Connection lines removed per request

  
  // 2. Draw nodes and names
  WORLDS.forEach((world, index) => {
    const drawNode = (cx, cy, labelSuffix, isPrimary = true) => {
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", cx);
      circle.setAttribute("cy", cy);
      circle.setAttribute("r", "8");
      
      const nodeId = isPrimary ? `node-${world.id}` : `node-${world.id}-sec`;
      circle.setAttribute("id", nodeId);
      circle.setAttribute("class", "map-node");
      
      // Label text
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", cx + 12);
      text.setAttribute("y", cy + 5);
      
      const labelId = isPrimary ? `label-${world.id}` : `label-${world.id}-sec`;
      text.setAttribute("id", labelId);
      text.setAttribute("class", "map-node-label");
      text.textContent = labelSuffix;
      
      group.appendChild(circle);
      group.appendChild(text);
      nodesGroup.appendChild(group);
      
      // Mouse Interaction
      circle.addEventListener("mouseenter", () => {
        if (sceneActiveIndex === 3 && !isViewingWorldDetail && currentDossierState === "map") {
          currentChoiceIndex = index;
          highlightMapNode(index);
          playClickSound();
        }
      });
      
      circle.addEventListener("click", () => {
        if (sceneActiveIndex === 3 && !isViewingWorldDetail && currentDossierState === "map") {
          currentChoiceIndex = index;
          highlightMapNode(index);
          enterWorldDetail(world);
        }
      });
    };
    
    if (world.cx2 !== undefined && world.cy2 !== undefined) {
      // Draw dynamic multi-point connection labels
      drawNode(world.cx, world.cy, world.label1 || "Canada", true);
      drawNode(world.cx2, world.cy2, world.label2 || "Syria", false);
    } else {
      let shortLabel = world.name.split(" ")[0];
      if (world.id === "space_nebula") shortLabel = "Space-1";
      if (world.id === "space_broadcast") shortLabel = "Space-2";
      drawNode(world.cx, world.cy, shortLabel, true);
    }
  });
}

function highlightMapNode(activeIndex) {
  const activeWorld = WORLDS[activeIndex];
  
  // Update node elements active class
  WORLDS.forEach((world, index) => {
    const nodeEl = document.getElementById(`node-${world.id}`);
    const labelEl = document.getElementById(`label-${world.id}`);
    const secNodeEl = document.getElementById(`node-${world.id}-sec`);
    const secLabelEl = document.getElementById(`label-${world.id}-sec`);
    
    if (index === activeIndex) {
      if (nodeEl) nodeEl.classList.add("active");
      if (labelEl) labelEl.classList.add("active");
      if (secNodeEl) secNodeEl.classList.add("active");
      if (secLabelEl) secLabelEl.classList.add("active");
    } else {
      if (nodeEl) nodeEl.classList.remove("active");
      if (labelEl) labelEl.classList.remove("active");
      if (secNodeEl) secNodeEl.classList.remove("active");
      if (secLabelEl) secLabelEl.classList.remove("active");
    }
  });
  
  // Highlight connected paths
  const allLines = document.querySelectorAll(".map-lines line");
  allLines.forEach(line => line.classList.remove("glow"));
  
  const activeLines = document.querySelectorAll(`.map-lines line.w-${activeWorld.id}`);
  activeLines.forEach(line => line.classList.add("glow"));
  
  // Set speaker label
  document.getElementById("dialogSpeaker").textContent = "YEJUN_AI";
  updateAvatarVisibility("YEJUN_AI");
  
  // Viewport Info
  document.getElementById("viewportTitle").textContent = `SECTOR // ${activeWorld.name.toUpperCase()}`;
  document.getElementById("viewportCaption").textContent = `Type: ${activeWorld.type}. Awaiting inspection.`;
  
  // Render folder choices inside JRPG textbox
  renderMapFolders();
  
  // Trigger typewriter summary
  const summaryText = `SYSTEM CONNECTOR // Highlighted Node: ${activeWorld.name}. Construct class: ${activeWorld.type}. [Press ENTER to explore world]`;
  startTypewriter(summaryText);
}

/**
 * Enters Detail Mode for a highlighted world
 */
function enterWorldDetail(world) {
  isViewingWorldDetail = true;
  
  const backBtn = document.getElementById("btnBackToMap");
  if (backBtn) {
    backBtn.textContent = "[ ◀ BACK ]";
    backBtn.classList.remove("hidden");
  }
  
  triggerGlitchEffect(() => {
    // Hide map and show image or iframe in viewport
    document.getElementById("worldMapSvg").classList.add("hidden");
    
    const viewportImg = document.getElementById("viewportImage");
    const iframeEl = document.getElementById("viewportIframe");
    
    if (world.iframe) {
      if (viewportImg) viewportImg.classList.add("hidden");
      if (iframeEl) {
        iframeEl.src = world.iframe;
        iframeEl.classList.remove("hidden");
      }
    } else {
      if (iframeEl) {
        iframeEl.src = "";
        iframeEl.classList.add("hidden");
      }
      if (viewportImg) {
        viewportImg.src = world.image;
        viewportImg.style.filter = world.filter;
        viewportImg.style.objectFit = "cover";
        viewportImg.classList.remove("hidden");
      }
    }
    
    document.getElementById("viewportTitle").textContent = `STREAMING // ${world.name.toUpperCase()}`;
    document.getElementById("viewportCaption").textContent = world.type;
    
    // Enable external link widget in sidebar
    if (world.link) {
      enableSidebarPortalLink(world.link, world.linkText || "[ PORTAL AVAILABLE ]");
    } else {
      disableSidebarPortalLink();
    }
    
    // Set speaker as the world's node identity
    document.getElementById("dialogSpeaker").textContent = world.name;
    updateAvatarVisibility(world.name);
    
    // Start typewriter full description
    startTypewriter(world.desc, () => {
      // Renders choice buttons overlaid inside JRPG textbox
      renderDetailChoices();
    });
  });
}

function exitWorldDetail() {
  isViewingWorldDetail = false;
  disableSidebarPortalLink();
  
  const backBtn = document.getElementById("btnBackToMap");
  if (backBtn) {
    backBtn.textContent = "[ ◀ BACK ]";
    backBtn.classList.remove("hidden");
  }
  
  const iframeEl = document.getElementById("viewportIframe");
  if (iframeEl) {
    iframeEl.src = "";
    iframeEl.classList.add("hidden");
  }
  
  triggerGlitchEffect(() => {
    document.getElementById("worldMapSvg").classList.remove("hidden");
    document.getElementById("viewportImage").classList.add("hidden");
    
    highlightMapNode(currentChoiceIndex);
  });
}

function renderDetailChoices() {
  const choicesPanel = document.getElementById("dialogChoicesPanel");
  choicesPanel.innerHTML = "";
  
  const activeWorld = WORLDS[findActiveWorldIndex()];
  const choices = [];
  
  // If it has a real external link (not the github placeholder), show the link action button!
  if (activeWorld && activeWorld.link && activeWorld.link !== "https://github.com/LimYejun") {
    choices.push({ text: activeWorld.linkText || "[Execute Portal Link]", action: "portal" });
  }
  choices.push({ text: "[Return to World Map]", action: "map" });
  
  currentChoiceIndex = 0; // reuse index for choices
  
  choices.forEach((choice, index) => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.setAttribute("role", "button");
    btn.innerHTML = `<span class="pointer">&gt;</span> ${choice.text}`;
    
    btn.addEventListener("mouseenter", () => {
      currentChoiceIndex = index;
      updateChoiceSelectionHighlight();
    });
    
    btn.addEventListener("click", () => {
      playClickSound();
      executeDetailChoiceAction(choice.action);
    });
    
    choicesPanel.appendChild(btn);
  });
  
  choicesPanel.classList.add("active");
  updateChoiceSelectionHighlight();
}

function executeDetailChoiceAction(action) {
  if (action === "portal") {
    const activeWorld = WORLDS[findActiveWorldIndex()];
    if (activeWorld && activeWorld.link) {
      window.open(activeWorld.link, "_blank");
    }
  } else if (action === "map") {
    // Return index context back to the active world node index
    currentChoiceIndex = findActiveWorldIndex();
    exitWorldDetail();
  }
}

function findActiveWorldIndex() {
  const speakerName = document.getElementById("dialogSpeaker").textContent;
  return WORLDS.findIndex(w => w.name === speakerName);
}

// ==========================================================================
// PORTFOLIO SPECIAL DIALOGUE NODES (DOSSIER / SKILLS)
// ==========================================================================
function updateAvatarVisibility(speaker) {
  const avatarContainer = document.getElementById("dialogAvatarContainer");
  if (!avatarContainer) return;
  
  if (speaker === "SYSTEM" || speaker === "") {
    avatarContainer.classList.add("hidden");
  } else {
    avatarContainer.classList.remove("hidden");
  }
}

function goToDossierNode(state) {
  currentDossierState = state;
  let node = null;
  
  if (state === "dossier") node = DOSSIER_NODE;
  else if (state === "skills") node = SKILLS_NODE;
  else if (state === "philosophy") node = PHILOSOPHY_NODE;
  
  if (!node) return;
  
  const iframeEl = document.getElementById("viewportIframe");
  if (iframeEl) {
    iframeEl.src = "";
    iframeEl.classList.add("hidden");
  }
  
  const backBtn = document.getElementById("btnBackToMap");
  if (backBtn) {
    backBtn.textContent = "[ ◀ BACK ]";
    backBtn.classList.remove("hidden");
  }
  
  // Hide SVG map, but show the dossier image icon in the viewport
  const mapSvg = document.getElementById("worldMapSvg");
  if (mapSvg) mapSvg.classList.add("hidden");
  
  const viewportImg = document.getElementById("viewportImage");
  if (viewportImg) {
    viewportImg.src = "assets/seoul_look_up.png";
    viewportImg.style.filter = "none";
    viewportImg.style.objectFit = "contain";
    viewportImg.classList.remove("hidden");
  }
  
  const vTitle = document.getElementById("viewportTitle");
  if (vTitle) vTitle.textContent = "DOSSIER // THE STORY-TELLER";
  
  const vCaption = document.getElementById("viewportCaption");
  if (vCaption) vCaption.textContent = "A retro silhouette of a child looking up at the Seoul skyline.";
  
  document.getElementById("dialogSpeaker").textContent = node.speaker;
  updateAvatarVisibility(node.speaker);
  
  document.getElementById("dialogChoicesPanel").classList.remove("active");
  
  startTypewriter(node.text, () => {
    renderDossierChoices(node.choices);
  });
}

function renderDossierChoices(choices) {
  const choicesPanel = document.getElementById("dialogChoicesPanel");
  choicesPanel.innerHTML = "";
  currentChoiceIndex = 0;
  
  choices.forEach((choice, index) => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.setAttribute("role", "button");
    btn.innerHTML = `<span class="pointer">&gt;</span> ${choice.text}`;
    
    btn.addEventListener("mouseenter", () => {
      currentChoiceIndex = index;
      updateChoiceSelectionHighlight();
    });
    
    btn.addEventListener("click", () => {
      playClickSound();
      executeDossierChoiceAction(choice.action);
    });
    
    choicesPanel.appendChild(btn);
  });
  
  choicesPanel.classList.add("active");
  updateChoiceSelectionHighlight();
}

function executeDossierChoiceAction(action) {
  if (action === "map") {
    currentDossierState = "map";
    
    const backBtn = document.getElementById("btnBackToMap");
    if (backBtn) {
      backBtn.textContent = "[ ◀ BACK ]";
      backBtn.classList.remove("hidden");
    }
    
    triggerGlitchEffect(() => {
      document.getElementById("worldMapSvg").classList.remove("hidden");
      const viewportImg = document.getElementById("viewportImage");
      if (viewportImg) viewportImg.classList.add("hidden");
      const iframeEl = document.getElementById("viewportIframe");
      if (iframeEl) {
        iframeEl.src = "";
        iframeEl.classList.add("hidden");
      }
      highlightMapNode(0);
    });
  } else {
    goToDossierNode(action);
  }
}

// ==========================================================================
// TYPEWRITER ANIMATION
// ==========================================================================
function startTypewriter(text, onComplete) {
  stopTypewriter();
  isTypewriting = true;
  currentTextToType = text;
  currentTypedLength = 0;
  
  const textContainer = document.getElementById("dialogText");
  const caret = document.getElementById("dialogCaret");
  textContainer.textContent = "";
  caret.classList.remove("active");
  
  typewriteInterval = setInterval(() => {
    if (currentTypedLength < currentTextToType.length) {
      const char = currentTextToType.charAt(currentTypedLength);
      textContainer.textContent += char;
      currentTypedLength++;
      
      if (char !== " ") {
        playTypewriterSound();
      }
    } else {
      completeTypewriter(onComplete);
    }
  }, 25);
}

function completeTypewriter(onComplete) {
  stopTypewriter();
  document.getElementById("dialogText").textContent = currentTextToType;
  document.getElementById("dialogCaret").classList.add("active");
  
  if (onComplete) onComplete();
}

function stopTypewriter() {
  isTypewriting = false;
  if (typewriteInterval) {
    clearInterval(typewriteInterval);
    typewriteInterval = null;
  }
}

function skipTypewriter() {
  if (!isTypewriting) return;
  
  // Decide which node script is executing based on state context
  let completionCallback = null;
  
  if (isViewingWorldDetail) {
    completionCallback = () => renderDetailChoices();
  } else if (currentDossierState !== "map") {
    let node = null;
    if (currentDossierState === "dossier") node = DOSSIER_NODE;
    else if (currentDossierState === "skills") node = SKILLS_NODE;
    else if (currentDossierState === "philosophy") node = PHILOSOPHY_NODE;
    completionCallback = () => renderDossierChoices(node.choices);
  }
  
  completeTypewriter(completionCallback);
}

// ==========================================================================
// SELECTION GLOW HIGHLIGHTS
// ==========================================================================
function updateChoiceSelectionHighlight() {
  const buttons = document.querySelectorAll("#dialogChoicesPanel .choice-btn");
  buttons.forEach((btn, index) => {
    if (index === currentChoiceIndex) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

function updateMainMenuSelection() {
  const menuItems = document.querySelectorAll("#mainMenuNav .menu-item");
  menuItems.forEach((item, index) => {
    if (index === currentChoiceIndex) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });
}

function selectCurrentChoice() {
  if (isViewingWorldDetail) {
    // choices are detail panel
    const activeWorld = WORLDS[findActiveWorldIndex()];
    const choices = [];
    if (activeWorld && activeWorld.link && activeWorld.link !== "https://github.com/LimYejun") {
      choices.push("portal");
    }
    choices.push("map");
    executeDetailChoiceAction(choices[currentChoiceIndex]);
  } else {
    // choices are dossier panel
    let node = null;
    if (currentDossierState === "dossier") node = DOSSIER_NODE;
    else if (currentDossierState === "skills") node = SKILLS_NODE;
    else if (currentDossierState === "philosophy") node = PHILOSOPHY_NODE;
    
    if (node && node.choices[currentChoiceIndex]) {
      playClickSound();
      executeDossierChoiceAction(node.choices[currentChoiceIndex].action);
    }
  }
}

function triggerMainMenuAction() {
  const menuItems = document.querySelectorAll("#mainMenuNav .menu-item");
  const activeItem = menuItems[currentChoiceIndex];
  if (!activeItem) return;
  
  playClickSound();
  const action = activeItem.getAttribute("data-action");
  
  if (action === "start") {
    activateScene("game");
  } else if (action === "about") {
    activateScene("game");
    goToDossierNode("dossier");
  } else if (action === "exit") {
    triggerShutdownSequence();
  }
}

function triggerShutdownSequence() {
  stopAmbientHum();
  activateScene("shutdown");
  triggerGlitchEffect();
}

// ==========================================================================
// GRID NAVIGATION & FOLDER RENDERING STYLES
// ==========================================================================
function navigateMapGrid(direction) {
  const count = WORLDS.length; // 11
  let r = Math.floor(currentChoiceIndex / 2);
  let c = currentChoiceIndex % 2;
  const numRows = Math.ceil(count / 2); // 6
  
  if (direction === "ArrowUp") {
    r = (r - 1 + numRows) % numRows;
    let nextIndex = r * 2 + c;
    if (nextIndex >= count) {
      nextIndex = count - 1; // Land on last valid item
    }
    currentChoiceIndex = nextIndex;
  } else if (direction === "ArrowDown") {
    r = (r + 1) % numRows;
    let nextIndex = r * 2 + c;
    if (nextIndex >= count) {
      nextIndex = 0; // Wrap back to top row
    }
    currentChoiceIndex = nextIndex;
  } else if (direction === "ArrowLeft") {
    if (c === 1) {
      currentChoiceIndex = r * 2;
    } else {
      let nextIndex = r * 2 + 1;
      if (nextIndex >= count) {
        nextIndex = count - 1;
      }
      currentChoiceIndex = nextIndex;
    }
  } else if (direction === "ArrowRight") {
    if (c === 0) {
      let nextIndex = r * 2 + 1;
      if (nextIndex < count) {
        currentChoiceIndex = nextIndex;
      } else {
        currentChoiceIndex = r * 2;
      }
    } else {
      currentChoiceIndex = r * 2;
    }
  }
  
  playClickSound();
  highlightMapNode(currentChoiceIndex);
}

function renderMapFolders() {
  const choicesPanel = document.getElementById("dialogChoicesPanel");
  if (!choicesPanel) return;
  
  // Prevent duplicate renders to stop typewriter layout reset
  if (choicesPanel.classList.contains("active") && choicesPanel.children.length === WORLDS.length && !isViewingWorldDetail && currentDossierState === "map") {
    updateChoiceSelectionHighlight();
    return;
  }
  
  choicesPanel.innerHTML = "";
  
  WORLDS.forEach((world, index) => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.setAttribute("role", "button");
    
    const folderNum = (index + 1) < 10 ? `0${index + 1}` : `${index + 1}`;
    btn.innerHTML = `<span class="pointer">&gt;</span> 📁 Folder ${folderNum}: ${world.name.split(" ")[0]}`;
    
    btn.addEventListener("mouseenter", () => {
      if (!isViewingWorldDetail && currentDossierState === "map") {
        currentChoiceIndex = index;
        highlightMapNode(index);
        playClickSound();
      }
    });
    
    btn.addEventListener("click", () => {
      if (!isViewingWorldDetail && currentDossierState === "map") {
        currentChoiceIndex = index;
        enterWorldDetail(world);
      }
    });
    
    choicesPanel.appendChild(btn);
  });
  
  choicesPanel.classList.add("active");
  updateChoiceSelectionHighlight();
}

// ==========================================================================
// KEYBOARD CONTROL BINDINGS
// ==========================================================================
window.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Enter"].includes(e.key)) {
    e.preventDefault();
  }
  
  // Scene 0: Initial audio trigger
  if (sceneActiveIndex === 0) {
    if (e.key === "Enter" || e.key === " ") {
      startBootSequence();
    }
    return;
  }
  
  // Scene 1: PS1 Boot (no key intercept)
  if (sceneActiveIndex === 1) return;
  
  // Scene 2: Title Menu
  if (sceneActiveIndex === 2) {
    const menuItems = document.querySelectorAll("#mainMenuNav .menu-item");
    if (e.key === "ArrowUp") {
      playClickSound();
      currentChoiceIndex = (currentChoiceIndex - 1 + menuItems.length) % menuItems.length;
      updateMainMenuSelection();
    } else if (e.key === "ArrowDown") {
      playClickSound();
      currentChoiceIndex = (currentChoiceIndex + 1) % menuItems.length;
      updateMainMenuSelection();
    } else if (e.key === "Enter" || e.key === " ") {
      triggerMainMenuAction();
    }
    return;
  }
  
  // Scene 3: Exploration Game
  if (sceneActiveIndex === 3) {
    if (isTypewriting) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        skipTypewriter();
      }
      return;
    }
    
    if (isViewingWorldDetail) {
      // In world details choice menu
      const activeWorld = WORLDS[findActiveWorldIndex()];
      let choicesCount = 1;
      if (activeWorld && activeWorld.link && activeWorld.link !== "https://github.com/LimYejun") {
        choicesCount++;
      }
      
      if (e.key === "ArrowUp") {
        playClickSound();
        currentChoiceIndex = (currentChoiceIndex - 1 + choicesCount) % choicesCount;
        updateChoiceSelectionHighlight();
      } else if (e.key === "ArrowDown") {
        playClickSound();
        currentChoiceIndex = (currentChoiceIndex + 1) % choicesCount;
        updateChoiceSelectionHighlight();
      } else if (e.key === "Enter" || e.key === " ") {
        selectCurrentChoice();
      } else if (e.key === "Escape" || e.key === "Backspace") {
        currentChoiceIndex = findActiveWorldIndex();
        exitWorldDetail();
      }
    } else if (currentDossierState !== "map") {
      // In biography/skills dossier layout
      let count = 3; // dossier options count
      if (currentDossierState === "skills" || currentDossierState === "philosophy") count = 2;
      
      if (e.key === "ArrowUp") {
        playClickSound();
        currentChoiceIndex = (currentChoiceIndex - 1 + count) % count;
        updateChoiceSelectionHighlight();
      } else if (e.key === "ArrowDown") {
        playClickSound();
        currentChoiceIndex = (currentChoiceIndex + 1) % count;
        updateChoiceSelectionHighlight();
      } else if (e.key === "Enter" || e.key === " ") {
        selectCurrentChoice();
      } else if (e.key === "Escape" || e.key === "Backspace") {
        executeDossierChoiceAction("map");
      }
    } else {
      // Map navigation mode
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        navigateMapGrid(e.key);
      } else if (e.key === "Enter" || e.key === " ") {
        enterWorldDetail(WORLDS[currentChoiceIndex]);
      } else if (e.key === "Escape" || e.key === "Backspace") {
        playClickSound();
        activateScene("menu");
      }
    }
    return;
  }
  
  // Scene 4: Shutdown
  if (sceneActiveIndex === 4) {
    if (e.key === "Enter" || e.key === " ") {
      playClickSound();
      location.reload();
    }
  }
});

// ==========================================================================
// MOUSE & CONTROL BUTTON ATTACHMENTS
// ==========================================================================
document.getElementById("btnBootWithAudio").addEventListener("click", () => {
  startBootSequence();
});

document.getElementById("btnBootSilent").addEventListener("click", () => {
  isSoundMuted = true;
  startBootSequence();
});

// Title Menu options hover/click
const titleMenuItems = document.querySelectorAll("#mainMenuNav .menu-item");
titleMenuItems.forEach((item, index) => {
  item.addEventListener("mouseenter", () => {
    if (sceneActiveIndex === 2) {
      currentChoiceIndex = index;
      updateMainMenuSelection();
    }
  });
  item.addEventListener("click", () => {
    if (sceneActiveIndex === 2) {
      triggerMainMenuAction();
    }
  });
});

// Sidebar widgets toggles
document.getElementById("btnToggleSound").addEventListener("click", (e) => {
  const btn = e.target;
  playClickSound();
  if (btn.classList.contains("active")) {
    btn.classList.remove("active");
    btn.textContent = "OFF";
    isSoundMuted = true;
    stopAmbientHum();
  } else {
    // If turning on ambient synthesizer hum, pause YouTube music!
    if (isPlayerPlaying && ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
      ytPlayer.pauseVideo();
      isPlayerPlaying = false;
      updatePlayerUI();
    }
    
    btn.classList.add("active");
    btn.textContent = "ON";
    isSoundMuted = false;
    initAudio();
    if (sceneActiveIndex === 3) startAmbientHum();
  }
});

document.getElementById("btnToggleScanlines").addEventListener("click", (e) => {
  const btn = e.target;
  const monitor = document.getElementById("monitor");
  const scanlineOverlay = document.querySelector(".scanlines");
  
  playClickSound();
  if (btn.classList.contains("active")) {
    btn.classList.remove("active");
    btn.textContent = "OFF";
    scanlineOverlay.style.display = "none";
  } else {
    btn.classList.add("active");
    btn.textContent = "ON";
    scanlineOverlay.style.display = "block";
  }
});

// Typewriter caret skip trigger
document.getElementById("dialogCaret").addEventListener("click", () => {
  if (sceneActiveIndex === 3 && isTypewriting) {
    skipTypewriter();
  }
});

// Reboot Button
document.getElementById("btnRestart").addEventListener("click", () => {
  playClickSound();
  location.reload();
});

// ==========================================================================
// FLOATING WINAMP-STYLE YOUTUBE PLAYLIST PLAYER ENGINE
// ==========================================================================
const PLAYLIST = [
  { id: "G6vEb_uH6x0", title: "Monthly Choice" },
  { id: "8Z1H84VvBqY", title: "Zelda & Chill - Hateno Village Lofi" },
  { id: "f19nC_6L1dM", title: "Zelda & Chill - Fairy Fountain Beat" },
  { id: "5wRTzU860ts", title: "Ghibli Lofi - Path of the Wind" },
  { id: "g8zSjM1x9Xw", title: "NES Lofi - Retro Gaming Chill" },
  { id: "c5W5K7X_g14", title: "Autumn Chill - Cozy Coffee Lofi" },
  { id: "tM21Xy3zQy8", title: "Synthwave Breeze - Sunset Drive" },
  { id: "jfKfPfyJRdk", title: "Lofi Girl - Night Study Session" },
  { id: "2eW1vjX-K7o", title: "Cozy Zelda - Fireplace & Lofi Beats" },
  { id: "nE5868v4hB0", title: "Chrono Trigger - Wind Scene Synth Lofi" }
];

let ytPlayer = null;
let currentTrackIndex = 0;
let isPlayerPlaying = false;
let isPlayerMuted = false;
let volumeFadeInterval = null;

function showPlaylistBar() {
  const bar = document.getElementById("playlistBar");
  if (bar) bar.classList.remove("hidden");
}

function hidePlaylistBar() {
  const bar = document.getElementById("playlistBar");
  if (bar) bar.classList.add("hidden");
}

function initYouTubePlayer() {
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

window.onYouTubeIframeAPIReady = function() {
  ytPlayer = new YT.Player('ytPlayerContainer', {
    height: '0',
    width: '0',
    videoId: PLAYLIST[currentTrackIndex].id,
    playerVars: {
      'autoplay': 0,
      'controls': 0,
      'disablekb': 1,
      'fs': 0,
      'modestbranding': 1,
      'rel': 0,
      'showinfo': 0,
      'iv_load_policy': 3
    },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange,
      'onError': onPlayerError
    }
  });
};

function onPlayerReady(event) {
  updatePlayerUI();
  // If user is already on the game scene when player loads, autoplay!
  if (sceneActiveIndex === 3 && !isPlayerPlaying) {
    togglePlayPause();
  }
}


function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    fadeInYouTubeVolume(30, 3000);
  } else if (event.data === YT.PlayerState.ENDED) {
    playNextTrack();
  }
}

function onPlayerError(e) {
  console.warn("YouTube player skipped due to error...", e);
  playNextTrack();
}

function fadeInYouTubeVolume(targetVolume = 30, durationMs = 3000) {
  if (!ytPlayer || typeof ytPlayer.setVolume !== 'function') return;
  if (isPlayerMuted) {
    ytPlayer.mute();
  }
  
  if (volumeFadeInterval) {
    clearInterval(volumeFadeInterval);
  }
  
  ytPlayer.setVolume(0);
  const startTime = Date.now();
  
  volumeFadeInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / durationMs, 1);
    const currentVol = Math.floor(progress * targetVolume);
    
    if (ytPlayer && typeof ytPlayer.setVolume === 'function') {
      ytPlayer.setVolume(currentVol);
    }
    
    if (progress >= 1) {
      clearInterval(volumeFadeInterval);
      volumeFadeInterval = null;
    }
  }, 100);
}

function updatePlayerUI() {
  const ticker = document.getElementById("playlistTicker");
  const playBtn = document.getElementById("playlistPlayBtn");
  const muteBtn = document.getElementById("playlistMuteBtn");
  
  if (ticker) {
    const trackNum = (currentTrackIndex + 1) < 10 ? `0${currentTrackIndex + 1}` : `${currentTrackIndex + 1}`;
    ticker.textContent = `MONTH'S CHOICE // Track ${trackNum}: ${PLAYLIST[currentTrackIndex].title}`;
  }
  
  if (playBtn) {
    playBtn.textContent = isPlayerPlaying ? "⏸ Pause" : "▶ Play";
    playBtn.title = isPlayerPlaying ? "Pause Track" : "Play Track";
  }
  
  if (muteBtn) {
    muteBtn.textContent = isPlayerMuted ? "🔇 Unmute" : "🔊 Mute";
    muteBtn.title = isPlayerMuted ? "Unmute Audio" : "Mute Audio";
  }
}

function togglePlayPause() {
  if (!ytPlayer || typeof ytPlayer.playVideo !== 'function') return;
  
  if (isPlayerPlaying) {
    ytPlayer.pauseVideo();
    isPlayerPlaying = false;
  } else {
    ytPlayer.playVideo();
    isPlayerPlaying = true;
    
    // Auto mute the ambient synth drone to prevent clashing sounds
    const ambientBtn = document.getElementById("btnToggleSound");
    if (ambientBtn && ambientBtn.classList.contains("active")) {
      ambientBtn.click();
    }
  }
  updatePlayerUI();
}

function playNextTrack() {
  if (!ytPlayer || typeof ytPlayer.loadVideoById !== 'function') return;
  
  currentTrackIndex = (currentTrackIndex + 1) % PLAYLIST.length;
  ytPlayer.loadVideoById(PLAYLIST[currentTrackIndex].id);
  isPlayerPlaying = true;
  updatePlayerUI();
}

function toggleMutePlayer() {
  if (!ytPlayer || typeof ytPlayer.mute !== 'function') return;
  
  if (isPlayerMuted) {
    ytPlayer.unMute();
    isPlayerMuted = false;
  } else {
    ytPlayer.mute();
    isPlayerMuted = true;
  }
  updatePlayerUI();
}

// Bind Playlist Event Listeners
document.getElementById("playlistPlayBtn").addEventListener("click", () => {
  playClickSound();
  togglePlayPause();
});
document.getElementById("playlistNextBtn").addEventListener("click", () => {
  playClickSound();
  playNextTrack();
});
document.getElementById("playlistMuteBtn").addEventListener("click", () => {
  playClickSound();
  toggleMutePlayer();
});

document.getElementById("btnBackToMap").addEventListener("click", () => {
  playClickSound();
  if (isViewingWorldDetail) {
    currentChoiceIndex = findActiveWorldIndex();
    exitWorldDetail();
  } else if (currentDossierState !== "map") {
    executeDossierChoiceAction("map");
  } else {
    activateScene("menu");
  }
});


// Scene initialization on load
window.addEventListener("DOMContentLoaded", () => {
  activateScene("audio");
  sceneActiveIndex = 0;
  initYouTubePlayer();
});

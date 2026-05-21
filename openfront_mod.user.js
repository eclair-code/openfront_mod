// ==UserScript==
// @name         OpenFrontIO Mod v6.0 (Perfect Nuke Radar + Auto-Diplomat)
// @namespace    http://tampermonkey.net/
// @version      6.0
// @description  Radar Absolu de la mémoire, Auto-Expand, Nuke Spammer et Auto-Diplomate pour OpenFront.io
// @author       Antigravity
// @match        *://*.openfront.io/*
// @match        *://openfront.io/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log("[MOD] OpenFrontIO Mod v6.0 Initializing...");

    // ---------------------------------------------------------
    // 1. DATA STATE & CONFIG
    // ---------------------------------------------------------
    const state = {
        mapWidth: 0,
        mapHeight: 0,
        camera: { zoom: 1, tx: 0, ty: 0 },
        myTerritoryMarkers: [], 
        incomingNukes: [],      
        active: true,           
        autoExpand: false,
        autoDiplomat: false,
    };

    const NUKE_RADII = {
        "Atom Bomb": 30,
        "Hydrogen Bomb": 45,
        "MIRV": 18,
        "MIRV Warhead": 18
    };

    let gameSocket = null;
    let autoExpandInterval = null;

    // ---------------------------------------------------------
    // 2. GUI (Graphical User Interface)
    // ---------------------------------------------------------
    const panel = document.createElement("div");
    panel.id = "openfront-mod-panel";
    panel.style.position = "fixed";
    panel.style.top = "60px";
    panel.style.left = "10px";
    panel.style.zIndex = "10000";
    panel.style.background = "rgba(10, 10, 10, 0.9)";
    panel.style.color = "white";
    panel.style.border = "1px solid #444";
    panel.style.borderRadius = "8px";
    panel.style.padding = "10px";
    panel.style.fontFamily = "monospace";
    panel.style.width = "250px";
    panel.style.boxShadow = "0 4px 6px rgba(0,0,0,0.5)";
    
    panel.innerHTML = `
        <h3 id="mod-header" style="margin: 0 0 10px 0; color: #ffeb3b; text-align: center; font-size: 16px; cursor: move; user-select: none;" title="Glissez-moi !">OpenFront Mod v6.0</h3>
        <hr style="border-color: #333; margin: 5px 0;">
        
        <div style="margin-bottom: 5px; font-size: 14px;">
            <span>Radar Absolu:</span>
            <span id="mod-radar-status" style="float: right; color: lime; font-weight: bold;">VEILLE</span>
        </div>
        
        <div style="margin-bottom: 5px; font-size: 14px;">
            <label style="cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                <span>Auto-Expand (Spirale):</span>
                <input type="checkbox" id="mod-check-autoexpand" style="cursor: pointer; transform: scale(1.2);">
            </label>
        </div>

        <div style="margin-bottom: 10px; font-size: 14px;">
            <label style="cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                <span>Auto-Diplomate (Top 5):</span>
                <input type="checkbox" id="mod-check-autodiplomat" style="cursor: pointer; transform: scale(1.2);">
            </label>
        </div>
        
        <div style="margin-bottom: 10px; font-size: 12px; color: #aaa; text-align: center; border: 1px dashed #555; padding: 4px; border-radius: 4px;">
            <strong>Nuke Spammer</strong><br>
            Survolez la cible et appuyez sur <strong>[N]</strong>
        </div>
        
        <hr style="border-color: #333; margin: 5px 0 10px 0;">
        <button id="mod-btn-toggle" style="width: 100%; margin-bottom: 8px; padding: 6px; background: #222; color: white; border: 1px solid #555; border-radius: 4px; cursor: pointer; font-weight: bold;">Affichage On/Off (K)</button>
        <button id="mod-btn-mark" style="width: 100%; margin-bottom: 8px; padding: 6px; background: #222; color: white; border: 1px solid #555; border-radius: 4px; cursor: pointer; font-weight: bold;">Marquer Territoire (M)</button>
        <button id="mod-btn-clear" style="width: 100%; padding: 6px; background: #222; color: #ff5252; border: 1px solid #555; border-radius: 4px; cursor: pointer; font-weight: bold;">Effacer Points (L)</button>
    `;
    document.body.appendChild(panel);

    let isDragging = false, dragOffsetX = 0, dragOffsetY = 0;
    const header = document.getElementById("mod-header");
    header.addEventListener("mousedown", (e) => {
        isDragging = true;
        const rect = panel.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
    });
    document.addEventListener("mousemove", (e) => {
        if (isDragging) {
            panel.style.left = (e.clientX - dragOffsetX) + "px";
            panel.style.top = (e.clientY - dragOffsetY) + "px";
            panel.style.right = "auto";
        }
    });
    document.addEventListener("mouseup", () => isDragging = false);

    function updateGUI() {
        const radarStatus = document.getElementById("mod-radar-status");
        if (state.incomingNukes.length > 0) {
            radarStatus.textContent = "ALERTE !";
            radarStatus.style.color = "#ff5252";
            radarStatus.style.animation = "blink 1s infinite";
        } else {
            radarStatus.textContent = "VEILLE";
            radarStatus.style.color = "lime";
            radarStatus.style.animation = "none";
        }
    }

    const style = document.createElement("style");
    style.innerHTML = `@keyframes blink { 0% { opacity: 1; } 50% { opacity: 0; } 100% { opacity: 1; } }`;
    document.head.appendChild(style);


    // ---------------------------------------------------------
    // 3. NETWORK HOOKS (For Nuke Spammer & Map Sync)
    // ---------------------------------------------------------
    const origFetch = window.fetch;
    window.fetch = async function(...args) {
        const res = await origFetch.apply(this, args);
        try {
            if (typeof args[0] === 'string' && args[0].includes('/manifest.json')) {
                const clone = res.clone();
                clone.json().then(data => {
                    if (data && data.map && data.map.width) {
                        state.mapWidth = data.map.width;
                        state.mapHeight = data.map.height;
                        console.log(`[MOD] Map Dimensions Loaded: ${state.mapWidth}x${state.mapHeight}`);
                    }
                }).catch(e => {});
            }
        } catch(e) {}
        return res;
    };

    const origWS = window.WebSocket;
    class HookedWebSocket extends origWS {
        constructor(...args) {
            super(...args);
            gameSocket = this; // Save socket for outgoing intents
        }
    }
    window.WebSocket = HookedWebSocket;

    function sendRawIntent(intentObj) {
        if (gameSocket && gameSocket.readyState === WebSocket.OPEN) {
            gameSocket.send(JSON.stringify(intentObj));
        }
    }

    // ---------------------------------------------------------
    // 4. THE HOLY GRAIL: MEMORY EXTRACTION (Radar Absolu)
    // ---------------------------------------------------------
    function extractNukesFromMemory() {
        const lb = document.querySelector('leader-board');
        const game = lb ? lb.game : null;
        if (!game || typeof game.width !== 'function' || typeof game.units !== 'function') return;

        const gm = typeof game.map === 'function' ? game.map() : game;
        if (!gm || typeof gm.x !== 'function') return;

        const activeNukes = [];
        const units = game.units();
        
        for (const unit of units) {
            if (typeof unit.isActive === 'function' && !unit.isActive()) continue;
            
            const t = typeof unit.type === 'function' ? unit.type() : null;
            if (t && NUKE_RADII[t]) {
                const targetTile = typeof unit.targetTile === 'function' ? unit.targetTile() : null;
                if (targetTile !== null && targetTile !== undefined) {
                    const worldX = gm.x(targetTile);
                    const worldY = gm.y(targetTile);
                    activeNukes.push({
                        x: worldX,
                        y: worldY,
                        radius: NUKE_RADII[t],
                        type: t
                    });
                }
            }
        }
        
        state.incomingNukes = activeNukes;
        updateGUI();
    }


    // ---------------------------------------------------------
    // 5. AUTO-DIPLOMAT LOGIC
    // ---------------------------------------------------------
    document.getElementById("mod-check-autodiplomat").addEventListener("change", (e) => {
        state.autoDiplomat = e.target.checked;
        console.log(`[MOD] Auto-Diplomat ${state.autoDiplomat ? 'ACTIVATED' : 'DEACTIVATED'}`);
    });

    setInterval(() => {
        if (!state.autoDiplomat) return;

        const lb = document.querySelector('leader-board');
        if (!lb || !lb.players) return;

        // Get Top 5 player names
        const top5Names = lb.players.slice(0, 5).map(p => {
            if (p.player && typeof p.player.displayName === 'function') return p.player.displayName();
            return p.name;
        }).filter(n => n);

        const eventsDisplay = document.querySelector('events-display');
        if (!eventsDisplay) return;

        // Find buttons in the notification panel
        const buttons = eventsDisplay.querySelectorAll('button');
        const notificationDivs = new Set();
        
        // Group buttons by their notification container (each event is a table row)
        buttons.forEach(b => {
            const wrapper = b.closest('tr');
            if (wrapper) notificationDivs.add(wrapper);
        });

        notificationDivs.forEach(wrapper => {
            const textContent = wrapper.innerText || wrapper.textContent || "";
            
            // Heuristic to find Accept and Reject buttons in the same notification
            // Accept is usually `.btn` (without info/gray modifiers)
            const acceptBtn = Array.from(wrapper.querySelectorAll('button')).find(b => 
                b.className.includes('btn') && !b.className.includes('btn-info') && !b.className.includes('btn-gray')
            );
            // Reject is usually `.btn-info`
            const rejectBtn = Array.from(wrapper.querySelectorAll('button')).find(b => 
                b.className.includes('btn-info')
            );

            // If this is indeed an alliance/diplomacy request
            if (acceptBtn && rejectBtn && textContent) {
                // Check if any Top 5 name is inside the notification text
                const isTop5 = top5Names.some(name => textContent.includes(name));
                
                if (isTop5) {
                    console.log("[MOD] Auto-Diplomat: Alliance Accepted (Top 5 Player)");
                    acceptBtn.click();
                } else {
                    console.log("[MOD] Auto-Diplomat: Alliance Rejected (Weak Player)");
                    rejectBtn.click();
                }
            }
        });
    }, 1500); // Check every 1.5 seconds


    // ---------------------------------------------------------
    // 6. AUTO-EXPAND LOGIC
    // ---------------------------------------------------------
    document.getElementById("mod-check-autoexpand").addEventListener("change", (e) => {
        state.autoExpand = e.target.checked;
        if (state.autoExpand) {
            console.log("[MOD] Auto-Expand ACTIVATED");
            autoExpandInterval = setInterval(() => {
                sendRawIntent({
                    type: "attack",
                    targetID: null,
                    troops: 50
                });
            }, 5000);
        } else {
            console.log("[MOD] Auto-Expand DEACTIVATED");
            if (autoExpandInterval) clearInterval(autoExpandInterval);
        }
    });

    // ---------------------------------------------------------
    // 7. CAMERA HOOK & COORDS
    // ---------------------------------------------------------
    function getTransformHandler() {
        const el = document.querySelector('build-menu') || document.querySelector('spawn-timer');
        return el ? el.transformHandler : null;
    }

    function worldToScreen(x, y) {
        const th = getTransformHandler();
        return th && typeof th.worldToScreenCoordinates === 'function' ? th.worldToScreenCoordinates({ x: x, y: y }) : { x: 0, y: 0 };
    }

    function screenToWorld(x, y) {
        const th = getTransformHandler();
        return th && typeof th.screenToWorldCoordinates === 'function' ? th.screenToWorldCoordinates(x, y) : { x: 0, y: 0 };
    }

    // ---------------------------------------------------------
    // 8. OVERLAY & RENDERING
    // ---------------------------------------------------------
    const overlayCanvas = document.createElement("canvas");
    overlayCanvas.id = "mod-overlay";
    overlayCanvas.style.position = "absolute";
    overlayCanvas.style.top = "0";
    overlayCanvas.style.left = "0";
    overlayCanvas.style.width = "100%";
    overlayCanvas.style.height = "100%";
    overlayCanvas.style.pointerEvents = "none";
    overlayCanvas.style.zIndex = "9998";
    document.body.appendChild(overlayCanvas);
    
    const ctx = overlayCanvas.getContext("2d");

    function getUIState() {
        const cp = document.querySelector('control-panel') || document.querySelector('build-menu');
        return cp ? cp.uiState : null;
    }

    function isAimingNuke() {
        const uiState = getUIState();
        if (!uiState) return false;
        const gs = uiState.ghostStructure;
        return gs === "Atom Bomb" || gs === "Hydrogen Bomb" || gs === "MIRV";
    }

    function renderLoop() {
        requestAnimationFrame(renderLoop);
        
        // --- Read memory every frame! ---
        extractNukesFromMemory();
        
        if (overlayCanvas.width !== window.innerWidth || overlayCanvas.height !== window.innerHeight) {
            overlayCanvas.width = window.innerWidth;
            overlayCanvas.height = window.innerHeight;
        }
        
        const ctx = overlayCanvas.getContext("2d");
        ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

        if (!state.active) {
            return;
        }

        // Markers
        ctx.fillStyle = "rgba(0, 255, 0, 0.8)";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        state.myTerritoryMarkers.forEach(marker => {
            const screenPos = worldToScreen(marker.x, marker.y);
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "black";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillText(marker.label, screenPos.x, screenPos.y - 12);
        });

        // Nukes
        const now = Date.now();
        const blink = Math.floor(now / 250) % 2 === 0;
        
        const p1 = worldToScreen(0, 0);
        const p2 = worldToScreen(1, 0);
        const pixelsPerTile = Math.sqrt((p2.x - p1.x)**2 + (p2.y - p1.y)**2) || 1;

        state.incomingNukes.forEach(nuke => {
            const screenPos = worldToScreen(nuke.x, nuke.y);
            
            ctx.fillStyle = blink ? "rgba(255, 0, 0, 0.9)" : "rgba(255, 255, 0, 0.9)";
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, 10, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = "white";
            ctx.font = "bold 16px Arial";
            ctx.fillText(`! ${nuke.type.toUpperCase()} !`, screenPos.x, screenPos.y - 15);
            
            const screenRadius = nuke.radius * pixelsPerTile;
            
            ctx.strokeStyle = blink ? "rgba(255, 0, 0, 0.6)" : "rgba(255, 100, 0, 0.6)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.fillStyle = "rgba(255, 0, 0, 0.15)";
            ctx.fill();
        });

        // SAM Hover Calculation
        if (isAimingNuke()) {
            const worldMouse = screenToWorld(mouseX, mouseY);
            if (worldMouse) {
                let totalInterceptions = 0;
                const game = getGameInstance();
                const gm = game && typeof game.map === 'function' ? game.map() : game;
                const config = game && typeof game.config === 'function' ? game.config() : null;
                const myId = game && typeof game.player === 'function' && game.player() ? game.player().id() : null;
                
                if (game && typeof game.units === 'function' && gm && typeof gm.x === 'function') {
                    const units = game.units();
                    for (const unit of units) {
                        if (typeof unit.type === 'function' && unit.type() === "SAM Launcher") {
                            const owner = typeof unit.owner === 'function' ? unit.owner() : null;
                            if (owner && owner.id() === myId) continue;
                            
                            const tile = typeof unit.tile === 'function' ? unit.tile() : null;
                            if (tile !== null) {
                                const sx = gm.x(tile);
                                const sy = gm.y(tile);
                                const dx = sx - worldMouse.x;
                                const dy = sy - worldMouse.y;
                                const dist = Math.sqrt(dx*dx + dy*dy);
                                
                                const level = typeof unit.level === 'function' ? unit.level() : 1;
                                const range = config && typeof config.samRange === 'function' ? config.samRange(level) : (150 - 480/(level+5));
                                
                                if (dist <= range) {
                                    totalInterceptions += level;
                                    
                                    const samScreen = worldToScreen(sx, sy);
                                    ctx.beginPath();
                                    ctx.arc(samScreen.x, samScreen.y, range * pixelsPerTile, 0, Math.PI * 2);
                                    ctx.fillStyle = "rgba(255, 0, 0, 0.1)";
                                    ctx.fill();
                                    ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
                                    ctx.lineWidth = 1;
                                    ctx.stroke();
                                }
                            }
                        }
                    }
                    
                    const text = `Nukes requises : ${totalInterceptions + 1} (${totalInterceptions} intercep.)`;
                    ctx.font = "bold 14px Arial";
                    const tw = ctx.measureText(text).width;
                    
                    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
                    ctx.fillRect(mouseX + 15, mouseY + 15, tw + 20, 30);
                    
                    ctx.fillStyle = totalInterceptions > 0 ? "#ff4444" : "#44ff44";
                    ctx.textAlign = "left";
                    ctx.fillText(text, mouseX + 25, mouseY + 35);
                }
            }
        }
    }
    renderLoop();

    // ---------------------------------------------------------
    // 9. USER INPUTS
    // ---------------------------------------------------------
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    document.addEventListener("mousemove", e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    document.addEventListener("keydown", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        
        if (e.key === "K" || e.key === "k") state.active = !state.active;
        
        if (e.key === "M" || e.key === "m") {
            if (!state.active) return;
            const worldPos = screenToWorld(mouseX, mouseY);
            state.myTerritoryMarkers.push({
                x: worldPos.x,
                y: worldPos.y,
                label: `Base ${state.myTerritoryMarkers.length + 1}`
            });
        }
        if (e.key === "L" || e.key === "l") state.myTerritoryMarkers = [];
        
        if ((e.key === "N" || e.key === "n") && state.mapWidth > 0) {
            const worldPos = screenToWorld(mouseX, mouseY);
            const tileId = Math.round(worldPos.y) * state.mapWidth + Math.round(worldPos.x);
            console.log(`[MOD] Nuke Spammer Triggered at Tile ${tileId}`);
            for (let i = 0; i < 20; i++) {
                sendRawIntent({
                    type: "build_unit",
                    unit: "Atom Bomb",
                    tile: tileId
                });
            }
        }
    });

    document.getElementById("mod-btn-toggle").addEventListener("click", () => state.active = !state.active);
    document.getElementById("mod-btn-mark").addEventListener("click", () => {
        if (!state.active) return;
        const worldPos = screenToWorld(mouseX, mouseY);
        state.myTerritoryMarkers.push({ x: worldPos.x, y: worldPos.y, label: `Base ${state.myTerritoryMarkers.length + 1}` });
    });
    document.getElementById("mod-btn-clear").addEventListener("click", () => state.myTerritoryMarkers = []);

})();

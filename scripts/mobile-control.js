 class MobileTokenControl {
    static init() {
        Hooks.once("ready", () => {
            console.log("Foundry ist bereit, MobileTokenControl wird geladen...");
            if (MobileTokenControl.isMobile()) {
                if (canvas.ready) {
                    MobileTokenControl.applyMobileView();
                } else {
                    Hooks.on("canvasReady", () => MobileTokenControl.applyMobileView());
                }
            }
        });
    }

    static isMobile() {
        return /Mobi|Android|iPad|iPhone/i.test(navigator.userAgent);
    }

    static applyMobileView() {
        console.log("Applying mobile token view...");
        document.getElementById("ui-left")?.style.setProperty("display", "none", "important");
        document.getElementById("ui-right")?.style.setProperty("display", "none", "important");
        document.getElementById("ui-bottom")?.style.setProperty("display", "none", "important");
        document.getElementById("board")?.style.setProperty("display", "block", "important");

        MobileTokenControl.createTokenSelector();
        MobileTokenControl.createMovementControls();
        MobileTokenControl.createZoomControls();
        MobileTokenControl.centerOnToken();
        MobileTokenControl.applyDisplaySize();
        MobileTokenControl.preventDragDrop();
    }

    static createTokenSelector() {
        const user = game.user;
        if (!user) return;

        const tokens = canvas.tokens.placeables.filter(token => 
            token.actor && token.actor.testUserPermission(user, "OWNER")
        );

        if (tokens.length === 0) return;

        const selectorContainer = document.createElement("div");
        selectorContainer.id = "token-selector-container";
        selectorContainer.style.position = "fixed";
        selectorContainer.style.bottom = "20vh";
        selectorContainer.style.left = "50%";
        selectorContainer.style.transform = "translateX(-50%)";
        selectorContainer.style.padding = "10px";
        selectorContainer.style.background = "rgba(0, 0, 0, 0.7)";
        selectorContainer.style.color = "white";
        selectorContainer.style.borderRadius = "10px";
        selectorContainer.style.zIndex = "1000";
        selectorContainer.style.display = "flex";
        selectorContainer.style.gap = "10px";

        tokens.forEach(token => {
            const tokenContainer = document.createElement("div");
            tokenContainer.style.display = "flex";
            tokenContainer.style.flexDirection = "column";
            tokenContainer.style.alignItems = "center";
            tokenContainer.style.cursor = "pointer";

            const img = document.createElement("img");
            img.src = token.document.texture.src;
            img.style.width = "50px";
            img.style.height = "50px";
            img.style.borderRadius = "50%";
            img.style.border = "2px solid transparent";

            const label = document.createElement("div");
            label.innerText = token.name;
            label.style.color = "white";
            label.style.fontSize = "12px";
            label.style.textAlign = "center";
            label.style.marginTop = "5px";

            img.addEventListener("click", () => {
                window.selectedToken = token;
                document.querySelectorAll("#token-selector-container img").forEach(img => img.style.border = "2px solid transparent");
                img.style.border = "2px solid yellow"; // Hervorhebung
                MobileTokenControl.centerOnToken();
            });

            tokenContainer.appendChild(img);
            tokenContainer.appendChild(label);
            selectorContainer.appendChild(tokenContainer);
        });

        document.body.appendChild(selectorContainer);
    }

    static createMovementControls() {
        if (document.getElementById("mobile-controls")) return;

        const controls = document.createElement("div");
        controls.id = "mobile-controls";
        controls.style.position = "fixed";
        controls.style.bottom = "10px";
        controls.style.left = "50%";
        controls.style.transform = "translateX(-50%)";
        controls.style.display = "grid";
        controls.style.gridTemplateColumns = "repeat(3, 50px)";
        controls.style.gridTemplateRows = "repeat(3, 50px)";
        controls.style.gap = "5px";
        document.body.appendChild(controls);

        const directions = [
            { name: "↖", x: -1, y: -1 },
            { name: "↑", x: 0, y: -1 },
            { name: "↗", x: 1, y: -1 },
            { name: "←", x: -1, y: 0 },
            { name: "•", x: 0, y: 0 },
            { name: "→", x: 1, y: 0 },
            { name: "↙", x: -1, y: 1 },
            { name: "↓", x: 0, y: 1 },
            { name: "↘", x: 1, y: 1 }
        ];

        directions.forEach(dir => {
            const button = document.createElement("button");
            button.innerText = dir.name;
            button.style.width = "50px";
            button.style.height = "50px";
            button.addEventListener("click", () => MobileTokenControl.moveToken(dir.x, dir.y));
            controls.appendChild(button);
        });
    }

    static createZoomControls() {
        if (document.getElementById("zoom-controls")) return;

        const zoomControls = document.createElement("div");
        zoomControls.id = "zoom-controls";
        zoomControls.style.position = 'fixed';
        zoomControls.style.bottom = '10px'; // Position next to movement controls
        zoomControls.style.left = 'calc(50% + 165px)'; // Position to the right of movement controls
        zoomControls.style.transform = 'translateX(-50%)';
        zoomControls.style.display = 'flex';
        zoomControls.style.flexDirection = 'column';
        zoomControls.style.gap = '5px';

        const zoomInButton = document.createElement('button');
        zoomInButton.innerText = '+';
        zoomInButton.style.width = '50px';
        zoomInButton.style.height = '50px';
        zoomInButton.addEventListener('click', () => MobileTokenControl.zoomCanvas(1.2)); // Zoom in by a factor of 1.2

        const zoomOutButton = document.createElement('button');
        zoomOutButton.innerText = '-';
        zoomOutButton.style.width = '50px';
        zoomOutButton.style.height = '50px';
        zoomOutButton.addEventListener('click', () => MobileTokenControl.zoomCanvas(0.8)); // Zoom out by a factor of 0.8

        zoomControls.appendChild(zoomInButton);
        zoomControls.appendChild(zoomOutButton);

        document.body.appendChild(zoomControls);
    }

    static zoomCanvas(factor) {
        const scale = canvas.stage.scale.x * factor;
        canvas.stage.scale.set(scale, scale);
        canvas.pan({ scale });
    }

    static async moveToken(x, y) {
        const token = window.selectedToken;
        if (!token) {
            console.warn('Kein Token ausgewählt!');
            ui.notifications.warn('Bitte wähle ein Token aus!');
            return;
        }

        const newX = token.x + x * canvas.grid.size;
        const newY = token.y + y * canvas.grid.size;

        // Alternative Kollisionserkennung mit aktualisierter Methode
        const ray = new Ray(token.center, { x: newX + token.w / 2, y: newY + token.h / 2 });

        // Verwenden der neuen Polygon-Technologie, um Kollision zu überprüfen
        const hasCollision = canvas.walls.checkCollision(ray, { mode: 'move', type: 'sight' });

        console.log('TestCollision Check:', { from: token.center, to: { x: newX, y: newY }, result: hasCollision });

        if (hasCollision) {
            console.warn('Bewegung blockiert: Eine Wand oder Tür ist im Weg!');
            ui.notifications.warn('Du kannst hier nicht durch!');
            return;
        }

        await token.document.update({ x: newX, y: newY });
        MobileTokenControl.centerOnToken();
    }

    static centerOnToken() {
        const token = window.selectedToken;
        if (!token) {
            console.warn('Kein Token ausgewählt!');
            ui.notifications.warn('Bitte wähle ein Token aus!');
            return;
        }

        // Setze den aktiven Token und aktualisiere das Sichtfeld
        canvas.tokens.controlled.forEach(t => t.setTarget(false));
        token.control({releaseOthers: true})

        canvas.animatePan({ x: token.x, y: token.y});
    }

    static applyDisplaySize() {
        const board = document.getElementById('board');
        board.style.position = 'fixed';
        board.style.top = '10%';
        board.style.left = '0';
        board.style.width = '100%';
        board.style.height = '80%';
        board.style.zIndex = '2'; // Ensure it is on top of other elements
        board.style.overflow = 'hidden'; // Hide overflow
        board.style.clipPath = 'inset(35% 0 35% 0)'; // Show only the center
    }

    static preventDragDrop() {
        canvas.tokens.placeables.forEach(token => {
            token.interactive = false;
            token.buttonMode = false;
        });
    }
}

// MobileTokenControl global verfügbar machen
window.MobileTokenControl = MobileTokenControl;

// Direkt nach Laden initialisieren
Hooks.once("ready", () => {
    console.log("Foundry ist bereit, MobileTokenControl starten...");
    MobileTokenControl.init();
    if (MobileTokenControl.isMobile()) {
        setTimeout(() => {
            MobileTokenControl.applyMobileView();
            MobileTokenControl.applyDisplaySize();
        }, 100);
    }
});

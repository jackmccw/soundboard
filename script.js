document.addEventListener("DOMContentLoaded", () => {
    // Covers buttons on both boards, so only one sound plays at a time across the page
    const buttons = document.querySelectorAll(".sound-btn");

    // --- Web Audio setup: sounds are downloaded + decoded up front for instant playback ---
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = AudioCtx ? new AudioCtx() : null;
    const buffers = new Map(); // soundPath -> decoded AudioBuffer

    // Promise wrapper so older Safari (callback-only decodeAudioData) also works
    function decode(arrayBuffer) {
        return new Promise((resolve, reject) => {
            const result = ctx.decodeAudioData(arrayBuffer, resolve, reject);
            if (result && typeof result.then === "function") result.then(resolve, reject);
        });
    }

    // Preload every sound as soon as the page opens
    if (ctx) {
        const paths = new Set([...buttons].map(b => b.getAttribute("data-sound")).filter(Boolean));
        paths.forEach(path => {
            fetch(path)
                .then(res => {
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return res.arrayBuffer();
                })
                .then(decode)
                .then(buffer => buffers.set(path, buffer))
                .catch(err => console.warn(`Preload failed for ${path} (will fall back to normal playback):`, err));
        });
    }

    // --- Playback state ---
    let active = null;      // { stop(), button }
    let animationFrameId = null;
    let playToken = 0;      // guards against stale "ended" events

    function setProgress(button, percentage) {
        const p = Math.max(0, Math.min(100, percentage));
        button.style.background = `linear-gradient(to right, var(--btn-glow) ${p}%, var(--btn-bg) ${p}%)`;
    }

    function resetButton(button) {
        cancelAnimationFrame(animationFrameId);
        button.style.background = "";
    }

    function stopActive() {
        if (active) {
            active.stop();
            resetButton(active.button);
            active = null;
        }
    }

    // Instant path: play a pre-decoded buffer
    function playBuffer(button, buffer, token) {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);

        const startTime = ctx.currentTime;
        source.start(0);

        active = { button, stop: () => { try { source.stop(); } catch (e) {} } };

        function updateProgress() {
            if (token !== playToken) return;
            setProgress(button, ((ctx.currentTime - startTime) / buffer.duration) * 100);
            animationFrameId = requestAnimationFrame(updateProgress);
        }
        animationFrameId = requestAnimationFrame(updateProgress);

        source.onended = () => {
            if (token !== playToken) return; // stopped because another button was pressed
            resetButton(button);
            active = null;
        };
    }

    // Fallback path: sound hasn't finished preloading yet (or Web Audio unavailable)
    function playElement(button, soundPath, token) {
        const audio = new Audio(soundPath);
        active = { button, stop: () => audio.pause() };

        function updateProgress() {
            if (token !== playToken) return;
            if (audio.duration) setProgress(button, (audio.currentTime / audio.duration) * 100);
            if (!audio.paused && !audio.ended) {
                animationFrameId = requestAnimationFrame(updateProgress);
            }
        }

        audio.play()
            .then(() => { animationFrameId = requestAnimationFrame(updateProgress); })
            .catch(error => console.error("Audio playback failed:", error));

        audio.addEventListener("ended", () => {
            if (token !== playToken) return;
            resetButton(button);
            active = null;
        });
    }

    buttons.forEach(button => {
        button.addEventListener("click", () => {
            const soundPath = button.getAttribute("data-sound");
            if (!soundPath) return;

            // Browsers (esp. iPhone) keep audio locked until the first tap
            if (ctx && ctx.state === "suspended") ctx.resume();

            stopActive();
            const token = ++playToken;

            const buffer = buffers.get(soundPath);
            if (ctx && buffer) {
                playBuffer(button, buffer, token);
            } else {
                playElement(button, soundPath, token);
            }
        });
    });
});

document.addEventListener("DOMContentLoaded", () => {
    // Covers buttons on both boards, so only one sound plays at a time across the page
    const buttons = document.querySelectorAll(".sound-btn");
    let activeAudio = null;
    let activeBtn = null;
    let animationFrameId = null;

    buttons.forEach(button => {
        button.addEventListener("click", () => {
            // 1. If another sound is currently playing, stop it and reset its style
            if (activeAudio) {
                activeAudio.pause();
                cancelAnimationFrame(animationFrameId);
                if (activeBtn) activeBtn.style.background = "";
            }

            const soundPath = button.getAttribute("data-sound");

            if (soundPath) {
                const audio = new Audio(soundPath);
                activeAudio = audio;
                activeBtn = button;

                // 2. Continuous progress loop function
                function updateProgress() {
                    if (audio.duration) {
                        const percentage = (audio.currentTime / audio.duration) * 100;

                        // Fill uses the button's glow colour over its board's base colour
                        button.style.background = `linear-gradient(to right, var(--btn-glow) ${percentage}%, var(--btn-bg) ${percentage}%)`;
                    }

                    if (!audio.paused && !audio.ended) {
                        animationFrameId = requestAnimationFrame(updateProgress);
                    }
                }

                // 3. Audio Triggers
                audio.currentTime = 0;
                audio.play()
                    .then(() => {
                        animationFrameId = requestAnimationFrame(updateProgress);
                    })
                    .catch(error => {
                        console.error("Audio playback failed:", error);
                    });

                // 4. Reset button background when audio finishes naturally
                audio.addEventListener("ended", () => {
                    cancelAnimationFrame(animationFrameId);
                    button.style.background = "";
                    if (activeBtn === button) {
                        activeAudio = null;
                        activeBtn = null;
                    }
                });
            }
        });
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const buttons = document.querySelectorAll(".sound-btn");
    let activeAudio = null;
    let activeBtn = null;
    let animationFrameId = null;

    buttons.forEach(button => {
        button.addEventListener("click", () => {
            // 1. If another sound is currently animating, reset its style immediately
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
                        // Calculate percentage of song played (0 to 100)
                        const percentage = (audio.currentTime / audio.duration) * 100;
                        
                        // Move the gradient line from left (0%) to right (100%)
                        button.style.background = `linear-gradient(to right, var(--btn-glow) ${percentage}%, #1e1e1e ${percentage}%)`;
                    }

                    // Keep loops running while audio is playing
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

                // 4. Reset button background clean when audio finishes naturally
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

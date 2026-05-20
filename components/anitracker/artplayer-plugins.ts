"use client"

// Auto-skip intro/outro plugin for ArtPlayer
// Inspired by JustAnime's implementation

export interface SkipConfig {
  intro?: { start: number; end: number }
  outro?: { start: number; end: number }
  autoSkipIntro?: boolean
  autoSkipOutro?: boolean
}

export function artplayerAutoSkip(config: SkipConfig) {
  return (art: any) => {
    const { intro, outro, autoSkipIntro = false, autoSkipOutro = false } = config

    let introSkipped = false
    let outroSkipped = false

    // Create skip button element
    const createSkipButton = (text: string, onClick: () => void) => {
      const button = document.createElement("div")
      button.className = "art-skip-button"
      button.innerHTML = `
        <div style="
          position: absolute;
          right: 20px;
          bottom: 80px;
          padding: 10px 20px;
          background: rgba(220, 38, 38, 0.9);
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 8px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          z-index: 50;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
          backdrop-filter: blur(4px);
        " onmouseover="this.style.background='rgba(220, 38, 38, 1)'" onmouseout="this.style.background='rgba(220, 38, 38, 0.9)'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 4 15 12 5 20 5 4"></polygon>
            <line x1="19" y1="5" x2="19" y2="19"></line>
          </svg>
          ${text}
        </div>
      `
      button.onclick = onClick
      return button
    }

    // Handle time updates
    art.on("video:timeupdate", () => {
      const currentTime = art.currentTime
      const container = art.template.$player

      // Check intro
      if (intro && intro.start !== undefined && intro.end !== undefined) {
        const isInIntro = currentTime >= intro.start && currentTime < intro.end

        if (isInIntro) {
          // Auto-skip if enabled
          if (autoSkipIntro && !introSkipped) {
            art.currentTime = intro.end
            introSkipped = true
            art.notice.show = "Intro pulada automaticamente"
            return
          }

          // Show skip button
          if (!container.querySelector(".art-skip-intro")) {
            const skipBtn = createSkipButton("Pular Intro", () => {
              art.currentTime = intro.end
              introSkipped = true
              const btn = container.querySelector(".art-skip-intro")
              if (btn) btn.remove()
            })
            skipBtn.classList.add("art-skip-intro")
            container.appendChild(skipBtn)
          }
        } else {
          // Remove skip button when out of intro
          const existingBtn = container.querySelector(".art-skip-intro")
          if (existingBtn) existingBtn.remove()
          
          // Reset intro skipped flag when before intro
          if (currentTime < intro.start) {
            introSkipped = false
          }
        }
      }

      // Check outro
      if (outro && outro.start !== undefined && outro.end !== undefined) {
        const isInOutro = currentTime >= outro.start && currentTime < outro.end

        if (isInOutro) {
          // Auto-skip if enabled
          if (autoSkipOutro && !outroSkipped) {
            art.currentTime = outro.end
            outroSkipped = true
            art.notice.show = "Outro pulada automaticamente"
            return
          }

          // Show skip button
          if (!container.querySelector(".art-skip-outro")) {
            const skipBtn = createSkipButton("Pular Outro", () => {
              art.currentTime = outro.end
              outroSkipped = true
              const btn = container.querySelector(".art-skip-outro")
              if (btn) btn.remove()
            })
            skipBtn.classList.add("art-skip-outro")
            container.appendChild(skipBtn)
          }
        } else {
          // Remove skip button when out of outro
          const existingBtn = container.querySelector(".art-skip-outro")
          if (existingBtn) existingBtn.remove()
          
          // Reset outro skipped flag when before outro
          if (currentTime < outro.start) {
            outroSkipped = false
          }
        }
      }
    })

    // Cleanup on destroy
    art.on("destroy", () => {
      const container = art.template.$player
      const introBtn = container?.querySelector(".art-skip-intro")
      const outroBtn = container?.querySelector(".art-skip-outro")
      if (introBtn) introBtn.remove()
      if (outroBtn) outroBtn.remove()
    })

    return {
      name: "artplayerAutoSkip",
    }
  }
}

// Chapter highlight plugin - shows intro/outro on progress bar
export function artplayerChapterHighlight(config: SkipConfig) {
  return (art: any) => {
    const { intro, outro } = config

    art.on("ready", () => {
      const duration = art.duration
      if (!duration) return

      const progress = art.template.$progress

      // Create chapter markers
      const createMarker = (start: number, end: number, type: string) => {
        const marker = document.createElement("div")
        const leftPercent = (start / duration) * 100
        const widthPercent = ((end - start) / duration) * 100

        marker.className = `art-chapter-${type}`
        marker.style.cssText = `
          position: absolute;
          left: ${leftPercent}%;
          width: ${widthPercent}%;
          height: 100%;
          background: ${type === "intro" ? "rgba(239, 68, 68, 0.5)" : "rgba(168, 85, 247, 0.5)"};
          pointer-events: none;
          z-index: 1;
        `
        return marker
      }

      if (intro && intro.start !== undefined && intro.end !== undefined) {
        const marker = createMarker(intro.start, intro.end, "intro")
        progress?.appendChild(marker)
      }

      if (outro && outro.start !== undefined && outro.end !== undefined) {
        const marker = createMarker(outro.start, outro.end, "outro")
        progress?.appendChild(marker)
      }
    })

    return {
      name: "artplayerChapterHighlight",
    }
  }
}

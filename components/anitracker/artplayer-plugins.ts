"use client"

// ArtPlayer Plugins - Based on JustAnime implementation
// https://github.com/JustAnimeCore/JustAnime

export interface SkipConfig {
  intro?: { start: number; end: number } | null
  outro?: { start: number; end: number } | null
  autoSkipIntro?: boolean
  autoSkipOutro?: boolean
}

// Auto-skip intro/outro plugin
export function artplayerAutoSkip(config: SkipConfig) {
  return (art: any) => {
    const { intro, outro, autoSkipIntro = false, autoSkipOutro = false } = config

    let introSkipped = false
    let outroSkipped = false

    const createSkipButton = (text: string, onClick: () => void) => {
      const button = document.createElement("div")
      button.innerHTML = `
        <div class="art-skip-btn" style="
          position: absolute;
          right: 20px;
          bottom: 80px;
          padding: 12px 24px;
          background: linear-gradient(135deg, rgba(220, 38, 38, 0.95), rgba(185, 28, 28, 0.95));
          border: 1px solid rgba(255, 255, 255, 0.2);
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
          backdrop-filter: blur(8px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 4 15 12 5 20 5 4"></polygon>
            <line x1="19" y1="5" x2="19" y2="19"></line>
          </svg>
          ${text}
        </div>
      `
      const btn = button.querySelector(".art-skip-btn") as HTMLElement
      if (btn) {
        btn.onmouseenter = () => {
          btn.style.transform = "scale(1.05)"
          btn.style.boxShadow = "0 6px 16px rgba(0,0,0,0.4)"
        }
        btn.onmouseleave = () => {
          btn.style.transform = "scale(1)"
          btn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)"
        }
      }
      button.onclick = onClick
      return button
    }

    art.on("video:timeupdate", () => {
      const currentTime = art.currentTime
      const container = art.template.$player

      // Check intro
      if (intro && intro.start !== undefined && intro.end !== undefined && intro.end > intro.start) {
        const isInIntro = currentTime >= intro.start && currentTime < intro.end

        if (isInIntro) {
          if (autoSkipIntro && !introSkipped) {
            art.currentTime = intro.end
            introSkipped = true
            art.notice.show = "Intro pulada"
            return
          }

          if (!container.querySelector(".art-skip-intro")) {
            const skipBtn = createSkipButton("Pular Intro", () => {
              art.currentTime = intro.end
              introSkipped = true
              container.querySelector(".art-skip-intro")?.remove()
            })
            skipBtn.classList.add("art-skip-intro")
            container.appendChild(skipBtn)
          }
        } else {
          container.querySelector(".art-skip-intro")?.remove()
          if (currentTime < intro.start) introSkipped = false
        }
      }

      // Check outro
      if (outro && outro.start !== undefined && outro.end !== undefined && outro.end > outro.start) {
        const isInOutro = currentTime >= outro.start && currentTime < outro.end

        if (isInOutro) {
          if (autoSkipOutro && !outroSkipped) {
            art.currentTime = outro.end
            outroSkipped = true
            art.notice.show = "Outro pulada"
            return
          }

          if (!container.querySelector(".art-skip-outro")) {
            const skipBtn = createSkipButton("Pular Outro", () => {
              art.currentTime = outro.end
              outroSkipped = true
              container.querySelector(".art-skip-outro")?.remove()
            })
            skipBtn.classList.add("art-skip-outro")
            container.appendChild(skipBtn)
          }
        } else {
          container.querySelector(".art-skip-outro")?.remove()
          if (currentTime < outro.start) outroSkipped = false
        }
      }
    })

    art.on("destroy", () => {
      const container = art.template.$player
      container?.querySelector(".art-skip-intro")?.remove()
      container?.querySelector(".art-skip-outro")?.remove()
    })

    return { name: "artplayerAutoSkip" }
  }
}

// Chapter highlight on progress bar
export function artplayerChapterHighlight(config: SkipConfig) {
  return (art: any) => {
    const { intro, outro } = config

    const applyStyles = () => {
      const duration = art.duration
      if (!duration) return

      const progress = art.template.$progress
      if (!progress) return

      // Remove existing markers
      progress.querySelectorAll(".art-chapter-marker").forEach((el: Element) => el.remove())

      const createMarker = (start: number, end: number, type: string) => {
        const marker = document.createElement("div")
        const leftPercent = (start / duration) * 100
        const widthPercent = ((end - start) / duration) * 100

        marker.className = `art-chapter-marker art-chapter-${type}`
        marker.style.cssText = `
          position: absolute;
          left: ${leftPercent}%;
          width: ${widthPercent}%;
          height: 100%;
          background: ${type === "intro" ? "rgba(253, 210, 83, 0.7)" : "rgba(253, 210, 83, 0.7)"};
          pointer-events: none;
          z-index: 1;
          border-radius: 2px;
        `
        marker.title = type === "intro" ? "Intro" : "Outro"
        return marker
      }

      if (intro && intro.start !== undefined && intro.end !== undefined && intro.end > intro.start) {
        progress.appendChild(createMarker(intro.start, intro.end, "intro"))
      }

      if (outro && outro.start !== undefined && outro.end !== undefined && outro.end > outro.start) {
        progress.appendChild(createMarker(outro.start, outro.end, "outro"))
      }
    }

    art.on("ready", applyStyles)
    art.on("video:loadedmetadata", applyStyles)

    return { name: "artplayerChapterHighlight" }
  }
}

// Upload subtitle plugin
export function artplayerUploadSubtitle() {
  return (art: any) => {
    const { getExt } = art.constructor.utils || { getExt: (name: string) => name.split(".").pop() }

    art.setting.add({
      name: "uploadSubtitle",
      html: `
        <div style="position: relative; display: flex; align-items: center; gap: 8px;">
          <input 
            type="file" 
            name="subtitle-upload" 
            id="art-subtitle-upload-${Date.now()}" 
            accept=".srt,.vtt,.ass,.ssa"
            style="display: none;" 
          />
          <label style="cursor: pointer; user-select: none; display: flex; align-items: center; gap: 8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span class="upload-label-text">Carregar Legenda</span>
          </label>
        </div>
      `,
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>`,
      onClick(_setting: unknown, $setting: HTMLElement) {
        const $input = $setting.querySelector("input[name='subtitle-upload']") as HTMLInputElement
        const $label = $setting.querySelector(".upload-label-text") as HTMLElement

        if ($input && !$input.dataset.bound) {
          $input.dataset.bound = "true"
          $input.addEventListener("change", (event) => {
            const target = event.target as HTMLInputElement
            const file = target.files?.[0]
            if (!file) return

            const url = URL.createObjectURL(file)
            const ext = getExt(file.name)

            art.subtitle.switch(url, { type: ext, name: file.name })
            target.value = ""

            if ($label) {
              const shortName = file.name.length > 15 ? file.name.substring(0, 12) + "..." : file.name
              $label.textContent = shortName
            }

            art.notice.show = `Legenda: ${file.name}`
          })
        }
        
        $input?.click()
      },
    })

    return { name: "uploadSubtitle" }
  }
}

// VTT Thumbnail plugin
export function artplayerVttThumbnail(option: { vtt: string }) {
  return async (art: any) => {
    if (!option.vtt) return { name: "vttThumbnail" }

    try {
      const vttString = await (await fetch(option.vtt)).text()
      const thumbnails = parseVttThumbnails(vttString, option.vtt)

      if (thumbnails.length === 0) return { name: "vttThumbnail" }

      art.controls.add({
        name: "vtt-thumbnail",
        position: "top",
        index: 20,
        mounted($control: HTMLElement) {
          $control.classList.add("art-control-thumbnails")
          Object.assign($control.style, {
            display: "none",
            position: "absolute",
            pointerEvents: "none",
            border: "2px solid white",
            borderRadius: "4px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
          })

          art.on("setBar", (type: string, percentage: number) => {
            if (type === "hover") {
              const width = art.template.$progress.clientWidth * percentage
              const second = percentage * art.duration

              const thumb = thumbnails.find((t) => second >= t.start && second <= t.end)
              if (!thumb) {
                $control.style.display = "none"
                return
              }

              $control.style.display = "block"
              $control.style.backgroundImage = `url(${thumb.url})`
              $control.style.height = `${thumb.h}px`
              $control.style.width = `${thumb.w}px`
              $control.style.backgroundPosition = `-${thumb.x}px -${thumb.y}px`

              const progressWidth = art.template.$progress.clientWidth
              if (width <= thumb.w / 2) {
                $control.style.left = "0"
              } else if (width > progressWidth - thumb.w / 2) {
                $control.style.left = `${progressWidth - thumb.w}px`
              } else {
                $control.style.left = `${width - thumb.w / 2}px`
              }
            }
          })
        },
      })
    } catch (e) {
      console.error("[v0] VTT thumbnail error:", e)
    }

    return { name: "vttThumbnail" }
  }
}

// Parse VTT thumbnail file
function parseVttThumbnails(
  vttString: string,
  vttUrl: string
): Array<{ start: number; end: number; url: string; x: number; y: number; w: number; h: number }> {
  const lines = vttString.split(/\r?\n/).filter((l) => l.trim())
  const thumbnails: Array<{ start: number; end: number; url: string; x: number; y: number; w: number; h: number }> = []

  const timeReg =
    /((?:[0-9]{2}:)?(?:[0-9]{2}:)?[0-9]{2}(?:\.[0-9]{3})?)(?: ?--> ?)((?:[0-9]{2}:)?(?:[0-9]{2}:)?[0-9]{2}(?:\.[0-9]{3})?)/

  for (let i = 0; i < lines.length; i++) {
    const timeMatch = lines[i].match(timeReg)
    if (!timeMatch || !lines[i + 1]) continue

    const textMatch = lines[i + 1].match(/(.*)#(\w{4})=(.*)/)
    if (!textMatch) continue

    let url = textMatch[1]
    if (!/^\/|((https?|ftp|file):\/\/)/i.test(url)) {
      const urlArr = vttUrl.split("/")
      urlArr.pop()
      urlArr.push(url)
      url = urlArr.join("/")
    }

    const keys = textMatch[2].split("")
    const values = textMatch[3].split(",")
    const result: Record<string, number> = {}

    for (let j = 0; j < keys.length; j++) {
      result[keys[j]] = parseInt(values[j]) || 0
    }

    thumbnails.push({
      start: parseVttTime(timeMatch[1]),
      end: parseVttTime(timeMatch[2]),
      url,
      x: result["x"] || 0,
      y: result["y"] || 0,
      w: result["w"] || 160,
      h: result["h"] || 90,
    })

    i++
  }

  return thumbnails
}

function parseVttTime(time: string): number {
  const parts = time.split(".")
  const timeParts = parts[0].split(":")
  const ms = parts[1] ? parseInt(parts[1].padEnd(3, "0")) / 1000 : 0

  const h = timeParts.length >= 3 ? parseInt(timeParts[timeParts.length - 3]) * 3600 : 0
  const m = timeParts.length >= 2 ? parseInt(timeParts[timeParts.length - 2]) * 60 : 0
  const s = parseInt(timeParts[timeParts.length - 1]) || 0

  return h + m + s + ms
}

// Keyboard shortcuts handler
export const KEY_CODES = {
  M: "KeyM",
  I: "KeyI",
  F: "KeyF",
  V: "KeyV",
  SPACE: "Space",
  ARROW_UP: "ArrowUp",
  ARROW_DOWN: "ArrowDown",
  ARROW_RIGHT: "ArrowRight",
  ARROW_LEFT: "ArrowLeft",
}

export function setupKeyboardShortcuts(art: any, containerRef: React.RefObject<HTMLElement>) {
  const isEditableElement = (el: Element | null): boolean => {
    if (!el) return false
    const tagName = el.tagName?.toLowerCase()
    if (tagName === "input" || tagName === "textarea" || (el as HTMLElement).isContentEditable) return true
    return false
  }

  const handleKeydown = (event: KeyboardEvent) => {
    const container = containerRef.current
    if (!container || !art) return

    const target = event.target as Element
    if (isEditableElement(target)) return

    const eventIsInsidePlayer = container.contains(target) || container.contains(document.activeElement)
    if (!eventIsInsidePlayer) return

    const code = event.code

    switch (code) {
      case KEY_CODES.M:
        art.muted = !art.muted
        break
      case KEY_CODES.I:
        art.pip = !art.pip
        break
      case KEY_CODES.F:
        event.preventDefault()
        art.fullscreen = !art.fullscreen
        break
      case KEY_CODES.V:
        event.preventDefault()
        if (art.subtitle) art.subtitle.show = !art.subtitle.show
        break
      case KEY_CODES.SPACE:
        event.preventDefault()
        art.playing ? art.pause() : art.play()
        break
      case KEY_CODES.ARROW_UP:
        event.preventDefault()
        art.volume = Math.min(art.volume + 0.1, 1)
        break
      case KEY_CODES.ARROW_DOWN:
        event.preventDefault()
        art.volume = Math.max(art.volume - 0.1, 0)
        break
      case KEY_CODES.ARROW_RIGHT:
        event.preventDefault()
        art.currentTime = Math.min(art.currentTime + 10, art.duration)
        break
      case KEY_CODES.ARROW_LEFT:
        event.preventDefault()
        art.currentTime = Math.max(art.currentTime - 10, 0)
        break
    }
  }

  document.addEventListener("keydown", handleKeydown)

  return () => {
    document.removeEventListener("keydown", handleKeydown)
  }
}

// Continue watching storage helpers
export interface ContinueWatchingEntry {
  animeId: string
  animeTitle: string
  episodeNumber: number
  episodeId: string
  poster?: string
  leftAt: number
  duration: number
  updatedAt: number
}

export function saveContinueWatching(entry: ContinueWatchingEntry) {
  try {
    const list = getContinueWatching()
    const filtered = list.filter((item) => item.animeId !== entry.animeId)
    filtered.unshift(entry)
    // Keep only last 20 entries
    const trimmed = filtered.slice(0, 20)
    localStorage.setItem("akira-continue-watching", JSON.stringify(trimmed))
  } catch (e) {
    console.error("[v0] Failed to save continue watching:", e)
  }
}

export function getContinueWatching(): ContinueWatchingEntry[] {
  try {
    const data = localStorage.getItem("akira-continue-watching")
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function getContinueWatchingEntry(animeId: string): ContinueWatchingEntry | null {
  const list = getContinueWatching()
  return list.find((item) => item.animeId === animeId) || null
}

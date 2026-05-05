<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  videoId: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    default: 'YouTube video',
  },
})

const playerHostRef = ref(null)
const playerInstanceRef = ref(null)
const playerElementId = `youtube-player-${Math.random().toString(36).slice(2, 11)}`

let youtubeApiPromise = null

function ensureYoutubeApi() {
  if (typeof window === 'undefined') {
    return Promise.resolve(null)
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT)
  }

  if (youtubeApiPromise) {
    return youtubeApiPromise
  }

  youtubeApiPromise = new Promise((resolve) => {
    const existingScript = document.querySelector('script[data-youtube-iframe-api="true"]')

    if (!existingScript) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      script.dataset.youtubeIframeApi = 'true'
      document.head.appendChild(script)
    }

    const previousHandler = window.onYouTubeIframeAPIReady

    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousHandler === 'function') {
        previousHandler()
      }

      resolve(window.YT)
    }
  })

  return youtubeApiPromise
}

function destroyPlayer() {
  if (playerInstanceRef.value && typeof playerInstanceRef.value.destroy === 'function') {
    playerInstanceRef.value.destroy()
  }

  playerInstanceRef.value = null
}

async function createOrUpdatePlayer(videoId) {
  if (!videoId || !playerHostRef.value) {
    return
  }

  const YT = await ensureYoutubeApi()

  if (!YT?.Player) {
    return
  }

  if (playerInstanceRef.value && typeof playerInstanceRef.value.loadVideoById === 'function') {
    playerInstanceRef.value.loadVideoById(videoId)
    return
  }

  playerInstanceRef.value = new YT.Player(playerElementId, {
    videoId,
    playerVars: {
      rel: 0,
      modestbranding: 1,
      playsinline: 1,
    },
  })
}

onMounted(() => {
  createOrUpdatePlayer(props.videoId)
})

watch(
  () => props.videoId,
  (videoId) => {
    createOrUpdatePlayer(videoId)
  },
)

onBeforeUnmount(() => {
  destroyPlayer()
})
</script>

<template>
  <div ref="playerHostRef" class="youtube-player-shell">
    <div class="youtube-player-surface">
      <div :id="playerElementId" class="youtube-player-frame" :title="title" />
    </div>
  </div>
</template>

<style scoped>
.youtube-player-shell {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 1rem;
  overflow: hidden;
}

.youtube-player-surface {
  position: relative;
  width: 100%;
  max-width: 100%;
  aspect-ratio: 16 / 9;
}

.youtube-player-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.youtube-player-shell :deep(iframe) {
  display: block;
  width: 100%;
  height: 100%;
  margin: 0 auto;
}
</style>

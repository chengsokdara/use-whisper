import { type Harker } from 'hark'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Options, RecordRTCPromisesHandler } from 'recordrtc'
import { useCallbackAsync, useEffectAsync } from './hooks'
import type {
  UseWhisperConfig,
  UseWhisperHook,
  UseWhisperTimeout,
  UseWhisperTranscript,
} from './types'
import type { RawAxiosRequestHeaders } from 'axios'

// const defaultPauseTimeout = 2_000
const defaultStopTimeout = 5_000

const defaultConfig: UseWhisperConfig = {
  apiKey: '',
  autoStart: false,
  customServer: '',
  nonStop: false,
  removeSilence: false,
  stopTimeout: defaultStopTimeout,
}

const defaultTimeout: UseWhisperTimeout = {
  pause: undefined,
  stop: undefined,
}

export const useWhisper: UseWhisperHook = (config) => {
  const {
    apiKey,
    autoStart,
    customServer,
    nonStop,
    removeSilence,
    stopTimeout,
  } = {
    ...defaultConfig,
    ...config,
  }
  if (!apiKey && !customServer) {
    throw new Error(
      'useWhisper cannot work without valid OpenAI API key or custom server.',
      {
        cause: apiKey,
      }
    )
  }

  const listener = useRef<Harker>()
  const recorder = useRef<RecordRTCPromisesHandler>()
  const stream = useRef<MediaStream>()
  const timeout = useRef<UseWhisperTimeout>(defaultTimeout)

  const [recording, setRecording] = useState<boolean>(false)
  const [speaking, setSpeaking] = useState<boolean>(false)
  const [transcript, setTranscript] = useState<UseWhisperTranscript>()
  const [transcripting, setTranscripting] = useState<boolean>(false)

  const pauseRecording = useCallbackAsync(async () => {
    await onPauseRecording()
  }, [])

  const startRecording = useCallbackAsync(async () => {
    await onStartRecording()
  }, [])

  const stopRecording = useCallbackAsync(async () => {
    await onStopRecording()
  }, [])

  const onStopStreaming = useCallback(() => {
    if (listener.current) {
      // @ts-ignore
      listener.current.off('speaking', onStartSpeaking)
      // @ts-ignore
      listener.current.off('stopped_speaking', onStopSpeaking)
      listener.current = undefined
    }

    if (stream.current) {
      stream.current.getTracks().forEach((track) => track.stop())
      stream.current = undefined
    }
  }, [])

  const onTranscripting = useCallbackAsync(
    async () => {
      if (recorder.current) {
        const recordState = await recorder.current.getState()

        if (recordState === 'stopped') {
          setTranscripting(true)
          let blob = await recorder.current.getBlob()

          if (removeSilence) {
            const { createFFmpeg } = await import('@ffmpeg/ffmpeg')
            const ffmpeg = createFFmpeg({
              mainName: 'main',
              corePath:
                'https://unpkg.com/@ffmpeg/core-st@0.11.1/dist/ffmpeg-core.js',
              log: true,
            })

            if (!ffmpeg.isLoaded()) {
              await ffmpeg.load()
            }

            const buffer = await blob.arrayBuffer()
            console.log({ in: buffer.byteLength })
            ffmpeg.FS('writeFile', 'test.webm', new Uint8Array(buffer))

            await ffmpeg.run(
              '-i', // Input
              'test.webm',
              '-acodec', // Audio codec
              'libmp3lame',
              '-aq', // Audio quality
              '9',
              '-ar', // Audio sample rate
              '16000',
              '-af', // Audio filter = remove silence from start to end with 2 seconds in between
              'silenceremove=start_periods=1:stop_periods=-1:start_threshold=-30dB:stop_threshold=-30dB:start_silence=2:stop_silence=2',
              'test.mp3' // Output
            )

            const out = ffmpeg.FS('readFile', 'test.mp3')
            console.log({ out: out.buffer.byteLength })
            blob = new Blob([out.buffer], { type: 'audio/mpeg' })
          }

          const body = new FormData()
          body.append('file', blob)
          body.append('model', 'whisper-1')

          const { default: axios } = await import('axios')
          const headers: RawAxiosRequestHeaders = {
            'Content-Type': 'multipart/form-data',
          }
          if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`
          }
          let whisperApiUrl = 'https://api.openai.com/v1/audio/transcriptions'
          if (customServer) {
            whisperApiUrl = customServer
          }
          const response = await axios.post(whisperApiUrl, body, {
            headers,
          })
          const { text } = await response.data()
          console.log('onTranscript', { text })
          setTranscript({
            blob,
            text,
          })
          setTranscripting(false)
        }
      }
    },
    (err) => {
      console.error(err)
      setTranscripting(false)
    },
    [removeSilence]
  )

  const onStopTimeout = useCallback((type: keyof UseWhisperTimeout) => {
    if (timeout.current[type]) {
      clearTimeout(timeout.current[type])
      timeout.current[type] = undefined
    }
  }, [])

  const onStopRecording = useCallbackAsync(async () => {
    if (recorder.current) {
      const recordState = await recorder.current.getState()
      if (recordState === 'recording' || recordState === 'paused') {
        await recorder.current.stopRecording()
      }

      onStopStreaming()
      // onStopTimeout('pause')
      onStopTimeout('stop')
      setRecording(false)

      await onTranscripting()

      await recorder.current.destroy()
      recorder.current = undefined
    }
  }, [nonStop])

  const onPauseRecording = useCallback(async () => {
    if (recorder.current) {
      const recordState = await recorder.current.getState()
      if (recordState === 'recording') {
        await recorder.current.pauseRecording()
      }

      onStopTimeout('stop')
      setRecording(false)
    }
  }, [nonStop])

  const onStopSpeaking = useCallback(() => {
    console.log('stop speaking')
    setSpeaking(false)

    // onStartTimeout('pause')
    if (nonStop) {
      onStartTimeout('stop')
    }
  }, [nonStop])

  const onStartSpeaking = useCallback(() => {
    console.log('start speaking')
    setSpeaking(true)

    // await onStartRecording()

    // onStopTimeout('pause')
    onStopTimeout('stop')
  }, [nonStop])

  const onStartTimeout = useCallback((type: keyof UseWhisperTimeout) => {
    let timeoutCallback
    // if (type === 'pause') {
    //   timeoutCallback = onPauseRecording
    // }
    if (type === 'stop') {
      timeoutCallback = onStopRecording
    }
    if (!timeout.current[type] && timeoutCallback) {
      timeout.current[type] = setTimeout(timeoutCallback, stopTimeout)
    }
  }, [])

  const onStartStreaming = useCallbackAsync(async () => {
    if (stream.current) {
      stream.current.getTracks().forEach((track) => track.stop())
    }
    stream.current = await navigator.mediaDevices.getUserMedia({
      audio: true,
    })

    if (!listener.current) {
      const { default: hark } = await import('hark')
      listener.current = hark(stream.current, {
        interval: 100,
        play: false,
      })
      listener.current.on('speaking', onStartSpeaking)
      listener.current.on('stopped_speaking', onStopSpeaking)
    }
  }, [])

  const onStartRecording = useCallbackAsync(async () => {
    if (!stream.current) {
      await onStartStreaming()
    }

    if (stream.current) {
      if (!recorder.current) {
        // recorder.current = new MediaRecorder(stream, {
        //   audioBitsPerSecond: 128_000,
        // })
        const { MediaStreamRecorder, RecordRTCPromisesHandler } = (
          await import('recordrtc')
        ).default
        const recorderConfig: Options = {
          mimeType: 'audio/webm',
          recorderType: MediaStreamRecorder,
          type: 'audio',
        }
        recorder.current = new RecordRTCPromisesHandler(
          stream.current,
          recorderConfig
        )
      }

      const recordState = await recorder.current.getState()
      if (recordState === 'inactive' || recordState === 'stopped') {
        await recorder.current.startRecording()
      }
      if (recordState === 'paused') {
        await recorder.current.resumeRecording()
      }

      if (nonStop) {
        onStartTimeout('stop')
      }
      setRecording(true)
    }
  }, [nonStop])

  useEffectAsync(async () => {
    if (autoStart) {
      await onStartRecording()
    }
  }, [autoStart])

  useEffect(() => {
    return () => {
      if (recorder.current) {
        recorder.current.destroy()
        recorder.current = undefined
      }

      // onStopTimeout('pause')
      onStopTimeout('stop')

      if (listener.current) {
        // @ts-ignore
        listener.current.off('speaking', onStartSpeaking)
        // @ts-ignore
        listener.current.off('stopped_speaking', onStopSpeaking)
      }

      if (stream.current) {
        stream.current.getTracks().forEach((track) => track.stop())
        stream.current = undefined
      }
    }
  }, [])

  return {
    recording,
    speaking,
    transcript,
    transcripting,
    pauseRecording,
    startRecording,
    stopRecording,
  }
}

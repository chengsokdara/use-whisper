import {
  useCallbackAsync,
  useEffectAsync,
} from '@chengsokdara/react-hooks-async'
import type { RawAxiosRequestHeaders } from 'axios'
import type { Harker } from 'hark'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Options, RecordRTCPromisesHandler } from 'recordrtc'
import {
  defaultStopTimeout,
  ffmpegCoreUrl,
  silenceRemoveCommand,
  whisperApiEndpoint,
} from './configs'
import type {
  CustomServerRequestBody,
  UseWhisperConfig,
  UseWhisperHook,
  UseWhisperTimeout,
  UseWhisperTranscript,
} from './types'

/**
 * default useWhisper configuration
 */
const defaultConfig: UseWhisperConfig = {
  apiKey: '',
  autoStart: false,
  autoTranscribe: false,
  customServer: undefined,
  nonStop: false,
  removeSilence: false,
  stopTimeout: defaultStopTimeout,
}

/**
 * default timeout for recorder
 */
const defaultTimeout: UseWhisperTimeout = {
  stop: undefined,
}

/**
 * React Hook for OpenAI Whisper
 * @param {UseWhisperConfig} config useWhisper configuration object
 * @returns useWhisper return object
 */
export const useWhisper: UseWhisperHook = (config) => {
  if (!config?.customServer && !config?.apiKey) {
    throw new Error('apiKey is required if customServer is not provided')
  }

  const {
    apiKey,
    autoStart,
    autoTranscribe,
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
      'useWhisper cannot work without valid OpenAI API key or custom server.'
    )
  }

  const listener = useRef<Harker>()
  const recorder = useRef<RecordRTCPromisesHandler>()
  const stream = useRef<MediaStream>()
  const timeout = useRef<UseWhisperTimeout>(defaultTimeout)

  const [recording, setRecording] = useState<boolean>(false)
  const [speaking, setSpeaking] = useState<boolean>(false)
  const [transcribing, setTranscribing] = useState<boolean>(false)
  const [transcript, setTranscript] = useState<UseWhisperTranscript>()

  /**
   * cleanup on component unmounted
   * - destroy recordrtc instance and clear it from ref
   * - clear setTimout for onStopRecording
   * - clean up hark speaking detection listeners and clear it from ref
   * - stop all user's media steaming track and remove it from ref
   */
  useEffect(() => {
    return () => {
      if (recorder.current) {
        recorder.current.destroy()
        recorder.current = undefined
      }
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

  /**
   * if config.autoStart is true
   * start speech recording immediately upon component mounted
   */
  useEffectAsync(async () => {
    if (autoStart) {
      await onStartRecording()
    }
  }, [autoStart])

  /**
   * start speech recording and start listen for speaking event
   */
  const startRecording = useCallbackAsync(async () => {
    await onStartRecording()
  }, [])

  /**
   * pause speech recording also stop media stream
   */
  const pauseRecording = useCallbackAsync(async () => {
    await onPauseRecording()
  }, [])

  /**
   * stop speech recording and start the transcription
   */
  const stopRecording = useCallbackAsync(async () => {
    await onStopRecording()
  }, [])

  /**
   * start speech recording event
   * - first ask user for media stream
   * - create recordrtc instance and pass media stream to it
   * - check recorder state and start or resume recorder accordingly
   * - start timeout for stop timeout config
   * - update recording state to true
   */
  const onStartRecording = useCallbackAsync(async () => {
    if (!stream.current) {
      await onStartStreaming()
    }

    if (stream.current) {
      if (!recorder.current) {
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

  /**
   * get user media stream event
   * - try to stop all previous media streams
   * - ask user for media stream with a system popup
   * - register hark speaking detection listeners
   */
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

  /**
   * start stop timeout event
   */
  const onStartTimeout = useCallback((type: keyof UseWhisperTimeout) => {
    if (!timeout.current[type]) {
      timeout.current[type] = setTimeout(onStopRecording, stopTimeout)
    }
  }, [])

  /**
   * user start speaking event
   * - set speaking state to true
   * - clear stop timeout
   */
  const onStartSpeaking = useCallback(() => {
    console.log('start speaking')
    setSpeaking(true)
    onStopTimeout('stop')
  }, [])

  /**
   * user stop speaking event
   * - set speaking state to false
   * - start stop timeout back
   */
  const onStopSpeaking = useCallback(() => {
    console.log('stop speaking')
    setSpeaking(false)
    if (nonStop) {
      onStartTimeout('stop')
    }
  }, [nonStop])

  /**
   * pause speech recording event
   * - if recorder state is recording, pause the recorder
   * - clear stop timeout
   * - set recoriding state to false
   */
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

  /**
   * stop speech recording event
   * - if recorder state is recording or paused, stop the recorder
   * - stop user media stream
   * - clear stop timeout
   * - set recording state to false
   * - start Whisper transcription event
   * - destroy recordrtc instance and clear it from ref
   */
  const onStopRecording = useCallbackAsync(async () => {
    if (recorder.current) {
      const recordState = await recorder.current.getState()
      if (recordState === 'recording' || recordState === 'paused') {
        await recorder.current.stopRecording()
      }

      onStopStreaming()
      onStopTimeout('stop')
      setRecording(false)

      if (autoTranscribe) {
        await onTranscribing()
      } else {
        const blob = await recorder.current.getBlob()
        setTranscript({
          blob,
        })
      }

      await recorder.current.destroy()
      recorder.current = undefined
    }
  }, [autoTranscribe, nonStop])

  /**
   * stop media stream event
   * - remove hark speaking detection listeners
   * - stop all media stream tracks
   * - clear media stream from ref
   */
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

  /**
   * stop timeout event
   * - clear stop timeout and remove it from ref
   */
  const onStopTimeout = useCallback((type: keyof UseWhisperTimeout) => {
    if (timeout.current[type]) {
      clearTimeout(timeout.current[type])
      timeout.current[type] = undefined
    }
  }, [])

  /**
   * start Whisper transcrition event
   * - make sure recorder state is stopped
   * - set transcribing state to true
   * - get audio blob from recordrtc
   * - if config.removeSilence is true, load ffmpeg-wasp and try to remove silence from speec
   * - if config.customServer is true, send audio data to custom server in base64 string
   * - if config.customServer is false, send audio data to Whisper api in multipart/form-data
   * - set transcript object with audio blob and transcription result from Whisper
   * - set transcribing state to false
   */
  const onTranscribing = useCallbackAsync(
    async () => {
      console.log('transcribing speech')
      if (recorder.current) {
        const recordState = await recorder.current.getState()
        if (recordState === 'stopped') {
          setTranscribing(true)
          let blob = await recorder.current.getBlob()

          if (removeSilence) {
            const { createFFmpeg } = await import('@ffmpeg/ffmpeg')
            const ffmpeg = createFFmpeg({
              mainName: 'main',
              corePath: ffmpegCoreUrl,
              log: true,
            })
            if (!ffmpeg.isLoaded()) {
              await ffmpeg.load()
            }

            const buffer = await blob.arrayBuffer()
            console.log({ in: buffer.byteLength })
            ffmpeg.FS('writeFile', 'speech.webm', new Uint8Array(buffer))

            await ffmpeg.run(
              '-i', // Input
              'speech.webm',
              '-acodec', // Audio codec
              'libmp3lame',
              '-aq', // Audio quality
              '9',
              '-ar', // Audio sample rate
              '16000',
              '-af', // Audio filter = remove silence from start to end with 2 seconds in between
              silenceRemoveCommand,
              'speech.mp3' // Output
            )

            const out = ffmpeg.FS('readFile', 'speech.mp3')
            console.log({ out: out.buffer.byteLength })
            // 225 seems to be empty mp3 file
            if (out.length <= 225) {
              ffmpeg.exit()
              setTranscript({
                blob,
              })
              setTranscribing(false)
              return
            }
            blob = new Blob([out.buffer], { type: 'audio/mpeg' })
            ffmpeg.exit()
          }

          let endpoint = whisperApiEndpoint
          let body: string | FormData
          const headers: RawAxiosRequestHeaders = {}
          if (customServer) {
            // audio data will be sent as base64
            endpoint = customServer
            const base64 = await new Promise<string | ArrayBuffer | null>(
              (resolve) => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result)
                reader.readAsDataURL(blob)
              }
            )
            body = JSON.stringify({
              file: base64,
              model: 'whisper-1',
            } as CustomServerRequestBody)
            headers['Content-Type'] = 'application/json'
          } else {
            // Whisper only accept multipart/form-data currently
            body = new FormData()
            let file = new File([blob], 'speech.mp3', { type: 'audio/mpeg' })
            if (removeSilence) {
              file = new File([blob], 'speech.webm', {
                type: 'audio/webm;codecs=opus',
              })
            }
            body.append('file', file)
            body.append('model', 'whisper-1')
            headers['Content-Type'] = 'multipart/form-data'
          }

          if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`
          }

          const { default: axios } = await import('axios')
          const response = await axios.post(endpoint, body, {
            headers,
          })
          const { text } = await response.data
          console.log('onTranscript', { text })
          setTranscript({
            blob,
            text,
          })
          setTranscribing(false)
        }
      }
    },
    (err) => {
      console.info(err)
      setTranscribing(false)
    },
    [removeSilence]
  )

  return {
    recording,
    speaking,
    transcribing,
    transcript,
    pauseRecording,
    startRecording,
    stopRecording,
  }
}

import { useEffectAsync, useMemoAsync } from '@chengsokdara/react-hooks-async'
import type { RawAxiosRequestHeaders } from 'axios'
import type { Harker } from 'hark'
import type { Encoder } from 'lamejs'
import { useEffect, useRef, useState } from 'react'
import type { Options, RecordRTCPromisesHandler } from 'recordrtc'
import { defaultStopTimeout, whisperApiEndpoint } from './configs'
import {
  UseWhisperConfig,
  UseWhisperHook,
  UseWhisperTimeout,
  UseWhisperTranscript,
} from './types'
import { removeSilenceWithFfmpeg } from './helpers'

/**
 * default useWhisper configuration
 */
const defaultConfig: UseWhisperConfig = {
  apiKey: '',
  autoStart: false,
  autoTranscribe: true,
  mode: 'transcriptions',
  nonStop: false,
  removeSilence: false,
  stopTimeout: defaultStopTimeout,
  streaming: false,
  concatChunk: false,
  timeSlice: 1_000,
  onDataAvailable: undefined,
  onTranscribe: undefined,
  onStreamTranscribe: undefined,
  showLogs: false,
}

/**
 * default timeout for recorder
 */
const defaultTimeout: UseWhisperTimeout = {
  stop: undefined,
}

/**
 * default transcript object
 */
const defaultTranscript: UseWhisperTranscript = {
  blob: undefined,
  text: undefined,
}

/**
 * React Hook for OpenAI Whisper
 */
export const useWhisper: UseWhisperHook = (config) => {
  const {
    apiKey,
    autoStart,
    autoTranscribe,
    mode,
    nonStop,
    removeSilence,
    stopTimeout,
    streaming,
    concatChunk,
    timeSlice,
    whisperConfig,
    onDataAvailable: onDataAvailableCallback,
    onTranscribe: onTranscribeCallback,
    onStreamTranscribe: onStreamTranscribeCallback,
    showLogs,
  } = {
    ...defaultConfig,
    ...config,
  }

  if (!apiKey && !onTranscribeCallback) {
    throw new Error('apiKey is required if onTranscribe is not provided')
  }

  const chunks = useRef<Blob[]>([])
  const encoder = useRef<Encoder>()
  const listener = useRef<Harker>()
  const recorder = useRef<RecordRTCPromisesHandler>()
  const stream = useRef<MediaStream>()
  const timeout = useRef<UseWhisperTimeout>(defaultTimeout)

  const [recording, setRecording] = useState<boolean>(false)
  const [speaking, setSpeaking] = useState<boolean>(false)
  const [transcribing, setTranscribing] = useState<boolean>(false)
  const [transcript, setTranscript] =
    useState<UseWhisperTranscript>(defaultTranscript)

  /**
   * cleanup on component unmounted
   * - flush out and cleanup lamejs encoder instance
   * - destroy recordrtc instance and clear it from ref
   * - clear setTimout for onStopRecording
   * - clean up hark speaking detection listeners and clear it from ref
   * - stop all user's media steaming track and remove it from ref
   */
  useEffect(() => {
    return () => {
      if (chunks.current) {
        chunks.current = []
      }
      if (encoder.current) {
        encoder.current.flush()
        encoder.current = undefined
      }
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
  const startRecording = async () => {
    await onStartRecording()
  }

  /**
   * pause speech recording also stop media stream
   */
  const pauseRecording = async () => {
    await onPauseRecording()
  }

  /**
   * stop speech recording and start the transcription
   */
  const stopRecording = async () => {
    await onStopRecording()
  }

  /**
   * start speech recording event
   * - first ask user for media stream
   * - create recordrtc instance and pass media stream to it
   * - create lamejs encoder instance
   * - check recorder state and start or resume recorder accordingly
   * - start timeout for stop timeout config
   * - update recording state to true
   */
  const onStartRecording = async () => {
    try {
      if (!stream.current) {
        await onStartStreaming()
      }
      if (stream.current) {
        if (!recorder.current) {
          const {
            default: { RecordRTCPromisesHandler, StereoAudioRecorder },
          } = await import('recordrtc')
          const recorderConfig: Options = {
            mimeType: 'audio/wav',
            numberOfAudioChannels: 1, // mono
            recorderType: StereoAudioRecorder,
            sampleRate: 44100, // Sample rate = 44.1khz
            timeSlice: streaming ? timeSlice : undefined,
            type: 'audio',
            ondataavailable:
              autoTranscribe && streaming ? onDataAvailable : undefined,
            disableLogs: !showLogs,
          }
          recorder.current = new RecordRTCPromisesHandler(
            stream.current,
            recorderConfig
          )
        }
        if (!encoder.current) {
          const { Mp3Encoder } = await import('lamejs')
          encoder.current = new Mp3Encoder(1, 44100, 96)
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
    } catch (err) {
      console.error(err)
    }
  }

  /**
   * get user media stream event
   * - try to stop all previous media streams
   * - ask user for media stream with a system popup
   * - register hark speaking detection listeners
   */
  const onStartStreaming = async () => {
    try {
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
    } catch (err) {
      console.error(err)
    }
  }

  /**
   * start stop timeout event
   */
  const onStartTimeout = (type: keyof UseWhisperTimeout) => {
    if (!timeout.current[type]) {
      timeout.current[type] = setTimeout(onStopRecording, stopTimeout)
    }
  }

  /**
   * user start speaking event
   * - set speaking state to true
   * - clear stop timeout
   */
  const onStartSpeaking = () => {
    showLogs && console.log('start speaking')
    setSpeaking(true)
    onStopTimeout('stop')
  }

  /**
   * user stop speaking event
   * - set speaking state to false
   * - start stop timeout back
   */
  const onStopSpeaking = () => {
    showLogs && console.log('stop speaking')
    setSpeaking(false)
    if (nonStop) {
      onStartTimeout('stop')
    }
  }

  /**
   * pause speech recording event
   * - if recorder state is recording, pause the recorder
   * - clear stop timeout
   * - set recoriding state to false
   */
  const onPauseRecording = async () => {
    try {
      if (recorder.current) {
        const recordState = await recorder.current.getState()
        if (recordState === 'recording') {
          await recorder.current.pauseRecording()
        }
        onStopTimeout('stop')
        setRecording(false)
      }
    } catch (err) {
      console.error(err)
    }
  }

  /**
   * stop speech recording event
   * - flush out lamejs encoder and set it to undefined
   * - if recorder state is recording or paused, stop the recorder
   * - stop user media stream
   * - clear stop timeout
   * - set recording state to false
   * - start Whisper transcription event
   * - destroy recordrtc instance and clear it from ref
   */
  const onStopRecording = async () => {
    try {
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
        chunks.current = []
        if (encoder.current) {
          encoder.current.flush()
          encoder.current = undefined
        }
        recorder.current = undefined
      }
    } catch (err) {
      console.error(err)
    }
  }

  /**
   * stop media stream event
   * - remove hark speaking detection listeners
   * - stop all media stream tracks
   * - clear media stream from ref
   */
  const onStopStreaming = () => {
    if (listener.current) {
      // If hark doesn't get the chance to trigger the stop event before streaming is stopped
      // the speaking state doesn't reset and remains true
      setSpeaking(false)
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
  }

  /**
   * stop timeout event
   * - clear stop timeout and remove it from ref
   */
  const onStopTimeout = (type: keyof UseWhisperTimeout) => {
    if (timeout.current[type]) {
      clearTimeout(timeout.current[type])
      timeout.current[type] = undefined
    }
  }

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
  const onTranscribing = async () => {
    showLogs && console.log('transcribing speech')
    try {
      if (encoder.current && recorder.current) {
        const recordState = await recorder.current.getState()
        if (recordState === 'stopped') {
          setTranscribing(true)
          let blob = await recorder.current.getBlob()
          if (removeSilence) {
            const silencedBlob = await removeSilenceWithFfmpeg({
              showLogs,
              blob,
            })
            if (!silencedBlob) {
              setTranscript({
                blob,
              })
              setTranscribing(false)
            } else {
              blob = silencedBlob
            }
          } else {
            const buffer = await blob.arrayBuffer()
            showLogs && console.log({ wav: buffer.byteLength })
            const mp3 = encoder.current.encodeBuffer(new Int16Array(buffer))
            blob = new Blob([mp3], { type: 'audio/mpeg' })
            showLogs && console.log({ blob, mp3: mp3.byteLength })
          }
          if (typeof onTranscribeCallback === 'function') {
            const transcribed = await onTranscribeCallback(blob)
            showLogs && console.log('onTranscribe', transcribed)
            setTranscript(transcribed)
          } else {
            const file = new File([blob], 'speech.mp3', { type: 'audio/mpeg' })
            const text = await onWhispered(file)
            showLogs && console.log('onTranscribing', { text })
            setTranscript({
              blob,
              text,
            })
          }
          setTranscribing(false)
        }
      }
    } catch (err) {
      console.info(err)
      setTranscribing(false)
    }
  }

  /**
   * Get audio data in chunk based on timeSlice
   * - while recording send audio chunk to Whisper
   * - chunks can be concatenated in succession, or sent individually
   * - set transcript text with interim result
   */

  const onDataAvailable = async (data: Blob) => {
    showLogs && console.log('onDataAvailable', data)
    try {
      if (streaming && recorder.current) {
        onDataAvailableCallback?.(data)
        if (encoder.current) {
          const buffer = await data.arrayBuffer()
          const mp3chunk = encoder.current.encodeBuffer(new Int16Array(buffer))
          const mp3blob = new Blob([mp3chunk], { type: 'audio/mpeg' })
          if (concatChunk) {
            chunks.current.push(mp3blob)
          } else {
            chunks.current = [mp3blob]
          }
        }
        const recorderState = await recorder.current.getState()
        if (recorderState === 'recording') {
          let blob = new Blob(chunks.current, {
            type: 'audio/mpeg',
          })
          if (removeSilence) {
            showLogs && console.log('Removing silence.')
            const silencedBlob = await removeSilenceWithFfmpeg({
              showLogs,
              blob,
            })

            if (!silencedBlob) return
            blob = silencedBlob
          }

          if (typeof onStreamTranscribeCallback === 'function') {
            onStreamTranscribeCallback(blob)
          } else {
            const file = new File([blob], 'speech.mp3', {
              type: 'audio/mpeg',
            })
            const text = await onWhispered(file)
            showLogs && console.log('onInterim', { text })
            if (text) {
              setTranscript((prev) => ({ ...prev, text }))
            }
          }
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  /**
   * Send audio file to Whisper to be transcribed
   * - create formdata and append file, model, and language
   * - append more Whisper config if whisperConfig is provided
   * - add OpenAPI Token to header Authorization Bearer
   * - post with axios to OpenAI Whisper transcript endpoint
   * - return transcribed text result
   */
  const onWhispered = useMemoAsync(
    async (file: File) => {
      // Whisper only accept multipart/form-data currently
      const body = new FormData()
      body.append('file', file)
      body.append('model', 'whisper-1')
      if (mode === 'transcriptions') {
        body.append('language', whisperConfig?.language ?? 'en')
      }
      if (whisperConfig?.prompt) {
        body.append('prompt', whisperConfig.prompt)
      }
      if (whisperConfig?.response_format) {
        body.append('response_format', whisperConfig.response_format)
      }
      if (whisperConfig?.temperature) {
        body.append('temperature', `${whisperConfig.temperature}`)
      }
      const headers: RawAxiosRequestHeaders = {}
      headers['Content-Type'] = 'multipart/form-data'
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`
      }
      const { default: axios } = await import('axios')
      const response = await axios.post(whisperApiEndpoint + mode, body, {
        headers,
      })
      return response.data.text
    },
    [apiKey, mode, whisperConfig]
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

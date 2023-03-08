export type UseWhisperConfig = {
  apiKey?: string
  autoStart?: boolean
  autoTranscribe?: boolean
  /** @deprecated: use {@link UseWhisperConfig.onTranscribe} instead  */
  customServer?: string
  nonStop?: boolean
  removeSilence?: boolean
  stopTimeout?: number
  whisperConfig?: WhisperApiConfig
  onTranscribe?: (blob: Blob) => Promise<UseWhisperTranscript>
}

export type UseWhisperTimeout = {
  stop?: NodeJS.Timeout
}

export type UseWhisperTranscript = {
  blob?: Blob
  text?: string
}

export type UseWhisperReturn = {
  recording: boolean
  speaking: boolean
  transcribing: boolean
  transcript: UseWhisperTranscript
  pauseRecording: () => Promise<void>
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
}

export type UseWhisperHook = (config?: UseWhisperConfig) => UseWhisperReturn

/** @deprecated along with {@link UseWhisperConfig.customServer} */
export type CustomServerRequestBody = {
  file: string | ArrayBuffer | null
  model: 'whisper-1' | string
}

export type WhisperApiConfig = {
  model?: 'whisper-1' | string
  prompt?: string
  response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt'
  temperature?: number
  language?: string
}

export type UseWhisperConfig = {
  apiKey?: string
  autoStart?: boolean
  customServer?: string
  // pauseTimeout?: number
  nonStop?: false
  removeSilence?: boolean
  stopTimeout?: number
}

export type CustomServerRequestBody = {
  file: string | ArrayBuffer | null
  model: 'whisper-1' | string
}

export type UseWhisperTimeout = {
  pause?: NodeJS.Timeout
  stop?: NodeJS.Timeout
}

export type UseWhisperTranscript = {
  blob: Blob
  text: string
}

export type UseWhisperReturn = {
  recording: boolean
  speaking: boolean
  transcript?: UseWhisperTranscript
  transcripting: boolean
  pauseRecording: () => Promise<void>
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
}

export type UseWhisperHook = (config?: UseWhisperConfig) => UseWhisperReturn

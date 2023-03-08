export type UseWhisperConfig = {
  apiKey?: string
  autoStart?: boolean
  autoTranscribe?: boolean
  customServer?: string
  nonStop?: boolean
  removeSilence?: boolean
  stopTimeout?: number
}

export type CustomServerRequestBody = {
  file: string | ArrayBuffer | null
  model: 'whisper-1' | string
}

export type UseWhisperTimeout = {
  stop?: NodeJS.Timeout
}

export type UseWhisperTranscript = {
  blob: Blob
  text?: string
}

export type UseWhisperReturn = {
  recording: boolean
  speaking: boolean
  transcribing: boolean
  transcript?: UseWhisperTranscript
  pauseRecording: () => Promise<void>
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
}

export type UseWhisperHook = (config?: UseWhisperConfig) => UseWhisperReturn

type UseWhisperNonStopConfig =
  | {
      nonStop?: false
      stopTimeout?: number
    }
  | {
      nonStop?: true
      stopTimeout: number
    }

export type UseWhisperConfig = {
  apiKey: string
  autoStart?: boolean
  customServer?: string
  // pauseTimeout?: number
  removeSilence?: boolean
} & UseWhisperNonStopConfig

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

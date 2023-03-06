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
  apiToken: string
  autoStart?: boolean
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
  pauseRecording: () => Promise<void>
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
}

export type UseWhisperHook = (config?: UseWhisperConfig) => UseWhisperReturn

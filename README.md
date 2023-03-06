# useWhisper
React Hook for OpenAI Whisper API with speech recorder and silence removal built-in

---

- ### Install

`npm i @chengsokdara/use-whisper`

`yarn add @chengsokdara/use-whisper`

- ### Usage

```jsx
import { useWhisper } from '@chengsokdara/use-whisper'

const App = () => {
  const { transcript } = useWhisper({
    apiToken: env.process.OPENAI_API_TOKEN // YOUR_OPEN_AI_TOKEN
  })

  return (
    <div>
      <p>{transcript.text}</p>
    </div>
  )
}
```

- ### API

  - Config Object

| Name         | Type        | Required | Default Value | Description |
| ------------ | ----------- | -------- | ------------- | ----------- |
| apiToken     | string      | yes      | ''            | your OpenAI API token |
| autoStart    | boolean     |          | false         | auto start speech recording on component mount |
| nonStop      | boolean     |          | false         | if true, record will auto stop after stopTimeout. However if user keep on speaking, the recorder will keep recording |
| removeSilence| boolean     |          | false         | remove silence before sending file to OpenAI API |
| stopTimeout  | number      | yes/no   | 5,000 ms      | if nonStop is true, this become required. This control when the recorder auto stop |

  - Return Object

| Name | Type | Description |
| ---- | ---- | ----------- |
| recording | boolean | speech recording state |
| speaking | boolean | detect when user is speaking |
| transcript | **Transcript** | object return after Whisper transcription complete |
| pauseRecording | Promise | pause speech recording |
| startRecording | Promise | start speech recording |
| stopRecording | Promise | stop speech recording |

  - Transcript

| Name | Type | Description |
| ---- | ---- | ----------- |
| blob | Blob | recorded speech in JavaScript Blob |
| text | string | transcripted text returned from Whisper API |

---

***Contact me for web or mobile app development using React or React Native***
[https://chengsokdara.github.io](https://chengsokdara.github.io)
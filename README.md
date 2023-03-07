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
    apiKey: env.process.OPENAI_API_TOKEN // YOUR_OPEN_AI_TOKEN
  })

  return (
    <div>
      <p>{transcript.text}</p>
    </div>
  )
}
```

***NOTE: by providing your OpenAI API key, it could be exposed in the browser***

- ### Examples

- ###### Auto start recording on component mounted

```jsx
import { useWhisper } from '@chengsokdara/use-whisper'

const App = () => {
  const { transcript } = useWhisper({
    autoStart: true // will auto start recording speech upon component mounted
  })

  return (
    <div>
      <p>{transcript.text}</p>
    </div>
  )
}
```

- ###### Keep recording as long as the user is speaking

```jsx
import { useWhisper } from '@chengsokdara/use-whisper'

const App = () => {
  const { transcript } = useWhisper({
    apiKey: env.process.OPENAI_API_TOKEN, // YOUR_OPEN_AI_TOKEN
    nonStop: true, // keep recording as long as the user is speaking
    stopTimeout: 5000, // auto stop after 5 seconds
  })

  return (
    <div>
      <p>{transcript.text}</p>
    </div>
  )
}
```

- ###### Supply your own Whisper REST API instead of OpenAI NodeJS library

```jsx
import { useWhisper } from '@chengsokdara/use-whisper'

const App = () => {
  const { transcript } = useWhisper({
    apiKey: env.process.YOUR_CUSTOM_TOKEN, // Optional: your server token if any
    customServer: 'https://example.com/api/whisper'
  })

  return (
    <div>
      <p>{transcript.text}</p>
    </div>
  )
}
```

- ### API

- ###### Config Object

| Name         | Type        | Required | Default Value | Description |
| ------------ | ----------- | -------- | ------------- | ----------- |
| apiKey | string | yes | '' | your OpenAI API token |
| autoStart | boolean |  | false | auto start speech recording on component mount |
| customServer | string |  | '' | supply your own whisper REST API endpoint |
| nonStop | boolean |  | false | if true, record will auto stop after stopTimeout. However if user keep on speaking, the recorder will keep recording |
| removeSilence | boolean |  | false | remove silence before sending file to OpenAI API |
| stopTimeout | number | yes/no | 5,000 ms | if nonStop is true, this become required. This control when the recorder auto stop |

- ###### Return Object

| Name | Type | Description |
| ---- | ---- | ----------- |
| recording | boolean | speech recording state |
| speaking | boolean | detect when user is speaking |
| transcript | **Transcript** | object return after Whisper transcription complete |
| transcripting | boolean | remove silence from speech and send request to OpenAI Whisper API |
| pauseRecording | Promise | pause speech recording |
| startRecording | Promise | start speech recording |
| stopRecording | Promise | stop speech recording |

- ###### Transcript Return Object

| Name | Type | Description |
| ---- | ---- | ----------- |
| blob | Blob | recorded speech in JavaScript Blob |
| text | string | transcripted text returned from Whisper API |

---

***Contact me for web or mobile app development using React or React Native***  
[https://chengsokdara.github.io](https://chengsokdara.github.io)
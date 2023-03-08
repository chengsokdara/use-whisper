# useWhisper()

React Hook for OpenAI Whisper API with speech recorder and silence removal built-in

---

_Try OpenAI API price calculator, token counter, and dataset manager (preview)_  
[https://openai-price-calculator.web.app](https://openai-price-calculator.web.app)

- ### Install

`npm i @chengsokdara/use-whisper`

`yarn add @chengsokdara/use-whisper`

- ### Usage

- ###### Provide your own OpenAI API key

```jsx
import { useWhisper } from '@chengsokdara/use-whisper'

const App = () => {
  const {
    recording,
    speaking,
    transcribing,
    transcript,
    pauseRecording,
    startRecording,
    stopRecording,
  } = useWhisper({
    apiKey: env.process.OPENAI_API_TOKEN, // YOUR_OPEN_AI_TOKEN
  })

  return (
    <div>
      <p>Recording: {recording}</p>
      <p>Speaking: {speaking}</p>
      <p>Transcribing: {transcribing}</p>
      <p>Transcribed Text: {transcript.text}</p>
      <button onClick={() => startRecording()}>Start</button>
      <button onClick={() => pauseRecording()}>Pause</button>
      <button onClick={() => stopRecording()}>Stop</button>
    </div>
  )
}
```

_**NOTE:** by providing apiKey, it could be exposed in the browser devtool network tab_

- ###### Custom REST API (if you want to keep your OpenAI API key secure)

```jsx
// Client

import { useWhisper } from '@chengsokdara/use-whisper'

const App = () => {
  const { transcript } = useWhisper({
    // Optional: your server token if any, will be sent in Bearer
    apiKey: env.process.YOUR_REST_API_AUTH_TOKEN,
    customServer: 'https://example.com/api/whisper',
  })

  return (
    <div>
      <p>{transcript.text}</p>
    </div>
  )
}
```

```javascript
// Server

export default async function handler(req, res) {
  const file = req.body.file
  // file will be in base64 string
  // you can convert it to buffer and save to disk
  const base64data = file.replace('data:audio/webm;codecs=opus;base64,', '')
  const audioData = Buffer.from(base64data, 'base64')
  fs.writeFileSync('audio.mp3', audioData)

  // model will be whisper-1
  const model = req.body.model
}
```

- ### Examples

- ###### Remove silence before sending to Whisper to save cost

```jsx
import { useWhisper } from '@chengsokdara/use-whisper'

const App = () => {
  const { transcript } = useWhisper({
    apiKey: env.process.OPENAI_API_TOKEN, // YOUR_OPEN_AI_TOKEN
    // use ffmpeg-wasp to remove silence from recorded speech
    removeSilence: true,
  })

  return (
    <div>
      <p>{transcript.text}</p>
    </div>
  )
}
```

- ###### Auto start recording on component mounted

```jsx
import { useWhisper } from '@chengsokdara/use-whisper'

const App = () => {
  const { transcript } = useWhisper({
    // will auto start recording speech upon component mounted
    autoStart: true,
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

- ###### Auto transcribe speech when recorder stopped

```jsx
import { useWhisper } from '@chengsokdara/use-whisper'

const App = () => {
  const { transcript } = useWhisper({
    apiKey: env.process.OPENAI_API_TOKEN, // YOUR_OPEN_AI_TOKEN
    autoTranscribe: true, // will try to automatically transcribe speech
  })

  return (
    <div>
      <p>{transcript.text}</p>
    </div>
  )
}
```

- ### Dependencies

most of these dependecies are lazy loaded, so it is only imported when it is needed

- **@chengsokdara/react-hooks-async** asynchronous react hooks
- **recordrtc:** cross-browser audio recorder
- **@ffmpeg/ffmpeg:** for silence removal feature
- **hark:** for speaking detection
- **axios:** since fetch does not work with Whisper endpoint

- ### API

- ###### Config Object

| Name           | Type    | Default Value | Description                                                                                                          |
| -------------- | ------- | ------------- | -------------------------------------------------------------------------------------------------------------------- |
| apiKey         | string  | ''            | your OpenAI API token                                                                                                |
| autoStart      | boolean | false         | auto start speech recording on component mount                                                                       |
| autoTranscribe | boolean | false         | should auto transcribe after stop recording                                                                          |
| customServer   | string  | undefined     | supply your own whisper REST API endpoint                                                                            |
| nonStop        | boolean | false         | if true, record will auto stop after stopTimeout. However if user keep on speaking, the recorder will keep recording |
| removeSilence  | boolean | false         | remove silence before sending file to OpenAI API                                                                     |
| stopTimeout    | number  | 5,000 ms      | if nonStop is true, this become required. This control when the recorder auto stop                                   |

- ###### Return Object

| Name           | Type                          | Description                                                               |
| -------------- | ----------------------------- | ------------------------------------------------------------------------- |
| recording      | boolean                       | speech recording state                                                    |
| speaking       | boolean                       | detect when user is speaking                                              |
| transcribing   | boolean                       | while removing silence from speech and send request to OpenAI Whisper API |
| transcript     | [**Transcript**](#transcript) | object return after Whisper transcription complete                        |
| pauseRecording | Promise                       | pause speech recording                                                    |
| startRecording | Promise                       | start speech recording                                                    |
| stopRecording  | Promise                       | stop speech recording                                                     |

- ###### Transcript

| Name | Type   | Description                                |
| ---- | ------ | ------------------------------------------ |
| blob | Blob   | recorded speech in JavaScript Blob         |
| text | string | transcribed text returned from Whisper API |

- ### Roadmap

  - react-native support, will be export as use-whisper/native

---

**_Contact me for web or mobile app development using React or React Native_**  
[https://chengsokdara.github.io](https://chengsokdara.github.io)

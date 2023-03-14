# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2023-04-01

### Added

- react-native support
- demo web app
- server app example
- support more audio output format
- able to run custom ffmpeg command
- expose onTranscribing event

## [0.1.1] - 2023-03-14

### Added

- add mode option for Whisper API, choose either transcriptions or translations
  (currently only support translation to English)

### Changed

- default timeSlice from 2000ms to 1000ms

## [0.1.0] - 2023-03-11

### Added

- streaming option for real-time trascription
- timeSlice option to control onDataAvailable event
- onDataAvaiable option for getting recorded blob in interval based on timeSlice

### Changed

- recording in higher audio quality to help Whisper in transcription

### Removed

- customServer option, deprecated since 0.0.11

## [0.0.12] - 2023-03-09

### Changed

- autoTranscribe default to true
- update examples in README.md

## [0.0.11] - 2023-03-08

### Added

- add onTranscribe callback for handling transcription using custom server
- add whisperConfig to control Whisper API when trascribing

### Changed

- autoTranscribe config, default to false. useWhisper will not longer try to transcribe after recorder stopped.

### Removed

- deprecated customServer, use onTranscribe instead

## [0.0.10] - 2023-03-08

### Added

- this changelog file
- comments to every functions and variables
- @chengsokdara/react-hooks-async for useCallbackAsync and useEffectAsync
- add Github Actions CI/CD

### Fixed

- now will not send audio to Whisper if converted mp3 audio is empty

### Changed

- transcripting state changed to transcribing to make it a valid word
- move constants string to configs.ts

### Removed

- hooks directory, now use @chengsokdara/react-hooks-async package instead
- remove console.log from distribution build

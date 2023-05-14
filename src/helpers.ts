import { ffmpegCoreUrl, silenceRemoveCommand } from './configs'

type RemoveSilencePropTypes = {
  showLogs: boolean | undefined
  blob: Blob
}
export async function removeSilenceWithFfmpeg({
  showLogs,
  blob: currentBlob,
}: RemoveSilencePropTypes): Promise<Blob | null> {
  const { createFFmpeg } = await import('@ffmpeg/ffmpeg')
  const ffmpeg = createFFmpeg({
    mainName: 'main',
    corePath: ffmpegCoreUrl,
    log: showLogs,
  })
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load()
  }
  const buffer = await currentBlob.arrayBuffer()
  showLogs && console.log({ in: buffer.byteLength })
  ffmpeg.FS('writeFile', 'in.wav', new Uint8Array(buffer))
  await ffmpeg.run(
    '-i', // Input
    'in.wav',
    '-acodec', // Audio codec
    'libmp3lame',
    '-b:a', // Audio bitrate
    '96k',
    '-ar', // Audio sample rate
    '44100',
    '-af', // Audio filter = remove silence from start to end with 2 seconds in between
    silenceRemoveCommand,
    'out.mp3' // Output
  )
  const out = ffmpeg.FS('readFile', 'out.mp3')
  showLogs && console.log({ out: out.buffer.byteLength, length: out.length })
  ffmpeg.exit()
  // 225 seems to be empty mp3 file
  if (out.length <= 225) return null
  return new Blob([out.buffer], { type: 'audio/mpeg' })
}

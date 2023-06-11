import { ffmpegCoreUrl, silenceRemoveCommand } from './configs'
import { createFFmpeg } from '@ffmpeg/ffmpeg'

type RemoveSilencePropTypes = {
  showLogs: boolean | undefined
  blob: Blob
  threshold: number
}
export async function removeSilenceWithFfmpeg({
  showLogs,
  blob: currentBlob,
  threshold,
}: RemoveSilencePropTypes): Promise<Blob | null> {
  const ffmpeg = createFFmpeg({
    mainName: 'main',
    corePath: ffmpegCoreUrl,
    log: showLogs,
  })
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load()
  }
  const buffer = await currentBlob.arrayBuffer()
  console.log({ in: buffer.byteLength })
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
  console.log({ out: out.buffer.byteLength, length: out.length })
  ffmpeg.exit()
  // This checks if it is less than the threshold to be considered as an empty mp3 file
  if (out.length <= threshold) return null
  return new Blob([out.buffer], { type: 'audio/mpeg' })
}

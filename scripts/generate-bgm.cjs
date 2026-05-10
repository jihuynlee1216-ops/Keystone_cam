/**
 * 간단한 BGM WAV 파일 생성 스크립트
 * 실행: node scripts/generate-bgm.js
 * 결과: public/bgm-*.wav 파일 3개 생성
 */

const fs = require('fs')
const path = require('path')

const SAMPLE_RATE = 44100
const DURATION = 30 // 30초 (루프)

function createWav(samples) {
  const numSamples = samples.length
  const byteRate = SAMPLE_RATE * 2 // 16bit mono
  const buffer = Buffer.alloc(44 + numSamples * 2)

  // WAV header
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + numSamples * 2, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16) // chunk size
  buffer.writeUInt16LE(1, 20)  // PCM
  buffer.writeUInt16LE(1, 22)  // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24)
  buffer.writeUInt32LE(byteRate, 28)
  buffer.writeUInt16LE(2, 32)  // block align
  buffer.writeUInt16LE(16, 34) // bits per sample
  buffer.write('data', 36)
  buffer.writeUInt32LE(numSamples * 2, 40)

  for (let i = 0; i < numSamples; i++) {
    const val = Math.max(-1, Math.min(1, samples[i]))
    buffer.writeInt16LE(Math.round(val * 32767), 44 + i * 2)
  }
  return buffer
}

// 부드러운 사인파 코드 진행
function generateSoft() {
  const total = SAMPLE_RATE * DURATION
  const samples = new Float32Array(total)

  // C major → Am → F → G 코드 진행 (각 2초)
  const chords = [
    [261.63, 329.63, 392.00], // C
    [220.00, 261.63, 329.63], // Am
    [349.23, 440.00, 523.25], // F
    [392.00, 493.88, 587.33], // G
  ]

  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE
    const chordIdx = Math.floor((t % 8) / 2) // 2초마다 코드 변경
    const chord = chords[chordIdx]

    let val = 0
    for (const freq of chord) {
      val += Math.sin(2 * Math.PI * freq * t) * 0.08
    }

    // 부드러운 패드 느낌: 저주파 필터 효과
    val += Math.sin(2 * Math.PI * chord[0] * 0.5 * t) * 0.05

    // 볼륨 엔벨로프 (부드럽게)
    const fadeIn = Math.min(1, t / 2)
    const fadeOut = Math.min(1, (DURATION - t) / 2)
    samples[i] = val * fadeIn * fadeOut
  }
  return samples
}

// 밝은 아르페지오
function generateBright() {
  const total = SAMPLE_RATE * DURATION
  const samples = new Float32Array(total)

  // 밝은 코드: C → G → Am → F
  const notes = [
    523.25, 659.25, 783.99, 659.25, // C chord arpeggio
    392.00, 493.88, 587.33, 493.88, // G
    440.00, 523.25, 659.25, 523.25, // Am
    349.23, 440.00, 523.25, 440.00, // F
  ]

  const noteLen = 0.25 // 각 노트 0.25초

  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE
    const loopT = t % (notes.length * noteLen)
    const noteIdx = Math.floor(loopT / noteLen)
    const noteT = loopT - noteIdx * noteLen
    const freq = notes[noteIdx]

    // 피아노-ish 엔벨로프
    const env = Math.exp(-noteT * 4) * 0.9
    let val = Math.sin(2 * Math.PI * freq * t) * env * 0.15

    // 옥타브 위 하모닉
    val += Math.sin(2 * Math.PI * freq * 2 * t) * env * 0.05

    // 부드러운 베이스
    const bassFreqs = [130.81, 98.00, 110.00, 87.31]
    const bassIdx = Math.floor((t % 4) / 1)
    val += Math.sin(2 * Math.PI * bassFreqs[bassIdx] * t) * 0.06

    const fadeIn = Math.min(1, t / 1.5)
    const fadeOut = Math.min(1, (DURATION - t) / 1.5)
    samples[i] = val * fadeIn * fadeOut
  }
  return samples
}

// 웅장한 느낌 (낮은 옥타브 + 풍성한 하모닉)
function generateEpic() {
  const total = SAMPLE_RATE * DURATION
  const samples = new Float32Array(total)

  // Cm → Ab → Eb → Bb (마이너 진행)
  const chords = [
    [130.81, 155.56, 196.00], // Cm
    [103.83, 130.81, 155.56], // Ab
    [155.56, 196.00, 233.08], // Eb
    [116.54, 146.83, 174.61], // Bb
  ]

  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE
    const chordIdx = Math.floor((t % 8) / 2)
    const chord = chords[chordIdx]

    let val = 0

    // 풍성한 패드 (여러 하모닉)
    for (const freq of chord) {
      val += Math.sin(2 * Math.PI * freq * t) * 0.07
      val += Math.sin(2 * Math.PI * freq * 2 * t) * 0.04
      val += Math.sin(2 * Math.PI * freq * 0.5 * t) * 0.05
    }

    // 느린 LFO로 움직임 추가
    const lfo = 1 + Math.sin(2 * Math.PI * 0.2 * t) * 0.3
    val *= lfo

    // 드럼-ish 킥 (4비트마다)
    const beatPos = t % 1
    if (beatPos < 0.08) {
      val += Math.sin(2 * Math.PI * 60 * t) * Math.exp(-beatPos * 30) * 0.2
    }

    const fadeIn = Math.min(1, t / 3)
    const fadeOut = Math.min(1, (DURATION - t) / 3)
    samples[i] = val * fadeIn * fadeOut
  }
  return samples
}

// 생성 및 저장
const outDir = path.join(__dirname, '..', 'public')

const tracks = [
  { name: 'bgm-soft', fn: generateSoft },
  { name: 'bgm-bright', fn: generateBright },
  { name: 'bgm-epic', fn: generateEpic },
]

for (const { name, fn } of tracks) {
  console.log(`Generating ${name}...`)
  const samples = fn()
  const wav = createWav(samples)
  const outPath = path.join(outDir, `${name}.wav`)
  fs.writeFileSync(outPath, wav)
  console.log(`  → ${outPath} (${(wav.length / 1024 / 1024).toFixed(1)}MB)`)
}

console.log('Done!')

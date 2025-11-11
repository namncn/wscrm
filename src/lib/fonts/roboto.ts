import path from 'node:path'
import { promises as fs } from 'node:fs'

const FONT_DIR = path.join(process.cwd(), 'public', 'fonts')
const REGULAR_FONT_PATH = path.join(FONT_DIR, 'Roboto-Regular.ttf')
const BOLD_FONT_PATH = path.join(FONT_DIR, 'Roboto-Bold.ttf')

let regularFontCache: Uint8Array | null = null
let boldFontCache: Uint8Array | null = null

async function readFontFromDisk(fontPath: string) {
  const data = await fs.readFile(fontPath)
  return new Uint8Array(data)
}

export async function loadRobotoRegularFont() {
  if (!regularFontCache) {
    regularFontCache = await readFontFromDisk(REGULAR_FONT_PATH)
  }
  return regularFontCache
}

export async function loadRobotoBoldFont() {
  if (!boldFontCache) {
    boldFontCache = await readFontFromDisk(BOLD_FONT_PATH)
  }
  return boldFontCache
}


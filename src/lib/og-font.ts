import regularFont from '@fontsource/roboto/files/roboto-latin-400-normal.woff2'
import boldFont from '@fontsource/roboto/files/roboto-latin-700-normal.woff2'

export const ogFonts = [
  new Uint8Array(regularFont as unknown as ArrayBuffer),
  new Uint8Array(boldFont as unknown as ArrayBuffer)
]

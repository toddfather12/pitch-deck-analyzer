// Turn an uploaded file into something Claude can read.
//   PDF / images -> sent natively (Claude sees charts, tables and layout)
//   PPTX / DOCX  -> text extracted here (the API does not accept Office formats)
//   TXT / MD     -> read as text
import JSZip from 'jszip'

export class FileError extends Error {
  constructor(message, { status = 400, code = 'bad_file' } = {}) {
    super(message)
    this.status = status
    this.code = code
  }
}

export const ACCEPT_EXTENSIONS = ['.pdf', '.pptx', '.docx', '.txt', '.md', '.png', '.jpg', '.jpeg', '.webp']
const IMAGE_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }
const MAX_UNCOMPRESSED = 150 * 1024 * 1024 // zip-bomb guard
const MAX_TEXT = 60_000

const ext = (name = '') => (name.toLowerCase().match(/\.[a-z0-9]+$/) ?? [''])[0]
const startsWith = (buf, bytes) => bytes.every((b, i) => buf[i] === b)
const isZip = (b) => startsWith(b, [0x50, 0x4b, 0x03, 0x04])

const decodeEntities = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')

// Paragraph-aware text pull for DrawingML (a:p / a:t) and WordprocessingML (w:p / w:t).
function paragraphs(xml, p, t) {
  const out = []
  for (const para of xml.match(new RegExp(`<${p}[ >][\\s\\S]*?</${p}>`, 'g')) ?? []) {
    const text = (para.match(new RegExp(`<${t}(?: [^>]*)?>[^<]*</${t}>|<a:br\\s*/>|<w:br\\s*/>|<w:tab\\s*/>`, 'g')) ?? [])
      .map((m) => (m.startsWith(`<${t}`) ? decodeEntities(m.replace(/<[^>]+>/g, '')) : m.includes('tab') ? '\t' : '\n'))
      .join('')
      .trim()
    if (text) out.push(text)
  }
  return out
}

async function loadZip(buf) {
  let zip
  try {
    zip = await JSZip.loadAsync(buf)
  } catch {
    throw new FileError('This file looks corrupted or is not a valid Office document.')
  }
  const total = Object.values(zip.files).reduce((n, f) => n + (f._data?.uncompressedSize ?? 0), 0)
  if (total > MAX_UNCOMPRESSED) throw new FileError('This file expands to an unreasonable size and was rejected.')
  return zip
}

const rels = (xml = '') =>
  Object.fromEntries([...xml.matchAll(/<Relationship\b[^>]*>/g)].map(([tag]) => [
    tag.match(/\bId="([^"]+)"/)?.[1],
    { target: tag.match(/\bTarget="([^"]+)"/)?.[1], type: tag.match(/\bType="([^"]+)"/)?.[1] ?? '' },
  ]))

const resolve = (base, target) => {
  if (!target) return null
  if (target.startsWith('/')) return target.slice(1)
  const parts = base.split('/').slice(0, -1)
  for (const seg of target.split('/')) seg === '..' ? parts.pop() : seg !== '.' && parts.push(seg)
  return parts.join('/')
}

async function extractPptx(buf) {
  const zip = await loadZip(buf)
  const read = (name) => zip.file(name)?.async('string')

  // Slide order comes from presentation.xml, not from file names (decks get reordered).
  let slidePaths = []
  const pres = await read('ppt/presentation.xml')
  const presRels = rels(await read('ppt/_rels/presentation.xml.rels'))
  for (const [, rid] of (pres ?? '').matchAll(/<p:sldId\b[^>]*\br:id="([^"]+)"/g)) {
    const path = resolve('ppt/presentation.xml', presRels[rid]?.target)
    if (path && zip.file(path)) slidePaths.push(path)
  }
  if (!slidePaths.length) {
    slidePaths = Object.keys(zip.files)
      .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
      .sort((a, b) => Number(a.match(/\d+/)) - Number(b.match(/\d+/)))
  }
  if (!slidePaths.length) throw new FileError('No slides were found in this presentation.')

  const blocks = []
  const imageOnly = []
  for (const [i, path] of slidePaths.entries()) {
    const xml = (await read(path)) ?? ''
    const lines = paragraphs(xml, 'a:p', 'a:t')
    const alt = [...xml.matchAll(/<p:cNvPr\b[^>]*\bdescr="([^"]+)"/g)].map((m) => `[Image: ${decodeEntities(m[1])}]`)

    let notes = []
    const slideRels = rels(await read(path.replace('slides/', 'slides/_rels/') + '.rels'))
    const notesRel = Object.values(slideRels).find((r) => r.type.endsWith('/notesSlide'))
    const notesPath = notesRel && resolve(path, notesRel.target)
    if (notesPath && zip.file(notesPath)) {
      notes = paragraphs((await read(notesPath)) ?? '', 'a:p', 'a:t').filter((l) => !/^\d+$/.test(l))
    }

    if (!lines.length && /<p:pic\b|<p:graphicFrame\b/.test(xml)) imageOnly.push(i + 1)
    blocks.push(
      [`--- Slide ${i + 1} ---`, ...lines, ...alt, notes.length ? `Speaker notes: ${notes.join(' ')}` : '']
        .filter(Boolean)
        .join('\n'),
    )
  }

  const notesOut = []
  if (imageOnly.length)
    notesOut.push(
      `Slide${imageOnly.length > 1 ? 's' : ''} ${imageOnly.slice(0, 12).join(', ')}${imageOnly.length > 12 ? '…' : ''} ${imageOnly.length > 1 ? 'contain' : 'contains'} only images or charts that could not be read. Export the deck as PDF for a full visual analysis.`,
    )
  return { text: blocks.join('\n\n'), slideCount: slidePaths.length, notes: notesOut }
}

async function extractDocx(buf) {
  const zip = await loadZip(buf)
  const xml = await zip.file('word/document.xml')?.async('string')
  if (!xml) throw new FileError('No document body was found in this Word file.')
  return { text: paragraphs(xml, 'w:p', 'w:t').join('\n'), notes: [] }
}

/**
 * @param {File} file  a Web File from request.formData()
 * @returns {Promise<{ kind: 'pdf'|'image'|'text', name: string, base64?: string, mediaType?: string, text?: string, slideCount?: number, notes: string[] }>}
 */
export async function prepareFile(file) {
  const name = file.name || 'upload'
  const e = ext(name)
  if (['.ppt', '.doc', '.key', '.odp', '.pages'].includes(e))
    throw new FileError(`${e} files are not supported. Export the deck as PDF or PPTX and upload that instead.`, { code: 'unsupported_type' })
  if (!ACCEPT_EXTENSIONS.includes(e))
    throw new FileError(`Unsupported file type "${e || name}". Upload a PDF, PPTX, DOCX, TXT, MD, PNG, JPG or WebP file.`, { code: 'unsupported_type' })
  if (file.size === 0) throw new FileError('The uploaded file is empty.')

  const buf = Buffer.from(await file.arrayBuffer())

  if (e === '.pdf') {
    if (!startsWith(buf, [0x25, 0x50, 0x44, 0x46])) throw new FileError('This file is not a valid PDF.')
    return { kind: 'pdf', name, base64: buf.toString('base64'), notes: [] }
  }
  if (IMAGE_TYPES[e]) {
    const ok = e === '.png' ? startsWith(buf, [0x89, 0x50, 0x4e, 0x47]) : e === '.webp' ? buf.toString('ascii', 8, 12) === 'WEBP' : startsWith(buf, [0xff, 0xd8])
    if (!ok) throw new FileError('This file is not a valid image.')
    return { kind: 'image', name, base64: buf.toString('base64'), mediaType: IMAGE_TYPES[e], notes: [] }
  }

  let result
  if (e === '.pptx' || e === '.docx') {
    if (!isZip(buf)) throw new FileError(`This does not look like a valid ${e.slice(1).toUpperCase()} file.`)
    result = e === '.pptx' ? await extractPptx(buf) : await extractDocx(buf)
  } else {
    result = { text: buf.toString('utf8'), notes: [] }
  }

  if (result.text.length > MAX_TEXT)
    throw new FileError(
      `The extracted text is too long (${result.text.length.toLocaleString()} characters; max ${MAX_TEXT.toLocaleString()}). Upload a shorter deck or a PDF.`,
      { status: 413, code: 'too_long' },
    )
  return { kind: 'text', name, ...result }
}

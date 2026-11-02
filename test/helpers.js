import JSZip from 'jszip'

export const deck = 'Acme sells AI widgets to SMBs for $99/month. We have 40 paying customers and 5% monthly churn.'

export const stub = (message, capture) => ({
  beta: { messages: { stream: (params) => { if (capture) capture.params = params; return { finalMessage: async () => message } } } },
})
export const failing = (err) => ({ beta: { messages: { stream: () => ({ finalMessage: async () => { throw err } }) } } })
export const ok = (obj) => ({
  stop_reason: 'end_turn', model: 'claude-opus-5-5', usage: { input_tokens: 1, output_tokens: 2 },
  content: [{ type: 'text', text: JSON.stringify(obj) }],
})

const para = (t) => `<a:p><a:r><a:t>${t}</a:t></a:r></a:p>`
const slideXml = (lines, extra = '') =>
  `<?xml version="1.0"?><p:sld xmlns:a="a" xmlns:p="p"><p:cSld><p:spTree>${extra}<p:sp><p:txBody>${lines.map(para).join('')}</p:txBody></p:sp></p:spTree></p:cSld></p:sld>`

/** Build a minimal PPTX. File names are slide1..3 but presentation order is 3,1,2 to test ordering. */
export async function makePptx() {
  const z = new JSZip()
  z.file('ppt/presentation.xml', `<p:presentation><p:sldIdLst><p:sldId id="1" r:id="rId3"/><p:sldId id="2" r:id="rId1"/><p:sldId id="3" r:id="rId2"/></p:sldIdLst></p:presentation>`)
  z.file('ppt/_rels/presentation.xml.rels', `<Relationships>
    <Relationship Id="rId1" Type="x/slide" Target="slides/slide1.xml"/>
    <Relationship Id="rId2" Type="x/slide" Target="slides/slide2.xml"/>
    <Relationship Id="rId3" Type="x/slide" Target="slides/slide3.xml"/></Relationships>`)
  z.file('ppt/slides/slide1.xml', slideXml(['Problem', 'Plumbers lose 12% to late invoices &amp; chasing']))
  z.file('ppt/slides/slide2.xml', slideXml(['Business model', '$49/month + 1.2% fee']))
  z.file('ppt/slides/slide3.xml', slideXml(['LoopLedger', 'Invoices from a job photo']))
  z.file('ppt/slides/_rels/slide2.xml.rels', `<Relationships><Relationship Id="rId1" Type="http://x/notesSlide" Target="../notesSlides/notesSlide1.xml"/></Relationships>`)
  z.file('ppt/notesSlides/notesSlide1.xml', slideXml(['Say: churn is 4% monthly', '2']))
  // image-only slide
  z.file('ppt/slides/slide4.xml', `<p:sld><p:cSld><p:spTree><p:pic><p:nvPicPr><p:cNvPr id="4" name="Chart" descr="Revenue chart"/></p:nvPicPr></p:pic></p:spTree></p:cSld></p:sld>`)
  z.file('ppt/presentation.xml', `<p:presentation><p:sldIdLst><p:sldId id="1" r:id="rId3"/><p:sldId id="2" r:id="rId1"/><p:sldId id="3" r:id="rId2"/><p:sldId id="4" r:id="rId4"/></p:sldIdLst></p:presentation>`)
  z.file('ppt/_rels/presentation.xml.rels', `<Relationships>
    <Relationship Id="rId1" Type="x/slide" Target="slides/slide1.xml"/>
    <Relationship Id="rId2" Type="x/slide" Target="slides/slide2.xml"/>
    <Relationship Id="rId3" Type="x/slide" Target="slides/slide3.xml"/>
    <Relationship Id="rId4" Type="x/slide" Target="slides/slide4.xml"/></Relationships>`)
  return z.generateAsync({ type: 'nodebuffer' })
}

export async function makeDocx(paragraphs) {
  const z = new JSZip()
  z.file('word/document.xml', `<w:document><w:body>${paragraphs.map((t) => `<w:p><w:r><w:t>${t}</w:t></w:r></w:p>`).join('')}</w:body></w:document>`)
  return z.generateAsync({ type: 'nodebuffer' })
}

export const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF')
export const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)])

export const fileOf = (buf, name, type = 'application/octet-stream') => new File([buf], name, { type })

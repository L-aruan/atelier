import JSZip from 'jszip';

/** Exported for UI style comparison table */
export const KEY_STYLES = [
  'Normal',
  'Heading 1',
  'Heading 2',
  'Heading 3',
  'Heading 4',
  'Heading 5',
  'Heading 6',
  'Title',
  'Subtitle',
  'List Paragraph',
  'Quote',
  'No Spacing',
  'TOC Heading',
] as const;

const PAPER_SIZES: Record<string, [number, number]> = {
  A4: [21.0, 29.7],
  A3: [29.7, 42.0],
  Letter: [21.59, 27.94],
  Legal: [21.59, 35.56],
  B5: [17.6, 25.0],
  '16K': [18.4, 26.0],
};

export interface FormatOptions {
  pageSetup: boolean;
  docDefaults: boolean;
  styles: boolean;
  headerFooter: boolean;
  numbering: boolean;
  clearParaFormat: boolean;
  clearCharFormat: boolean;
}

export interface DocInfo {
  page: {
    paperSize: string;
    orientation: string;
    margins: { top: number; bottom: number; left: number; right: number };
  };
  defaults: { asciiFont: string | null; eaFont: string | null; size: number | null };
  styles: Record<string, StyleInfo>;
  paragraphCount: number;
  tableCount: number;
  sectionCount: number;
}

export interface StyleInfo {
  name: string;
  asciiFont: string | null;
  eaFont: string | null;
  size: number | null;
  bold: boolean | null;
  italic: boolean | null;
  alignment: string | null;
  lineSpacing: string | null;
}

/** Optional settings when using fast-xml-parser elsewhere (round-trip sensitive paths). */
export const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  preserveOrder: true,
  commentPropName: '#comment',
  cdataPropName: '#cdata',
  trimValues: false,
} as const;

function twipsToCm(twips: number): number {
  return Math.round((twips / 567) * 100) / 100;
}

function detectPaperSize(wCm: number, hCm: number): string {
  for (const [name, [sw, sh]] of Object.entries(PAPER_SIZES)) {
    if (
      (Math.abs(wCm - sw) < 0.5 && Math.abs(hCm - sh) < 0.5) ||
      (Math.abs(wCm - sh) < 0.5 && Math.abs(hCm - sw) < 0.5)
    ) {
      return name;
    }
  }
  return `${wCm}×${hCm}cm`;
}

function attrVal(tag: string, attr: string): string | null {
  const re = new RegExp(`${attr}="([^"]*)"`);
  const m = tag.match(re);
  return m?.[1] ?? null;
}

/** First complete w:tag element starting at start */
export function findBalancedW(xml: string, start: number, local: string): number {
  const open = `<w:${local}`;
  const close = `</w:${local}>`;
  if (!xml.startsWith(open, start)) return -1;
  let depth = 1;
  let i = xml.indexOf('>', start) + 1;
  while (i < xml.length && depth > 0) {
    const nextOpen = xml.indexOf(open, i);
    const nextClose = xml.indexOf(close, i);
    if (nextClose === -1) return -1;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + open.length;
    } else {
      depth--;
      i = nextClose + close.length;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function extractBodyInner(documentXml: string): string | null {
  const m = documentXml.match(/<w:body[^>]*>([\s\S]*?)<\/w:body>/);
  return m?.[1] ?? null;
}

function extractFirstWSectPr(documentXml: string): string | null {
  const idx = documentXml.indexOf('<w:sectPr');
  if (idx === -1) return null;
  const end = findBalancedW(documentXml, idx, 'sectPr');
  if (end === -1) return null;
  return documentXml.slice(idx, end);
}

function extractAllWSectPrs(documentXml: string): string[] {
  const inner = extractBodyInner(documentXml);
  if (!inner) return [];
  const out: string[] = [];
  let i = 0;
  while (i < inner.length) {
    const idx = inner.indexOf('<w:sectPr', i);
    if (idx === -1) break;
    const end = findBalancedW(inner, idx, 'sectPr');
    if (end === -1) break;
    out.push(inner.slice(idx, end));
    i = end;
  }
  return out;
}

function extractSelfOrBlock(parent: string, local: string): string | null {
  const selfRe = new RegExp(`<w:${local}\\b[^/>]*/>`, 'i');
  const selfM = parent.match(selfRe);
  if (selfM) return selfM[0];
  const openIdx = parent.indexOf(`<w:${local}`);
  if (openIdx === -1) return null;
  const end = findBalancedW(parent, openIdx, local);
  if (end === -1) return null;
  return parent.slice(openIdx, end);
}

function replaceInSectPr(sectPr: string, pgSz: string | null, pgMar: string | null): string {
  let s = sectPr;
  if (pgSz) {
    const selfRe = /<w:pgSz\b[^/>]*\/>/i;
    const blockRe = /<w:pgSz\b[^>]*>[\s\S]*?<\/w:pgSz>/i;
    if (selfRe.test(s)) s = s.replace(selfRe, pgSz);
    else if (blockRe.test(s)) s = s.replace(blockRe, pgSz);
    else s = s.replace(/<\/w:sectPr>/i, `${pgSz}</w:sectPr>`);
  }
  if (pgMar) {
    const selfRe = /<w:pgMar\b[^/>]*\/>/i;
    const blockRe = /<w:pgMar\b[^>]*>[\s\S]*?<\/w:pgMar>/i;
    if (selfRe.test(s)) s = s.replace(selfRe, pgMar);
    else if (blockRe.test(s)) s = s.replace(blockRe, pgMar);
    else if (pgSz) {
      s = s.replace(pgSz, `${pgSz}${pgMar}`);
    } else {
      s = s.replace(/<\/w:sectPr>/i, `${pgMar}</w:sectPr>`);
    }
  }
  return s;
}

function applyPageSetupToDocument(targetDoc: string, templateDoc: string): string {
  const tSect = extractFirstWSectPr(templateDoc) ?? extractAllWSectPrs(templateDoc).pop() ?? '';
  if (!tSect) return targetDoc;
  const pgSz = extractSelfOrBlock(tSect, 'pgSz');
  const pgMar = extractSelfOrBlock(tSect, 'pgMar');
  if (!pgSz && !pgMar) return targetDoc;

  const bodyMatch = targetDoc.match(/(<w:body[^>]*>)([\s\S]*?)(<\/w:body>)/);
  if (!bodyMatch) return targetDoc;
  const [, open, inner, close] = bodyMatch;
  let rebuilt = '';
  let i = 0;
  while (i < inner.length) {
    const idx = inner.indexOf('<w:sectPr', i);
    if (idx === -1) {
      rebuilt += inner.slice(i);
      break;
    }
    rebuilt += inner.slice(i, idx);
    const end = findBalancedW(inner, idx, 'sectPr');
    if (end === -1) {
      rebuilt += inner.slice(idx);
      break;
    }
    let block = inner.slice(idx, end);
    block = replaceInSectPr(block, pgSz, pgMar);
    rebuilt += block;
    i = end;
  }
  return targetDoc.replace(bodyMatch[0], `${open}${rebuilt}${close}`);
}

function replaceDocDefaults(targetStyles: string, templateStyles: string): string {
  const defRe = /<w:docDefaults>[\s\S]*?<\/w:docDefaults>/;
  const t = templateStyles.match(defRe);
  if (!t) return targetStyles;
  if (defRe.test(targetStyles)) return targetStyles.replace(defRe, t[0]);
  const insertPoint = targetStyles.indexOf('<w:styles');
  if (insertPoint === -1) return targetStyles;
  const gt = targetStyles.indexOf('>', insertPoint);
  if (gt === -1) return targetStyles;
  return `${targetStyles.slice(0, gt + 1)}${t[0]}${targetStyles.slice(gt + 1)}`;
}

function extractStyleChunks(stylesXml: string): Map<string, string> {
  const map = new Map<string, string>();
  let i = 0;
  while (i < stylesXml.length) {
    const start = stylesXml.indexOf('<w:style', i);
    if (start === -1) break;
    const end = findBalancedW(stylesXml, start, 'style');
    if (end === -1) break;
    const chunk = stylesXml.slice(start, end);
    const idM = chunk.match(/w:styleId="([^"]+)"/);
    if (idM) map.set(idM[1], chunk);
    i = end;
  }
  return map;
}

function mergeStyles(targetStyles: string, templateStyles: string): string {
  const tMap = extractStyleChunks(templateStyles);
  if (tMap.size === 0) return targetStyles;
  const dMap = extractStyleChunks(targetStyles);
  for (const [id, tChunk] of tMap) {
    const existing = dMap.get(id);
    if (existing) {
      targetStyles = targetStyles.replace(existing, tChunk);
    } else {
      const closeIdx = targetStyles.lastIndexOf('</w:styles>');
      if (closeIdx === -1) return targetStyles;
      targetStyles = `${targetStyles.slice(0, closeIdx)}${tChunk}\n${targetStyles.slice(closeIdx)}`;
    }
    dMap.set(id, tChunk);
  }
  return targetStyles;
}

function parseRels(xml: string | undefined): { id: string; type: string; target: string }[] {
  if (!xml) return [];
  const out: { id: string; type: string; target: string }[] = [];
  const re = /<Relationship\s+([^>]+)\/>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const attrs = m[1];
    const id = /Id="([^"]+)"/.exec(attrs)?.[1];
    const type = /Type="([^"]+)"/.exec(attrs)?.[1];
    const target = /Target="([^"]+)"/.exec(attrs)?.[1];
    if (id && type && target) out.push({ id, type, target });
  }
  return out;
}

function normalizeWordPath(target: string): string {
  const t = target.replace(/^\.\//, '');
  return t.startsWith('word/') ? t : `word/${t}`;
}

async function copyHeaderFooterFromTemplate(templateZip: JSZip, outZip: JSZip): Promise<boolean> {
  const tRels = await templateZip.file('word/_rels/document.xml.rels')?.async('string');
  const dRelsXml = await outZip.file('word/_rels/document.xml.rels')?.async('string');
  if (!dRelsXml) return false;

  const tRelsList = parseRels(tRels);
  const dRelsList = parseRels(dRelsXml);

  const tHeader = tRelsList.find((r) => r.type.includes('header'));
  const tFooter = tRelsList.find((r) => r.type.includes('footer'));
  if (!tHeader && !tFooter) return false;

  let copied = false;

  if (tHeader) {
    const path = normalizeWordPath(tHeader.target);
    const content = await templateZip.file(path)?.async('string');
    if (content) {
      const dHeaders = dRelsList.filter((r) => r.type.includes('header'));
      for (const r of dHeaders) {
        const p = normalizeWordPath(r.target);
        outZip.file(p, content);
        copied = true;
      }
    }
  }

  if (tFooter) {
    const path = normalizeWordPath(tFooter.target);
    const content = await templateZip.file(path)?.async('string');
    if (content) {
      const dFooters = dRelsList.filter((r) => r.type.includes('footer'));
      for (const r of dFooters) {
        const p = normalizeWordPath(r.target);
        outZip.file(p, content);
        copied = true;
      }
    }
  }

  return copied;
}

function extractAbstractNums(numberingXml: string): Map<string, string> {
  const map = new Map<string, string>();
  let i = 0;
  while (i < numberingXml.length) {
    const start = numberingXml.indexOf('<w:abstractNum', i);
    if (start === -1) break;
    const end = findBalancedW(numberingXml, start, 'abstractNum');
    if (end === -1) break;
    const chunk = numberingXml.slice(start, end);
    const idM = chunk.match(/w:abstractNumId="([^"]+)"/);
    if (idM) map.set(idM[1], chunk);
    i = end;
  }
  return map;
}

function mergeNumbering(targetNum: string, templateNum: string): string {
  const tMap = extractAbstractNums(templateNum);
  if (tMap.size === 0) return targetNum;
  const dMap = extractAbstractNums(targetNum);
  let result = targetNum;
  for (const [id, chunk] of tMap) {
    const existing = dMap.get(id);
    if (existing) {
      result = result.replace(existing, chunk);
    } else {
      const firstNum = result.indexOf('<w:num');
      if (firstNum !== -1) {
        result = `${result.slice(0, firstNum)}${chunk}\n${result.slice(firstNum)}`;
      } else {
        const close = result.lastIndexOf('</w:numbering>');
        if (close !== -1) {
          result = `${result.slice(0, close)}${chunk}\n${result.slice(close)}`;
        }
      }
    }
    dMap.set(id, chunk);
  }
  return result;
}

const PPR_KEEP = new Set(['pStyle', 'numPr', 'sectPr']);

function filterWTopLevelChildren(fragment: string, keep: Set<string>): string {
  let i = 0;
  let out = '';
  while (i < fragment.length) {
    while (i < fragment.length && /\s/.test(fragment[i])) i++;
    const m = fragment.slice(i).match(/^<w:([a-zA-Z0-9]+)\b/);
    if (!m) {
      i++;
      continue;
    }
    const start = i + (m.index ?? 0);
    const tag = m[1];
    const end = findBalancedW(fragment, start, tag);
    if (end === -1) break;
    const chunk = fragment.slice(start, end);
    if (keep.has(tag)) out += chunk;
    i = end;
  }
  return out;
}

function stripParagraphDirectFormatting(pXml: string): string {
  if (/m:oMathPara\b/.test(pXml)) return pXml;
  const pPrStart = pXml.indexOf('<w:pPr');
  if (pPrStart === -1) return pXml;
  const pPrEnd = findBalancedW(pXml, pPrStart, 'pPr');
  if (pPrEnd === -1) return pXml;
  const innerStart = pXml.indexOf('>', pPrStart) + 1;
  const innerEnd = pPrEnd - '</w:pPr>'.length;
  const inner = pXml.slice(innerStart, innerEnd);
  const newInner = filterWTopLevelChildren(inner, PPR_KEEP);
  return `${pXml.slice(0, innerStart)}${newInner}${pXml.slice(innerEnd)}`;
}

const RPR_KEEP = new Set(['rStyle']);

function stripRunDirectFormatting(rXml: string): string {
  if (
    rXml.includes('<w:drawing') ||
    rXml.includes('<w:pict') ||
    rXml.includes('<w:object')
  ) {
    return rXml;
  }
  const rPrStart = rXml.indexOf('<w:rPr');
  if (rPrStart === -1) return rXml;
  const rPrEnd = findBalancedW(rXml, rPrStart, 'rPr');
  if (rPrEnd === -1) return rXml;
  const innerStart = rXml.indexOf('>', rPrStart) + 1;
  const innerEnd = rPrEnd - '</w:rPr>'.length;
  const inner = rXml.slice(innerStart, innerEnd);
  const newInner = filterWTopLevelChildren(inner, RPR_KEEP);
  return `${rXml.slice(0, innerStart)}${newInner}${rXml.slice(innerEnd)}`;
}

function mapRunsInParagraph(pXml: string): string {
  let i = 0;
  let out = '';
  while (i < pXml.length) {
    const rStart = pXml.indexOf('<w:r', i);
    if (rStart === -1) {
      out += pXml.slice(i);
      break;
    }
    out += pXml.slice(i, rStart);
    const rEnd = findBalancedW(pXml, rStart, 'r');
    if (rEnd === -1) {
      out += pXml.slice(rStart);
      break;
    }
    out += stripRunDirectFormatting(pXml.slice(rStart, rEnd));
    i = rEnd;
  }
  return out;
}

function transformBodyTopLevelParagraphs(bodyInner: string, mapP: (p: string) => string): string {
  let i = 0;
  let out = '';
  while (i < bodyInner.length) {
    if (bodyInner.startsWith('<w:p', i)) {
      const end = findBalancedW(bodyInner, i, 'p');
      if (end === -1) {
        out += bodyInner.slice(i);
        break;
      }
      out += mapP(bodyInner.slice(i, end));
      i = end;
      continue;
    }
    if (bodyInner.startsWith('<w:tbl', i)) {
      const end = findBalancedW(bodyInner, i, 'tbl');
      if (end === -1) {
        out += bodyInner.slice(i);
        break;
      }
      out += bodyInner.slice(i, end);
      i = end;
      continue;
    }
    const nextP = bodyInner.indexOf('<w:p', i);
    const nextTbl = bodyInner.indexOf('<w:tbl', i);
    const candidates = [nextP, nextTbl].filter((x) => x >= 0);
    const next = candidates.length ? Math.min(...candidates) : -1;
    if (next === -1) {
      out += bodyInner.slice(i);
      break;
    }
    out += bodyInner.slice(i, next);
    i = next;
  }
  return out;
}

function clearParagraphDirectInDocument(documentXml: string): string {
  const m = documentXml.match(/(<w:body[^>]*>)([\s\S]*?)(<\/w:body>)/);
  if (!m) return documentXml;
  const [, open, inner, close] = m;
  const rebuilt = transformBodyTopLevelParagraphs(inner, (p) => stripParagraphDirectFormatting(p));
  return documentXml.replace(m[0], `${open}${rebuilt}${close}`);
}

function clearCharacterDirectInDocument(documentXml: string): string {
  const m = documentXml.match(/(<w:body[^>]*>)([\s\S]*?)(<\/w:body>)/);
  if (!m) return documentXml;
  const [, open, inner, close] = m;
  const rebuilt = transformBodyTopLevelParagraphs(inner, mapRunsInParagraph);
  return documentXml.replace(m[0], `${open}${rebuilt}${close}`);
}

function countBodyTopLevelTables(bodyInner: string): number {
  let n = 0;
  let i = 0;
  while (i < bodyInner.length) {
    if (bodyInner.startsWith('<w:tbl', i)) {
      n++;
      const end = findBalancedW(bodyInner, i, 'tbl');
      if (end === -1) break;
      i = end;
    } else {
      i++;
    }
  }
  return n;
}

function countBodyTopLevelParagraphs(bodyInner: string): number {
  let n = 0;
  let i = 0;
  while (i < bodyInner.length) {
    if (bodyInner.startsWith('<w:p', i)) {
      n++;
      const end = findBalancedW(bodyInner, i, 'p');
      if (end === -1) break;
      i = end;
    } else if (bodyInner.startsWith('<w:tbl', i)) {
      const end = findBalancedW(bodyInner, i, 'tbl');
      if (end === -1) break;
      i = end;
    } else {
      i++;
    }
  }
  return n;
}

function pageInfoFromSectPr(sectPrXml: string): {
  paperSize: string;
  orientation: string;
  margins: { top: number; bottom: number; left: number; right: number };
} {
  const pgSz = extractSelfOrBlock(sectPrXml, 'pgSz') ?? '';
  const pgMar = extractSelfOrBlock(sectPrXml, 'pgMar') ?? '';
  const wTw = pgSz ? parseInt(attrVal(pgSz, 'w:w') ?? '0', 10) : 0;
  const hTw = pgSz ? parseInt(attrVal(pgSz, 'w:h') ?? '0', 10) : 0;
  const orient = attrVal(pgSz, 'w:orient');
  const wCm = wTw ? twipsToCm(wTw) : 0;
  const hCm = hTw ? twipsToCm(hTw) : 0;
  const top = pgMar ? twipsToCm(parseInt(attrVal(pgMar, 'w:top') ?? '0', 10)) : 0;
  const bottom = pgMar ? twipsToCm(parseInt(attrVal(pgMar, 'w:bottom') ?? '0', 10)) : 0;
  const left = pgMar ? twipsToCm(parseInt(attrVal(pgMar, 'w:left') ?? '0', 10)) : 0;
  const right = pgMar ? twipsToCm(parseInt(attrVal(pgMar, 'w:right') ?? '0', 10)) : 0;
  return {
    paperSize: wCm && hCm ? detectPaperSize(wCm, hCm) : '—',
    orientation: orient === 'landscape' ? 'landscape' : 'portrait',
    margins: { top, bottom, left, right },
  };
}

function readDocDefaults(stylesXml: string): {
  asciiFont: string | null;
  eaFont: string | null;
  size: number | null;
} {
  const def = stylesXml.match(/<w:docDefaults>[\s\S]*?<\/w:docDefaults>/);
  if (!def) return { asciiFont: null, eaFont: null, size: null };
  const block = def[0];
  const rFonts = block.match(/<w:rFonts\b[^/>]*\/>/)?.[0] ?? '';
  const ascii = attrVal(rFonts, 'w:ascii') ?? attrVal(rFonts, 'w:asciiTheme');
  const ea = attrVal(rFonts, 'w:eastAsia') ?? attrVal(rFonts, 'w:eastAsiaTheme');
  const sz = block.match(/<w:sz\b[^/>]*\/>/)?.[0];
  const szVal = sz ? attrVal(sz, 'w:val') : null;
  const size = szVal ? parseInt(szVal, 10) / 2 : null;
  return { asciiFont: ascii ?? null, eaFont: ea ?? null, size };
}

const ALIGN_MAP: Record<string, string> = {
  left: '左对齐',
  center: '居中',
  right: '右对齐',
  both: '两端对齐',
  distribute: '分散对齐',
};

function styleSummaryFromChunk(styleChunk: string, displayName: string): StyleInfo | null {
  const nameEl = styleChunk.match(/<w:name\b[^>]*\/>/)?.[0];
  const nameVal = nameEl ? attrVal(nameEl, 'w:val') : null;
  if (!nameVal) return null;

  const rPrStart = styleChunk.indexOf('<w:rPr');
  let ascii: string | null = null;
  let ea: string | null = null;
  let size: number | null = null;
  let bold: boolean | null = null;
  let italic: boolean | null = null;
  let alignment: string | null = null;
  let lineSpacing: string | null = null;

  if (rPrStart !== -1) {
    const rPrEnd = findBalancedW(styleChunk, rPrStart, 'rPr');
    if (rPrEnd !== -1) {
      const rPr = styleChunk.slice(rPrStart, rPrEnd);
      const rf = rPr.match(/<w:rFonts\b[^/>]*\/>/)?.[0];
      if (rf) {
        ascii = attrVal(rf, 'w:ascii');
        ea = attrVal(rf, 'w:eastAsia');
      }
      const sz = rPr.match(/<w:sz\b[^/>]*\/>/)?.[0];
      const szVal = sz ? attrVal(sz, 'w:val') : null;
      if (szVal) size = parseInt(szVal, 10) / 2;
      const b = rPr.match(/<w:b\b[^/>]*\/>/)?.[0];
      if (b) {
        const v = attrVal(b, 'w:val');
        bold = v ? v !== '0' && v !== 'false' : true;
      }
      const it = rPr.match(/<w:i\b[^/>]*\/>/)?.[0];
      if (it) {
        const v = attrVal(it, 'w:val');
        italic = v ? v !== '0' && v !== 'false' : true;
      }
    }
  }

  const pPrStart = styleChunk.indexOf('<w:pPr');
  if (pPrStart !== -1) {
    const pPrEnd = findBalancedW(styleChunk, pPrStart, 'pPr');
    if (pPrEnd !== -1) {
      const pPr = styleChunk.slice(pPrStart, pPrEnd);
      const jc = pPr.match(/<w:jc\b[^/>]*\/>/)?.[0];
      if (jc) {
        const raw = attrVal(jc, 'w:val');
        alignment = raw ? ALIGN_MAP[raw] ?? raw : null;
      }
      const sp = pPr.match(/<w:spacing\b[^/>]*\/>/)?.[0];
      if (sp) {
        const line = attrVal(sp, 'w:line');
        const rule = attrVal(sp, 'w:lineRule');
        if (line) {
          const lv = parseInt(line, 10);
          if (rule === 'auto') lineSpacing = `${(lv / 240).toFixed(1)}倍`;
          else lineSpacing = `${lv / 20}pt`;
        }
      }
    }
  }

  return {
    name: displayName,
    asciiFont: ascii,
    eaFont: ea,
    size,
    bold,
    italic,
    alignment,
    lineSpacing,
  };
}

function extractStyleByDisplayName(stylesXml: string, wanted: string): StyleInfo | null {
  let i = 0;
  while (i < stylesXml.length) {
    const start = stylesXml.indexOf('<w:style', i);
    if (start === -1) break;
    const end = findBalancedW(stylesXml, start, 'style');
    if (end === -1) break;
    const chunk = stylesXml.slice(start, end);
    const nameEl = chunk.match(/<w:name\b[^/>]*\/>/)?.[0];
    const nameVal = nameEl ? attrVal(nameEl, 'w:val') : null;
    if (nameVal === wanted) {
      return styleSummaryFromChunk(chunk, wanted);
    }
    i = end;
  }
  return null;
}

export async function loadDocxInfo(fileBuffer: ArrayBuffer): Promise<DocInfo> {
  const zip = await JSZip.loadAsync(fileBuffer);
  const documentXml = await zip.file('word/document.xml')?.async('string');
  const stylesXml = (await zip.file('word/styles.xml')?.async('string')) ?? '';

  const sects = documentXml ? extractAllWSectPrs(documentXml) : [];
  const firstSect = sects[0] ?? (documentXml ? extractFirstWSectPr(documentXml) : null) ?? '';
  const page = firstSect ? pageInfoFromSectPr(firstSect) : {
    paperSize: '—',
    orientation: 'portrait',
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  };

  const defaults = readDocDefaults(stylesXml);
  const styles: Record<string, StyleInfo> = {};
  for (const name of KEY_STYLES) {
    const s = extractStyleByDisplayName(stylesXml, name);
    if (s) styles[name] = s;
  }

  const bodyInner = documentXml ? extractBodyInner(documentXml) : null;
  const paragraphCount = bodyInner ? countBodyTopLevelParagraphs(bodyInner) : 0;
  const tableCount = bodyInner ? countBodyTopLevelTables(bodyInner) : 0;
  const sectionCount = sects.length > 0 ? sects.length : documentXml ? 1 : 0;

  return {
    page,
    defaults,
    styles,
    paragraphCount,
    tableCount,
    sectionCount,
  };
}

export async function applyFormat(
  templateBuffer: ArrayBuffer,
  targetBuffer: ArrayBuffer,
  options: FormatOptions,
): Promise<ArrayBuffer> {
  const templateZip = await JSZip.loadAsync(templateBuffer);
  const outZip = await JSZip.loadAsync(targetBuffer);

  let docXml = await outZip.file('word/document.xml')?.async('string');
  const templateDocXml = await templateZip.file('word/document.xml')?.async('string');
  let documentXmlDirty = false;

  if (docXml && templateDocXml && options.pageSetup) {
    docXml = applyPageSetupToDocument(docXml, templateDocXml);
    documentXmlDirty = true;
  }

  if (options.docDefaults || options.styles) {
    let targetStyles = await outZip.file('word/styles.xml')?.async('string');
    const templateStyles = await templateZip.file('word/styles.xml')?.async('string');
    if (targetStyles && templateStyles) {
      if (options.docDefaults) targetStyles = replaceDocDefaults(targetStyles, templateStyles);
      if (options.styles) targetStyles = mergeStyles(targetStyles, templateStyles);
      outZip.file('word/styles.xml', targetStyles);
    }
  }

  if (options.headerFooter) {
    await copyHeaderFooterFromTemplate(templateZip, outZip);
  }

  if (options.numbering) {
    const tNum = await templateZip.file('word/numbering.xml')?.async('string');
    let dNum = await outZip.file('word/numbering.xml')?.async('string');
    if (tNum && dNum) {
      dNum = mergeNumbering(dNum, tNum);
      outZip.file('word/numbering.xml', dNum);
    }
  }

  if (docXml) {
    if (options.clearParaFormat) {
      docXml = clearParagraphDirectInDocument(docXml);
      documentXmlDirty = true;
    }
    if (options.clearCharFormat) {
      docXml = clearCharacterDirectInDocument(docXml);
      documentXmlDirty = true;
    }
    if (documentXmlDirty) {
      outZip.file('word/document.xml', docXml);
    }
  }

  const buf = await outZip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
  return buf;
}

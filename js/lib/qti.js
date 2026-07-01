// ===== QTI 2.1 builder & parser =====
// Produces IMS Content Packages (a .zip of assessmentItem XMLs + imsmanifest.xml)
// that import into Canvas, Moodle, Blackboard, Brightspace, etc. Also parses
// QTI 1.2 and 2.x XML back into the canonical model.
import { makeQuestion, normalize, isChoiceType, escapeHtml } from './model.js';

const esc = escapeHtml;

/* ----------------------------------------------- build one assessmentItem -- */
export function itemToQTI(q, identifier) {
  const id = identifier || q.id;
  if (isChoiceType(q.type)) return choiceItem(q, id);
  if (q.type === 'short' || q.type === 'fib') return textEntryItem(q, id);
  return essayItem(q, id);
}

function choiceItem(q, id) {
  const multi = q.type === 'multi';
  const correctIds = [];
  const choices = q.choices.map((c, i) => {
    const cid = `${id}_c${i}`;
    if (c.correct) correctIds.push(cid);
    return `      <simpleChoice identifier="${cid}">${esc(c.text)}</simpleChoice>`;
  }).join('\n');
  const maxChoices = multi ? 0 : 1; // 0 = unlimited
  const correctResponse = correctIds.map((c) => `      <value>${c}</value>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<assessmentItem xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqti_v2p1 http://www.imsglobal.org/xsd/qti/qtiv2p1/imsqti_v2p1.xsd"
  identifier="${id}" title="${esc(title(q))}" adaptive="false" timeDependent="false">
  <responseDeclaration identifier="RESPONSE" cardinality="${multi ? 'multiple' : 'single'}" baseType="identifier">
    <correctResponse>
${correctResponse}
    </correctResponse>
  </responseDeclaration>
  <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float">
    <defaultValue><value>0</value></defaultValue>
  </outcomeDeclaration>
  <itemBody>
    <choiceInteraction responseIdentifier="RESPONSE" shuffle="false" maxChoices="${maxChoices}">
      <prompt>${esc(q.stem)}</prompt>
${choices}
    </choiceInteraction>
  </itemBody>
  <responseProcessing template="http://www.imsglobal.org/question/qti_v2p1/rptemplates/match_correct"/>
</assessmentItem>`;
}

function textEntryItem(q, id) {
  const answers = (q.answers && q.answers.length ? q.answers : ['']);
  const correct = answers.map((a) => `      <value>${esc(a)}</value>`).join('\n');
  const mapping = answers.map((a) => `      <mapEntry mapKey="${esc(a)}" mappedValue="${q.points ?? 1}"/>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<assessmentItem xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1"
  identifier="${id}" title="${esc(title(q))}" adaptive="false" timeDependent="false">
  <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="string">
    <correctResponse>
${correct}
    </correctResponse>
    <mapping defaultValue="0">
${mapping}
    </mapping>
  </responseDeclaration>
  <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float">
    <defaultValue><value>0</value></defaultValue>
  </outcomeDeclaration>
  <itemBody>
    <p>${esc(q.stem)}</p>
    <textEntryInteraction responseIdentifier="RESPONSE" expectedLength="20"/>
  </itemBody>
  <responseProcessing template="http://www.imsglobal.org/question/qti_v2p1/rptemplates/map_response"/>
</assessmentItem>`;
}

function essayItem(q, id) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<assessmentItem xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1"
  identifier="${id}" title="${esc(title(q))}" adaptive="false" timeDependent="false">
  <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="string"/>
  <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float">
    <defaultValue><value>0</value></defaultValue>
  </outcomeDeclaration>
  <itemBody>
    <p>${esc(q.stem)}</p>
    <extendedTextInteraction responseIdentifier="RESPONSE" expectedLines="6"/>
  </itemBody>
</assessmentItem>`;
}

function title(q) {
  const t = (q.stem || 'Question').replace(/\s+/g, ' ').trim();
  return t.length > 60 ? t.slice(0, 57) + '…' : t;
}

/* --------------------------------------------------- build content package -- */
// Returns a Blob (zip). Requires JSZip on window.
export async function buildPackage(questions, { title: packTitle = 'OpenAssess Item Bank' } = {}) {
  if (!window.JSZip) throw new Error('JSZip not loaded');
  const zip = new window.JSZip();
  const resources = [];
  questions.forEach((q, i) => {
    const id = `item_${String(i + 1).padStart(4, '0')}`;
    const file = `items/${id}.xml`;
    zip.file(file, itemToQTI(q, id));
    resources.push({ id, file });
  });
  zip.file('imsmanifest.xml', manifest(resources, packTitle));
  return zip.generateAsync({ type: 'blob' });
}

function manifest(resources, packTitle) {
  const res = resources.map((r) => `    <resource identifier="${r.id}_res" type="imsqti_item_xmlv2p1" href="${r.file}">
      <file href="${r.file}"/>
    </resource>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="MANIFEST_${Date.now()}" xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_v1p2"
  xmlns:imsqti="http://www.imsglobal.org/xsd/imsqti_metadata_v2p1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <metadata>
    <schema>QTIv2.1 Package</schema>
    <schemaversion>1.0.0</schemaversion>
    <imsmd:lom><imsmd:general><imsmd:title><imsmd:langstring>${esc(packTitle)}</imsmd:langstring></imsmd:title></imsmd:general></imsmd:lom>
  </metadata>
  <organizations/>
  <resources>
${res}
  </resources>
</manifest>`;
}

/* --------------------------------------------------------------- parse QTI -- */
// Accepts a single assessmentItem (2.x) or an old QTI 1.2 <item>. Returns [Question].
export function parseQTI(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Invalid XML');
  const out = [];
  // QTI 2.x
  doc.querySelectorAll('assessmentItem').forEach((item) => {
    const q = parseV2Item(item);
    if (q) out.push(q);
  });
  // QTI 1.2 (Respondus / older Canvas exports)
  if (out.length === 0) {
    doc.querySelectorAll('item').forEach((item) => {
      const q = parseV1Item(item);
      if (q) out.push(q);
    });
  }
  return out;
}

function local(el) { return el.localName || el.nodeName.replace(/^.*:/, ''); }
function byLocal(root, name) {
  return [...root.getElementsByTagName('*')].filter((e) => local(e) === name);
}

function parseV2Item(item) {
  const promptEl = byLocal(item, 'prompt')[0] || byLocal(item, 'itemBody')[0];
  const stem = (promptEl ? promptEl.textContent : '').replace(/\s+/g, ' ').trim();
  const choiceInteraction = byLocal(item, 'choiceInteraction')[0];
  const textEntry = byLocal(item, 'textEntryInteraction')[0];
  const extended = byLocal(item, 'extendedTextInteraction')[0];
  const correctVals = byLocal(item, 'correctResponse')[0]
    ? byLocal(byLocal(item, 'correctResponse')[0], 'value').map((v) => v.textContent.trim())
    : [];

  if (choiceInteraction) {
    const choices = byLocal(choiceInteraction, 'simpleChoice').map((sc) => ({
      text: sc.textContent.replace(/\s+/g, ' ').trim(),
      correct: correctVals.includes(sc.getAttribute('identifier')),
    }));
    const nCorrect = choices.filter((c) => c.correct).length;
    const isTF = choices.length === 2 && choices.every((c) => /^(true|false)$/i.test(c.text));
    return normalize(makeQuestion({
      type: isTF ? 'tf' : nCorrect > 1 ? 'multi' : 'mc',
      stem: byLocal(choiceInteraction, 'prompt')[0]?.textContent.trim() || stem,
      choices, source: 'QTI 2.x',
    }));
  }
  if (textEntry) {
    return normalize(makeQuestion({ type: 'short', stem, answers: correctVals, source: 'QTI 2.x' }));
  }
  if (extended) {
    return normalize(makeQuestion({ type: 'essay', stem, source: 'QTI 2.x' }));
  }
  return null;
}

function parseV1Item(item) {
  const mattext = byLocal(item, 'mattext')[0];
  const stem = (mattext ? mattext.textContent : item.getAttribute('title') || '').replace(/\s+/g, ' ').trim();
  const labels = byLocal(item, 'response_label');
  const correctIds = byLocal(item, 'varequal').map((v) => v.textContent.trim());
  if (labels.length) {
    const choices = labels.map((l) => {
      const t = byLocal(l, 'mattext')[0];
      return { text: t ? t.textContent.replace(/\s+/g, ' ').trim() : '', correct: correctIds.includes(l.getAttribute('ident')) };
    });
    const isTF = choices.length === 2 && choices.every((c) => /^(true|false)$/i.test(c.text));
    return normalize(makeQuestion({ type: isTF ? 'tf' : 'mc', stem, choices, source: 'QTI 1.2' }));
  }
  if (correctIds.length) {
    return normalize(makeQuestion({ type: 'short', stem, answers: correctIds, source: 'QTI 1.2' }));
  }
  return null;
}

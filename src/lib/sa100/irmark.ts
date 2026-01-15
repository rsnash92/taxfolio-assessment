/**
 * IRmark Calculator
 *
 * The IRmark is a digital signature that authenticates the content of an
 * SA100 submission. HMRC uses it to verify the return hasn't been tampered with.
 *
 * Algorithm (based on HMRC's "IRmark Generation Step By Step Guide v2.0"):
 * 1. Extract the <Body> element (including Body tags)
 * 2. INHERIT namespace declarations from <GovTalkMessage> onto <Body>
 * 3. Remove <IRmark> element (preserving surrounding whitespace)
 * 4. Apply W3C Canonical XML (C14N) - http://www.w3.org/TR/2001/REC-xml-c14n-20010315
 * 5. Compute SHA-1 hash (160 bits / 20 bytes)
 * 6. Base64 encode → 28 character string
 *
 * Reference: HMRC IRmark Step-by-Step Guide v2.0
 */

import { createHash } from 'crypto'
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'
import { IRMARK_CONFIG } from './schema-reference'

/**
 * Calculate the IRmark for an XML document
 *
 * @param xmlContent - The complete GovTalk XML content
 * @returns Base64-encoded SHA-1 hash (28 characters)
 */
export function calculateIRmark(xmlContent: string): string {
  // Step 1: Parse the full GovTalkMessage XML
  const doc = new DOMParser().parseFromString(xmlContent, 'text/xml')
  const govTalkMessage = doc.documentElement

  // Step 2: Extract namespace declarations from GovTalkMessage root
  const inheritedNamespaces = extractNamespaces(govTalkMessage)

  // Step 3: Find and extract Body element
  let bodyElement = findBodyElement(doc)
  if (!bodyElement) {
    throw new Error('Body element not found in XML')
  }

  // Step 4: Clone body and add inherited namespaces
  const bodyClone = bodyElement.cloneNode(true) as Element

  // Add inherited namespaces to Body element for IRmark calculation
  for (const [prefix, uri] of Object.entries(inheritedNamespaces)) {
    const attrName = prefix === '' ? 'xmlns' : `xmlns:${prefix}`
    if (!bodyClone.hasAttribute(attrName)) {
      bodyClone.setAttribute(attrName, uri)
    }
  }

  // Step 5: Remove IRmark element (preserving whitespace around it)
  removeIRmarkElement(bodyClone)

  // Step 6: Serialize to string
  const serializer = new XMLSerializer()
  const bodyXml = serializer.serializeToString(bodyClone)

  // Step 7: Apply C14N canonicalization
  const canonicalized = canonicalizeC14N(bodyXml)

  // Step 8: SHA-1 hash
  const hash = createHash(IRMARK_CONFIG.algorithm).update(canonicalized, 'utf8').digest()

  // Step 9: Base64 encode (should be exactly 28 characters)
  return hash.toString('base64')
}

/**
 * Extract all namespace declarations from an element
 */
function extractNamespaces(element: Element): Record<string, string> {
  const namespaces: Record<string, string> = {}

  const attrs = element.attributes
  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs[i]
    if (attr.name === 'xmlns') {
      namespaces[''] = attr.value
    } else if (attr.name.startsWith('xmlns:')) {
      const prefix = attr.name.substring(6)
      namespaces[prefix] = attr.value
    }
  }

  return namespaces
}

/**
 * Find Body element in document (with or without namespace prefix)
 */
function findBodyElement(doc: Document): Element | null {
  // Try without namespace
  const bodyElements = doc.getElementsByTagName('Body')
  if (bodyElements.length > 0) {
    return bodyElements[0] as Element
  }

  // Try with GovTalk namespace
  const bodyElementsNS = doc.getElementsByTagNameNS(
    'http://www.govtalk.gov.uk/CM/envelope',
    'Body'
  )
  if (bodyElementsNS.length > 0) {
    return bodyElementsNS[0] as Element
  }

  // Try with hd: prefix (common in HMRC docs)
  const hdBodyElements = doc.getElementsByTagName('hd:Body')
  if (hdBodyElements.length > 0) {
    return hdBodyElements[0] as Element
  }

  return null
}

/**
 * Remove IRmark element from Body while preserving whitespace
 * HMRC requirement: "any data around the IRmark opening and closing tags
 * e.g. white space, line-endings, tabs etc must be preserved"
 */
function removeIRmarkElement(element: Element): void {
  // Find IRmark elements recursively
  const irmarkElements: Element[] = []

  function findIRmark(node: Element) {
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i]
      if (child.nodeType === 1) {
        // Element node
        const el = child as Element
        const localName = el.localName || el.nodeName.split(':').pop()
        if (localName === 'IRmark') {
          irmarkElements.push(el)
        } else {
          findIRmark(el)
        }
      }
    }
  }

  findIRmark(element)

  // Remove each IRmark element
  for (const irmark of irmarkElements) {
    const parent = irmark.parentNode
    if (parent) {
      parent.removeChild(irmark)
    }
  }
}

/**
 * Apply W3C Canonical XML (C14N) - Inclusive without comments
 * Algorithm: http://www.w3.org/TR/2001/REC-xml-c14n-20010315
 *
 * Key transformations:
 * - UTF-8 encoding
 * - Line breaks normalized to LF (0x0A)
 * - Empty elements as <element></element> not <element/>
 * - Attributes sorted by namespace URI then local name
 * - Namespace declarations sorted
 * - No XML declaration
 */
function canonicalizeC14N(xml: string): string {
  const doc = new DOMParser().parseFromString(xml, 'text/xml')

  if (!doc.documentElement) {
    throw new Error('Failed to parse XML for canonicalization')
  }

  return canonicalizeNode(doc.documentElement)
}

/**
 * Recursively canonicalize a node and its children
 */
function canonicalizeNode(node: Element): string {
  const parts: string[] = []

  // Start tag
  const tagName = node.nodeName
  parts.push(`<${tagName}`)

  // Collect and sort namespace declarations and attributes
  const nsDecls: Array<{ name: string; value: string }> = []
  const attrs: Array<{ name: string; value: string; nsUri: string; localName: string }> = []

  for (let i = 0; i < node.attributes.length; i++) {
    const attr = node.attributes[i]
    if (attr.name === 'xmlns' || attr.name.startsWith('xmlns:')) {
      nsDecls.push({ name: attr.name, value: attr.value })
    } else {
      const nsUri = attr.namespaceURI || ''
      const localName = attr.localName || attr.name
      attrs.push({ name: attr.name, value: attr.value, nsUri, localName })
    }
  }

  // Sort namespace declarations: default namespace first, then by prefix
  nsDecls.sort((a, b) => {
    if (a.name === 'xmlns') return -1
    if (b.name === 'xmlns') return 1
    return a.name.localeCompare(b.name)
  })

  // Sort attributes by namespace URI, then by local name
  attrs.sort((a, b) => {
    if (a.nsUri !== b.nsUri) return a.nsUri.localeCompare(b.nsUri)
    return a.localName.localeCompare(b.localName)
  })

  // Output namespace declarations
  for (const ns of nsDecls) {
    parts.push(` ${ns.name}="${escapeAttrValue(ns.value)}"`)
  }

  // Output attributes
  for (const attr of attrs) {
    parts.push(` ${attr.name}="${escapeAttrValue(attr.value)}"`)
  }

  parts.push('>')

  // Process child nodes
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i]

    switch (child.nodeType) {
      case 1: // Element
        parts.push(canonicalizeNode(child as Element))
        break
      case 3: // Text
        parts.push(escapeTextContent(child.textContent || ''))
        break
      case 4: // CDATA - convert to text
        parts.push(escapeTextContent(child.textContent || ''))
        break
      // Ignore comments, processing instructions for C14N without comments
    }
  }

  // End tag (never use self-closing in C14N)
  parts.push(`</${tagName}>`)

  return parts.join('')
}

/**
 * Escape attribute value for C14N
 */
function escapeAttrValue(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
    .replace(/\t/g, '&#x9;')
    .replace(/\n/g, '&#xA;')
    .replace(/\r/g, '&#xD;')
}

/**
 * Escape text content for C14N
 */
function escapeTextContent(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r/g, '&#xD;')
}

/**
 * Verify an IRmark against calculated value
 *
 * @param xmlContent - The XML content with IRmark
 * @param expectedIRmark - The IRmark value to verify
 * @returns True if IRmark is valid
 */
export function verifyIRmark(xmlContent: string, expectedIRmark: string): boolean {
  const calculated = calculateIRmark(xmlContent)
  return calculated === expectedIRmark
}

/**
 * Insert IRmark into an XML document
 *
 * @param xmlContent - XML with placeholder IRmark or no IRmark
 * @returns XML with calculated IRmark inserted
 */
export function insertIRmark(xmlContent: string): string {
  const irmark = calculateIRmark(xmlContent)

  // Check if there's an existing IRmark element to replace
  if (/<IRmark[^>]*>[^<]*<\/IRmark>/i.test(xmlContent)) {
    return xmlContent.replace(
      /<IRmark[^>]*>[^<]*<\/IRmark>/i,
      `<IRmark Type="${IRMARK_CONFIG.type}">${irmark}</IRmark>`
    )
  }

  // Insert after Manifest and before Sender in IRheader
  if (/<\/Manifest>/i.test(xmlContent)) {
    return xmlContent.replace(
      /<\/Manifest>/i,
      `</Manifest>\n        <IRmark Type="${IRMARK_CONFIG.type}">${irmark}</IRmark>`
    )
  }

  // Fallback: Insert before </IRheader>
  return xmlContent.replace(
    /<\/IRheader>/i,
    `  <IRmark Type="${IRMARK_CONFIG.type}">${irmark}</IRmark>\n      </IRheader>`
  )
}

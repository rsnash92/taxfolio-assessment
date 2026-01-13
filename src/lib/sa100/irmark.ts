/**
 * IRmark Calculator
 *
 * The IRmark is a digital signature that authenticates the content of an
 * SA100 submission. HMRC uses it to verify the return hasn't been tampered with.
 *
 * Algorithm:
 * 1. Extract the IRenvelope content (excluding the IRmark element itself)
 * 2. Canonicalize using Exclusive XML Canonicalization
 * 3. Compute SHA-1 hash
 * 4. Base64 encode the result
 *
 * Reference: HMRC RIM Artefacts documentation
 */

import { createHash } from 'crypto'
import { IRMARK_CONFIG } from './schema-reference'

/**
 * Calculate the IRmark for an XML document
 *
 * @param xmlContent - The complete IRenvelope XML content
 * @returns Base64-encoded SHA-1 hash
 */
export function calculateIRmark(xmlContent: string): string {
  // 1. Extract the content to hash (IRenvelope body, excluding IRmark)
  const contentToHash = extractHashableContent(xmlContent)

  // 2. Canonicalize the XML
  const canonicalized = canonicalizeXml(contentToHash)

  // 3. Compute SHA-1 hash
  const hash = createHash(IRMARK_CONFIG.algorithm).update(canonicalized, 'utf8').digest()

  // 4. Base64 encode
  return hash.toString('base64')
}

/**
 * Extract the content that should be hashed for IRmark calculation.
 *
 * The IRmark is calculated over the MTR element (the actual return data),
 * not including the IRheader.
 *
 * @param xmlContent - Full IRenvelope XML
 * @returns The content to be hashed
 */
function extractHashableContent(xmlContent: string): string {
  // Find the MTR element - this is what gets hashed
  // The IRmark covers the business content, not the header

  // Match <MTR ...> to </MTR> (including all attributes and content)
  const mtrMatch = xmlContent.match(/<MTR[^>]*>[\s\S]*<\/MTR>/i)

  if (mtrMatch) {
    return mtrMatch[0]
  }

  // Fallback: If no MTR element found, try to extract IRenvelope body
  // excluding the IRmark element
  let content = xmlContent

  // Remove any existing IRmark element
  content = content.replace(/<IRmark[^>]*>[^<]*<\/IRmark>/gi, '')

  // Remove any self-closing IRmark
  content = content.replace(/<IRmark[^/]*\/>/gi, '')

  return content
}

/**
 * Canonicalize XML using a simplified Exclusive XML Canonicalization (exc-c14n)
 *
 * This is a simplified implementation that handles the most common cases.
 * For production, consider using a proper XML canonicalization library.
 *
 * Canonicalization rules:
 * - Normalize line endings to LF
 * - Remove XML declaration
 * - Remove DOCTYPE declarations
 * - Normalize whitespace in start/end tags
 * - Sort attributes alphabetically
 * - Normalize attribute values (single quotes to double)
 * - Remove redundant namespace declarations
 */
function canonicalizeXml(xml: string): string {
  let result = xml

  // 1. Normalize line endings to LF
  result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // 2. Remove XML declaration
  result = result.replace(/<\?xml[^?]*\?>/gi, '')

  // 3. Remove DOCTYPE declarations
  result = result.replace(/<!DOCTYPE[^>]*>/gi, '')

  // 4. Remove leading/trailing whitespace
  result = result.trim()

  // 5. Normalize whitespace between elements (but preserve significant whitespace)
  // This is a simplified approach - remove whitespace between > and <
  result = result.replace(/>\s+</g, '><')

  // 6. Sort attributes alphabetically within each element
  result = sortAttributesInXml(result)

  // 7. Normalize empty elements to long form
  // <element/> becomes <element></element>
  result = result.replace(/<([A-Za-z][A-Za-z0-9:_-]*)((?:\s+[^>]*)?)\/>/g, '<$1$2></$1>')

  return result
}

/**
 * Sort attributes alphabetically within XML elements
 */
function sortAttributesInXml(xml: string): string {
  // Match opening tags with attributes
  return xml.replace(/<([A-Za-z][A-Za-z0-9:_-]*)((?:\s+[A-Za-z:_][A-Za-z0-9:._-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)+)\s*(\/?)>/g,
    (match, tagName, attributes, selfClose) => {
      // Parse attributes
      const attrRegex = /([A-Za-z:_][A-Za-z0-9:._-]*)\s*=\s*("[^"]*"|'[^']*')/g
      const attrs: Array<{ name: string; value: string }> = []

      let attrMatch
      while ((attrMatch = attrRegex.exec(attributes)) !== null) {
        let value = attrMatch[2]
        // Normalize to double quotes
        if (value.startsWith("'") && value.endsWith("'")) {
          value = '"' + value.slice(1, -1) + '"'
        }
        attrs.push({ name: attrMatch[1], value })
      }

      // Sort attributes by name
      attrs.sort((a, b) => a.name.localeCompare(b.name))

      // Rebuild the tag
      const sortedAttrs = attrs.map(a => ` ${a.name}=${a.value}`).join('')
      return `<${tagName}${sortedAttrs}${selfClose ? ' /' : ''}>`
    }
  )
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

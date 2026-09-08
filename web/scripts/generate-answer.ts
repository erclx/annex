/**
 * Generates `src/lib/answer.ts` from the committed JSON Schema that `python -m annex
 * schema` emits, so the browser and the service agree on the answer contract by
 * construction rather than by two people remembering to edit two files.
 *
 * The generator's CLI leaves every `$ref` as `z.any()`, so the schema is dereferenced
 * here first. `additionalProperties: false` is injected on the way through, which is
 * what makes the emitted objects strict at the HTTP boundary.
 */

import { readFileSync, writeFileSync } from 'node:fs'

import { type JsonSchemaObject, jsonSchemaToZod } from 'json-schema-to-zod'

const SCHEMA_PATH = new URL(
  '../../python/schema/answer.schema.json',
  import.meta.url,
)
const OUTPUT_PATH = new URL('../src/lib/answer.ts', import.meta.url)
const REF_PREFIX = '#/$defs/'

type JsonNode = Record<string, unknown>

const isObject = (value: unknown): value is JsonNode =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * A `$ref` to a definition this project controls resolves to that definition inline.
 * `seen` is carried so a schema that grows a cycle fails here rather than hanging.
 */
function dereference(
  node: unknown,
  definitions: JsonNode,
  seen: string[] = [],
): unknown {
  if (Array.isArray(node))
    return node.map((entry) => dereference(entry, definitions, seen))
  if (!isObject(node)) return node

  if (typeof node.$ref === 'string') {
    if (!node.$ref.startsWith(REF_PREFIX)) {
      throw new Error(
        `Only local ${REF_PREFIX} references are supported, found ${node.$ref}`,
      )
    }
    const name = node.$ref.slice(REF_PREFIX.length)
    if (seen.includes(name)) {
      throw new Error(
        `Circular reference through ${name}, which this generator cannot emit`,
      )
    }
    const target = definitions[name]
    if (target === undefined)
      throw new Error(`Unresolved reference ${node.$ref}`)

    // Keys beside the $ref, such as a default, win over the definition they point at.
    const { $ref: _resolved, ...siblings } = node
    const resolved = dereference(target, definitions, [
      ...seen,
      name,
    ]) as JsonNode
    return { ...resolved, ...siblings }
  }

  const output: JsonNode = {}
  for (const [key, value] of Object.entries(node)) {
    output[key] = dereference(value, definitions, seen)
  }
  if (output.type === 'object' && isObject(output.properties)) {
    output.additionalProperties = false
  }
  return output
}

const raw = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8')) as JsonNode
const { $defs: definitions = {}, ...root } = raw
const resolved = dereference(root, definitions as JsonNode)
if (!isObject(resolved)) {
  throw new Error('The schema root resolved to something other than an object')
}

// Parsed JSON cannot be narrowed to JsonSchemaObject by a guard without writing a
// validator for the whole JSON Schema vocabulary. The guard above establishes the
// only property this script depends on, and the input is a committed artifact this
// project generates rather than arbitrary third-party input.
const generated = jsonSchemaToZod(resolved as JsonSchemaObject, {
  name: 'answerSchema',
  type: 'Answer',
  module: 'esm',
  zodVersion: 4,
})

const banner = [
  '// Generated from python/schema/answer.schema.json by `bun run generate:answer`.',
  '// Do not edit. `web/scripts/verify.sh` fails when this file and the schema disagree.',
  '',
].join('\n')

writeFileSync(OUTPUT_PATH, `${banner}${generated}\n`)

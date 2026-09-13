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

const SCHEMA_DIRECTORY = new URL('../../python/schema/', import.meta.url)
const OUTPUT_DIRECTORY = new URL('../src/lib/', import.meta.url)
const REF_PREFIX = '#/$defs/'

interface Contract {
  schema: string
  output: string
  name: string
  type: string
}

/**
 * The answer `/ask` returns, and the two frames `/ask/stream` sends before or
 * instead of it. The terminal `answer` frame carries the first contract, so the
 * stream needs no schema of its own for it.
 */
const CONTRACTS: Contract[] = [
  {
    schema: 'answer.schema.json',
    output: 'answer.ts',
    name: 'answerSchema',
    type: 'Answer',
  },
  {
    schema: 'stream-node.schema.json',
    output: 'stream-node.ts',
    name: 'streamNodeSchema',
    type: 'StreamNode',
  },
  {
    schema: 'stream-error.schema.json',
    output: 'stream-error.ts',
    name: 'streamErrorSchema',
    type: 'StreamError',
  },
]

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

function generate({ schema, output, name, type }: Contract) {
  const raw = JSON.parse(
    readFileSync(new URL(schema, SCHEMA_DIRECTORY), 'utf8'),
  ) as JsonNode
  const { $defs: definitions = {}, ...root } = raw
  const resolved = dereference(root, definitions as JsonNode)
  if (!isObject(resolved)) {
    throw new Error(
      `The root of ${schema} resolved to something other than an object`,
    )
  }

  // Parsed JSON cannot be narrowed to JsonSchemaObject by a guard without writing a
  // validator for the whole JSON Schema vocabulary. The guard above establishes the
  // only property this script depends on, and the input is a committed artifact this
  // project generates rather than arbitrary third-party input.
  const generated = jsonSchemaToZod(resolved as JsonSchemaObject, {
    name,
    type,
    module: 'esm',
    zodVersion: 4,
  })

  const banner = [
    `// Generated from python/schema/${schema} by \`bun run generate:answer\`.`,
    '// Do not edit. `web/scripts/verify.sh` fails when this file and the schema disagree.',
    '',
  ].join('\n')

  writeFileSync(new URL(output, OUTPUT_DIRECTORY), `${banner}${generated}\n`)
}

for (const contract of CONTRACTS) generate(contract)

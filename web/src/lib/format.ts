/** Thousands separated by a space, the way the surface prints every count. */
export function group(value: number): string {
  return value.toLocaleString('en-US').replaceAll(',', ' ')
}

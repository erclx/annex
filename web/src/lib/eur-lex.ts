import type { Citation } from '@/components/versions'

/**
 * The two documents this project reads, read off `python/src/annex/corpus/sources.py`.
 *
 * Mirrored rather than shared, since that file is Python and this is the
 * browser. A source URL moving there and not here is a drift this file has no
 * way to catch on its own.
 */
const EUR_LEX_URL: Record<Citation['version'], string> = {
  original:
    'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L_202401689',
  consolidated:
    'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02024R1689-20260727',
}

/**
 * Where a citation's own EUR-Lex deep link lands.
 *
 * The source HTML anchors each article at `id="art_N"`, which is what a
 * paragraph's provision id already carries ahead of its own `.`, so a
 * paragraph citation resolves to the article that carries it. Every annex is
 * anchored the same way at `id="anx_N"`, with no paragraph suffix to split
 * off, so an annex citation resolves directly. A citation carrying neither
 * prefix, such as a recital, has no matching anchor in the source and
 * resolves to the document root instead.
 */
export function eurLexUrl(citation: Citation): string {
  const base = EUR_LEX_URL[citation.version]
  if (
    citation.provision_id.startsWith('art_') ||
    citation.provision_id.startsWith('anx_')
  ) {
    return `${base}#${citation.provision_id.split('.')[0]}`
  }
  return base
}

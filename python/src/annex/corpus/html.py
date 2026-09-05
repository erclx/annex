"""Document-order text extraction shared by the two adapters.

Both schemes need the same thing: the text lying between one heading and the
next. Neither scheme wraps an article in an element that contains exactly that
text, so the span is found by offset into the document's text rather than by
walking a subtree.
"""

from dataclasses import dataclass

from lxml.html import HtmlElement


@dataclass(frozen=True)
class TextIndex:
    """The document as one string, with the offset each element starts at."""

    text: str
    starts: dict[HtmlElement, int]

    def slice(self, start: int, end: int | None = None) -> str:
        return self.text[start : end if end is not None else len(self.text)]

    def start_of(self, element: HtmlElement) -> int:
        return self.starts[element]


def index_text(root: HtmlElement) -> TextIndex:
    """Flatten an element tree into text, recording where each element begins.

    `iter()` cannot do this. It yields elements in preorder, which puts an
    element's tail text at its own position rather than after its subtree, so
    offsets built from it drift wherever an element has children.
    """
    parts: list[str] = []
    starts: dict[HtmlElement, int] = {}
    length = 0

    def walk(element: HtmlElement) -> None:
        nonlocal length
        starts[element] = length
        if element.text:
            parts.append(element.text)
            length += len(element.text)
        for child in element:
            if isinstance(child.tag, str):
                walk(child)
            if child.tail:
                parts.append(child.tail)
                length += len(child.tail)

    walk(root)
    return TextIndex(text=''.join(parts), starts=starts)


def spans(
    index: TextIndex,
    markers: list[HtmlElement],
    end: int | None = None,
) -> list[tuple[HtmlElement, int, int]]:
    """Pair each marker with the text running from it to the next one."""
    bounds = [index.start_of(m) for m in markers]
    limit = end if end is not None else len(index.text)
    return [
        (marker, bounds[i], bounds[i + 1] if i + 1 < len(bounds) else limit)
        for i, marker in enumerate(markers)
    ]

"""`spans` pairs a marker with the text running to the next one, or to a stop."""

from lxml.html import fromstring

from annex.corpus.html import index_text, spans


class TestSpans:
    def test_a_stop_offset_inside_a_span_ends_it_there(self) -> None:
        root = fromstring(
            '<div>'
            '<p id="m1">Article 1</p>'
            '<p>Some text.</p>'
            '<p id="h">CHAPTER I</p>'
            '<p>More text.</p>'
            '<p id="m2">Article 2</p>'
            '<p>Final text.</p>'
            '</div>'
        )
        index = index_text(root)
        markers = root.xpath('//p[starts-with(@id,"m")]')
        heading = root.xpath('//p[@id="h"]')[0]
        stop = index.start_of(heading)

        (marker, start, end) = spans(index, markers, stops=[stop])[0]

        assert marker is markers[0]
        assert index.slice(start, end) == 'Article 1Some text.'

    def test_a_stop_offset_outside_a_span_leaves_it_alone(self) -> None:
        root = fromstring(
            '<div>'
            '<p id="m1">Article 1</p>'
            '<p>Some text.</p>'
            '<p id="m2">Article 2</p>'
            '<p>Final text.</p>'
            '<p id="h">CHAPTER I</p>'
            '</div>'
        )
        index = index_text(root)
        markers = root.xpath('//p[starts-with(@id,"m")]')
        heading = root.xpath('//p[@id="h"]')[0]
        stop = index.start_of(heading)

        result = spans(index, markers, stops=[stop])

        assert index.slice(*result[0][1:]) == 'Article 1Some text.'
        assert index.slice(*result[1][1:]) == 'Article 2Final text.'

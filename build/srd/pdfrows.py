"""Rows of the SRD 5.2.1 PDF in reading order (page, then column, then top to bottom), with their spans' fonts.
A row is every line of one column that sits at the same height (a stat block's "AC 17" and "Initiative +7" are two
PDF lines on one row). Shared by bestiary.py (monsters, magic items and the rules around them)."""
import re
import fitz

MID = 297          # the page is 594 pt wide; the two columns start at x 63 and 313
FOOT = 738         # the running footer (page number, document title) sits at y 745


def clean(t):
    return (t.replace(' ', ' ').replace('\t', ' ').replace('−', '-').replace('‑', '-')
            .replace('ﬁ', 'fi').replace('ﬂ', 'fl'))


def rows(doc, first, last):
    out = []
    for pn in range(first, last + 1):
        page = doc[pn - 1]
        lines = []
        for b in page.get_text('dict')['blocks']:
            for l in b.get('lines', []):
                spans = [s for s in l['spans'] if s['text'] != '']
                if not spans:
                    continue
                x0, y0, x1, y1 = l['bbox']
                if y0 > FOOT:
                    continue
                txt = ''.join(s['text'] for s in spans)
                if not txt.strip():
                    continue
                col = 0 if x0 < MID else 1
                lines.append({'page': pn, 'col': col, 'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1,
                              'spans': [{'font': s['font'], 'size': round(s['size'], 1), 'text': clean(s['text'])} for s in spans]})
        lines.sort(key=lambda l: (l['col'], l['y0'], l['x0']))
        # merge lines of one column whose tops are within 2.5 pt into a row (left to right)
        cur = None
        for l in lines:
            if cur and l['col'] == cur['col'] and abs(l['y0'] - cur['y0']) < 2.5:
                cur['parts'].append(l)
                continue
            cur = {'page': pn, 'col': l['col'], 'y0': l['y0'], 'parts': [l]}
            out.append(cur)
        for r in out:
            if r['page'] != pn or 'spans' in r:
                continue
            r['parts'].sort(key=lambda l: l['x0'])
            r['spans'] = [s for l in r['parts'] for s in l['spans']]
            r['x0'] = min(l['x0'] for l in r['parts']); r['x1'] = max(l['x1'] for l in r['parts'])
            r['y1'] = max(l['y1'] for l in r['parts'])
            r['text'] = ' '.join(''.join(s['text'] for s in l['spans']).strip() for l in r['parts'])
            r['text'] = re.sub(r'\s+', ' ', r['text']).strip()
            f = r['spans'][0]
            r['font'], r['size'] = f['font'], f['size']
            del r['parts']
    return out


def join_text(rs):
    """Running text of several rows: a line that ends in a hyphen joins the next word (suc- + ceed)."""
    t = ''
    for r in rs:
        s = r['text'] if isinstance(r, dict) else r
        if t.endswith('-') and s[:1].islower() and not t.endswith(' -'):
            t = t[:-1] + s
        else:
            t = (t + ' ' + s) if t else s
    return re.sub(r'\s+', ' ', t).strip()


def segments(rs, pad=1.5):
    """The page regions a run of rows covers: one rect per (page, column), in reading order. [page, [x, y, w, h]]"""
    seg = {}
    order = []
    for r in rs:
        k = (r['page'], r['col'])
        if k not in seg:
            seg[k] = [r['x0'], r['y0'], r['x1'], r['y1']]; order.append(k)
        else:
            b = seg[k]; b[0] = min(b[0], r['x0']); b[1] = min(b[1], r['y0']); b[2] = max(b[2], r['x1']); b[3] = max(b[3], r['y1'])
    out = []
    for k in order:
        x0, y0, x1, y1 = seg[k]
        # a column is ~225 pt wide; widen a short last line's box to the column
        x0 = min(x0, 63.0 if k[1] == 0 else 313.0); x1 = max(x1, x0 + 225.0)
        out.append([k[0], [round(x0 - pad, 1), round(y0 - pad, 1), round(x1 - x0 + 2 * pad, 1), round(y1 - y0 + 2 * pad, 1)]])
    return out

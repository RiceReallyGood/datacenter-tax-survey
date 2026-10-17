"""Hot set: how many merge-table entries does one ~480 KB Agent-like context actually touch?"""
import os, glob, json, collections, regex, sys
W = os.path.dirname(os.path.abspath(__file__))
os.environ['TIKTOKEN_CACHE_DIR'] = os.path.join(W, 'tkcache')
R = '/home/fanzhenhao/RPC_PAPERS'

# ---- build a ~480 KB mixed context: code, markdown (中英), JSON ----
def take(paths, limit):
    out, n = [], 0
    for p in paths:
        try:
            t = open(p, encoding='utf-8', errors='ignore').read()
        except Exception:
            continue
        t = t[: limit - n]
        out.append(t); n += len(t.encode('utf-8'))
        if n >= limit:
            break
    return '\n'.join(out)
js = [R + '/ppt/node_modules/pptxgenjs/dist/pptxgen.cjs.js'] + sorted(glob.glob(R + '/ppt/*.js'))
md = [R + '/INSIGHT_AGENT_DEEPDIVE.md', R + '/REPORT.md', R + '/INSIGHT_AI_WORKLOAD.md']
js_txt = take(js, 280_000)
md_txt = take(md, 120_000)
json_txt = take(sorted(glob.glob(R + '/ppt/node_modules/*/package.json')) + [R + '/ppt/package-lock.json'], 80_000)
text = js_txt + '\n' + md_txt + '\n' + json_txt
print('corpus bytes', len(text.encode('utf-8')), 'code', len(js_txt.encode()), 'md', len(md_txt.encode()), 'json', len(json_txt.encode()))

def summarize(name, hits, n_entries, entry_B, out_tokens):
    c = collections.Counter(hits)
    total = sum(c.values()); distinct = len(c)
    freq = sorted(c.values(), reverse=True)
    def cover(q):
        s = 0
        for i, f in enumerate(freq):
            s += f
            if s >= q * total:
                return i + 1
    res = dict(name=name, lookups_hit=total, distinct_entries=distinct, table_entries=n_entries,
               frac_of_table=distinct / n_entries, hot_kb=distinct * entry_B / 1024,
               cover90=cover(0.90), cover99=cover(0.99), cover90_kb=cover(0.90) * entry_B / 1024, cover99_kb=cover(0.99) * entry_B / 1024,
               out_tokens=len(out_tokens), distinct_out=len(set(out_tokens)))
    print(json.dumps(res, ensure_ascii=False))
    return res

results = []
# ---- tiktoken o200k: reimplement byte_pair_merge and log rank hits ----
import tiktoken
enc = tiktoken.get_encoding('o200k_base')
ranks = enc._mergeable_ranks
pat = regex.compile(enc._pat_str)
def bpe_tk(piece, hits):
    if piece in ranks:
        hits.append(ranks[piece]); return [ranks[piece]]
    parts = [bytes([b]) for b in piece]
    while len(parts) > 1:
        best, bi = None, -1
        for i in range(len(parts) - 1):
            r = ranks.get(parts[i] + parts[i + 1])
            if r is not None and (best is None or r < best):
                best, bi = r, i
        if best is None:
            break
        hits.append(best)
        parts[bi:bi + 2] = [parts[bi] + parts[bi + 1]]
    return [ranks[p] for p in parts]
hits, out = [], []
for m in pat.finditer(text):
    out += bpe_tk(m.group().encode('utf-8'), hits)
ref = enc.encode_ordinary(text)
print('o200k reimpl matches tiktoken:', out == ref, len(out), len(ref))
results.append(summarize('GPT-4o (o200k)', hits, len(ranks), 7, out))

# ---- Qwen2.5 (HF): pre-tokenize with the model's own pre-tokenizer, BPE with merge ranks ----
import tokenizers
tok = tokenizers.Tokenizer.from_file(os.path.join(W, 'qwen25.json'))
j = json.load(open(os.path.join(W, 'qwen25.json'), encoding='utf-8'))
vocab = j['model']['vocab']
mr = {}
for i, m in enumerate(j['model']['merges']):
    a, b = (m.split(' ') if isinstance(m, str) else m)
    mr[(a, b)] = i
text_n = tok.normalizer.normalize_str(text) if tok.normalizer else text
pieces = [p for p, _ in tok.pre_tokenizer.pre_tokenize_str(text_n)]
hits, out = [], []
for pc in pieces:
    if pc in vocab and j['model'].get('ignore_merges'):
        out.append(vocab[pc]); continue
    parts = list(pc)
    while len(parts) > 1:
        best, bi = None, -1
        for i in range(len(parts) - 1):
            r = mr.get((parts[i], parts[i + 1]))
            if r is not None and (best is None or r < best):
                best, bi = r, i
        if best is None:
            break
        hits.append(best)
        parts[bi:bi + 2] = [parts[bi] + parts[bi + 1]]
    out += [vocab[p] for p in parts]
ref = tok.encode(text, add_special_tokens=False).ids
print('qwen reimpl matches HF:', out == ref, len(out), len(ref))
results.append(summarize('Qwen2.5', hits, len(mr), 9, out))
json.dump(results, open(os.path.join(W, 'hotset.json'), 'w'), indent=1, ensure_ascii=False)

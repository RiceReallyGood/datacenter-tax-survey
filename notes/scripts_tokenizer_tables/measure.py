"""Measure tokenizer vocab / merge table sizes: counts, on-disk, in-memory (RSS delta), compact estimate, hot set."""
import json, os, sys, math, hashlib, subprocess, glob, base64, shutil

W = os.path.dirname(os.path.abspath(__file__))
os.environ['TIKTOKEN_CACHE_DIR'] = os.path.join(W, 'tkcache')
os.makedirs(os.environ['TIKTOKEN_CACHE_DIR'], exist_ok=True)
for name in ['o200k_base', 'cl100k_base']:
    url = f'https://openaipublic.blob.core.windows.net/encodings/{name}.tiktoken'
    dst = os.path.join(os.environ['TIKTOKEN_CACHE_DIR'], hashlib.sha1(url.encode()).hexdigest())
    if not os.path.exists(dst):
        shutil.copy(os.path.join(W, name + '.tiktoken'), dst)

def bytes_to_unicode():
    bs = list(range(ord('!'), ord('~') + 1)) + list(range(ord('¡'), ord('¬') + 1)) + list(range(ord('®'), ord('ÿ') + 1))
    cs = bs[:]
    n = 0
    for b in range(256):
        if b not in bs:
            bs.append(b); cs.append(256 + n); n += 1
    return {chr(c): b for b, c in zip(bs, cs)}
U2B = bytes_to_unicode()

def rss_kb():
    with open('/proc/self/status') as f:
        for l in f:
            if l.startswith('VmRSS:'):
                return int(l.split()[1])

# ---------------- child mode: measure RSS delta of loading ----------------
if len(sys.argv) > 1 and sys.argv[1] == 'rss':
    kind, path = sys.argv[2], sys.argv[3]
    import gc
    if kind == 'hf':
        import tokenizers
        gc.collect(); a = rss_kb()
        t = tokenizers.Tokenizer.from_file(path)
        gc.collect(); b = rss_kb()
    else:
        import tiktoken
        gc.collect(); a = rss_kb()
        e = tiktoken.get_encoding(path)
        e.encode('warm up')
        gc.collect(); b = rss_kb()
        # python-side dict alone
        rk = e._mergeable_ranks
    print((b - a) / 1024.0)
    sys.exit(0)

def child_rss(kind, path):
    out = subprocess.run([sys.executable, __file__, 'rss', kind, path], capture_output=True, text=True, env=os.environ)
    return float(out.stdout.strip().splitlines()[-1])

def ceil_bits(n):
    return max(1, math.ceil(math.log2(n)))

rows = []
# ---------------- HF tokenizer.json models ----------------
hf = [('GPT-2', 'gpt2.json'), ('Llama 3', 'llama3.json'), ('Qwen2.5', 'qwen25.json'), ('DeepSeek-V3', 'deepseekv3.json')]
for name, fn in hf:
    p = os.path.join(W, fn)
    j = json.load(open(p, encoding='utf-8'))
    m = j['model']
    vocab = m['vocab']; merges = m['merges']
    nvocab = len(vocab) + len([t for t in j.get('added_tokens', []) if t['content'] not in vocab])
    nmerge = len(merges)
    tot_bytes = sum(len([U2B.get(ch, 0) for ch in tok]) for tok in vocab)
    rows.append(dict(name=name, kind='hf', file=fn, disk_mb=os.path.getsize(p) / 1e6, vocab=nvocab, merges=nmerge,
                     tok_bytes=tot_bytes, rss_mb=child_rss('hf', p)))

# ---------------- tiktoken models ----------------
for name, enc in [('GPT-4 (cl100k)', 'cl100k_base'), ('GPT-4o (o200k)', 'o200k_base')]:
    p = os.path.join(W, enc + '.tiktoken')
    ranks = {}
    for line in open(p, 'rb'):
        if line.strip():
            tok, r = line.split()
            ranks[base64.b64decode(tok)] = int(r)
    nvocab = len(ranks)
    rows.append(dict(name=name, kind='tiktoken', file=enc + '.tiktoken', disk_mb=os.path.getsize(p) / 1e6, vocab=nvocab,
                     merges=nvocab - 256, tok_bytes=sum(len(t) for t in ranks), rss_mb=child_rss('tk', enc)))

# compact estimates
for r in rows:
    b = ceil_bits(r['vocab'])
    # merge table: key (left,right) kept for exact verification + value; HF needs rank and merged id, tiktoken rank == id
    val_bits = (2 * b) if r['kind'] == 'hf' else b
    ent_bits = 2 * b + val_bits
    ent_bytes = math.ceil(ent_bits / 8)
    mph_bits = 3  # PTHash/CHD-class minimal perfect hash, ~2-3 bits per key
    r['bits_id'] = b
    r['merge_entry_B'] = ent_bytes
    r['merge_compact_mb'] = r['merges'] * (ent_bytes + mph_bits / 8) / 1e6
    # decode table: all token bytes in one blob + 3-byte offsets
    r['decode_compact_mb'] = (r['tok_bytes'] + 3 * r['vocab']) / 1e6
    r['avg_tok_len'] = r['tok_bytes'] / r['vocab']

json.dump(rows, open(os.path.join(W, 'sizes.json'), 'w'), indent=1, ensure_ascii=False)
for r in rows:
    print(f"{r['name']:16s} vocab={r['vocab']:7d} merges={r['merges']:7d} avgTok={r['avg_tok_len']:.2f}B disk={r['disk_mb']:.2f}MB "
          f"RSS={r['rss_mb']:.1f}MB id_bits={r['bits_id']} entry={r['merge_entry_B']}B merge_compact={r['merge_compact_mb']:.2f}MB decode_compact={r['decode_compact_mb']:.2f}MB")

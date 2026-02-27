def _unwrap(val):
    if isinstance(val, list) and len(val) > 0:
        return val[0]
    return val

def _extract_remote_jid(payload):
    for path in (
        ("body", "data", "key", "remoteJid"),
        ("body", "data", "remoteJid"),
        ("data", "key", "remoteJid"),
        ("data", "remoteJid"),
        ("remoteJid",),
        ("key", "remoteJid"),
    ):
        cur = payload
        ok = True
        for k in path:
            cur = _unwrap(cur)
            if isinstance(cur, dict) and k in cur:
                cur = cur[k]
            else:
                ok = False
                break
        if ok:
            print(f"Path {path} reached: {cur}")
            if isinstance(cur, str) and cur.strip():
                jid = cur.strip()
                if "@" in jid:
                    jid = jid.split("@", 1)[0]
                return jid
    return None

payload = {"event":"messages.upsert","instance":"lucasborges_5286","data":[{"key":{"remoteJid":"556299999999@s.whatsapp.net","fromMe":False,"id":"SIMULATED_LIST_ID"},"pushName":"Teste List","message":{"conversation":"Mensagem via List"},"messageType":"conversation"}]}
print(f"Result: {_extract_remote_jid(payload)}")

# 🆘 Troubleshooting

---

## Frontend Issues

### Dev server não inicia
```bash
# Limpe cache
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Variáveis de env não carregam
```bash
# Restart dev server após editar .env.local
npm run dev
```

### Build falha
```bash
# Verifique TypeScript
npx tsc --noEmit

# Verifique linting
npm run lint

# Build local
npm run build
```

---

## Backend Issues

### Worker não conecta ao Supabase
```bash
# Verifique credentials
cat vps/summi_worker/.env | grep SUPABASE

# Teste conexão
curl https://xxx.supabase.co/rest/v1
```

### OpenAI API timeout
```bash
# Verifique API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models

# Aumentar timeout em .env
OPENAI_REQUEST_TIMEOUT=120
```

### Audio não transcreve
```bash
# Verifique logs
docker logs summi-worker

# Cheque se arquivo é válido
file audio.wav
```

---

## Database Issues

### Migrations falharam
```bash
supabase db reset  # Reseta e roda do zero
```

### RLS policy bloqueando
```sql
-- Verifique policies
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Teste sem RLS (admin only!)
SET ROLE anon;
SELECT * FROM chats;
```

---

## Deployment Issues

### Docker build falha
```bash
docker build --no-cache -f Dockerfile .
```

### Port já em uso
```bash
lsof -i :8080
kill -9 <PID>
```

---

**Mais detalhes:** Cheque logs em [`MONITORING.md`](./MONITORING.md).

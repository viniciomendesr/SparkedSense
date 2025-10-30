# Deploy da Edge Function no Supabase

## Problema Identificado

A rota `POST /sensors` está retornando **404** porque a **Edge Function não está deployada** no Supabase.

## Solução: Deploy da Edge Function

### 1. Instalar Supabase CLI

```bash
# Linux/macOS
curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | sh

# Ou via npm
npm install -g supabase
```

### 2. Login no Supabase

```bash
supabase login
```

Isso vai abrir o navegador para você fazer login.

### 3. Link com o Projeto

```bash
cd /home/nicolasgabriel/Documentos/solanHacka/Sparkedsensemvpv1copy
supabase link --project-ref djzexivvddzzduetmkel
```

### 4. Deploy da Edge Function

```bash
supabase functions deploy server
```

### 5. Configurar Variáveis de Ambiente

No Dashboard do Supabase:
1. Vá em **Edge Functions** → **server** → **Settings**
2. Adicione as variáveis:
   - `SUPABASE_URL`: https://djzexivvddzzduetmkel.supabase.co
   - `SUPABASE_SERVICE_ROLE_KEY`: (sua service role key)

### 6. Testar a Função

```bash
curl -X POST https://djzexivvddzzduetmkel.supabase.co/functions/v1/make-server-4a89e1c9/sensors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -d '{
    "name": "Test Sensor",
    "type": "temperature",
    "mode": "mock",
    "visibility": "public"
  }'
```

## Verificação

Após o deploy, a rota deve retornar **200** ou **201** em vez de **404**.

## Troubleshooting

### Erro: "Function not found"
- Verifique se o deploy foi bem-sucedido
- Confirme que a função está listada no Dashboard

### Erro: "Unauthorized"
- Verifique o token de autenticação
- Confirme que o usuário está logado

### Erro: 500
- Verifique os logs da função no Dashboard
- Confirme que as variáveis de ambiente estão configuradas

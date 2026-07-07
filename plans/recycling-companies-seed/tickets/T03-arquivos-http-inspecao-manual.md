# T3 — Arquivos `.http` de inspeção manual

**Status:** ✅ Concluído
**Depende de:** nada
**Arquivos:** `requests/*.http`

## Checklist

- [x] `requests/google-places-text-search.http`
- [x] `requests/google-places-details.http`
- [x] `requests/google-geocoding.http`
- [x] `requests/ibge-municipios.http`
- [x] ~~`requests/http-client.env.json`~~ — descartado: não é convenção da extensão REST Client (Huachao Mao), é do JetBrains HTTP Client
- [x] Chave carregada via `{{$dotenv GOOGLE_PLACES_API_KEY}}` — como `$dotenv` só lê `.env` no mesmo diretório do `.http`, criado symlink `requests/.env -> ../../../.env` (ambiente Linux/Docker). Symlink confirmado como automaticamente ignorado pelo git (`git check-ignore`, regra `.env` já existente no `.gitignore`) — nenhuma chave real fica colada em nenhum arquivo `.http`
- [x] Validar manualmente cada request (Places Text Search e Geocoding testados via `fetch()` cru com a chave real do `.env` local — ambos retornaram 200 OK; IBGE testado via `IbgeMunicipioProvider` real)

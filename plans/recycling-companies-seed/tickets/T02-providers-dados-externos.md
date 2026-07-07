# T2 — Providers de dados externos

**Status:** ✅ Concluído
**Depende de:** nada
**Arquivos:** `providers/places-provider.ts`, `providers/google-places-provider.ts`, `providers/geocoding-provider.ts`, `providers/google-geocoding-provider.ts`, `providers/municipio-provider.ts`, `providers/ibge-municipio-provider.ts`

## Checklist

- [x] `providers/places-provider.ts` — interface `PlacesProvider` (`textSearch`, `placeDetails`)
- [x] `providers/google-places-provider.ts` — implementação `fetch()` cru, portando os field masks de `fetch-recycling-places.ts`, `bounds` como parâmetro (não mais hardcoded)
- [x] `providers/geocoding-provider.ts` — interface `GeocodingProvider` (`geocodeCity`)
- [x] `providers/google-geocoding-provider.ts` — implementação via SDK `@googlemaps/google-maps-services-js` (`client.geocode`), extrai `geometry.viewport` (bounds) e `geometry.location` (center)
- [x] `providers/municipio-provider.ts` — interface `MunicipioProvider` (`fetchByUf`)
- [x] `providers/ibge-municipio-provider.ts` — implementação `fetch()` cru (`estados/{UF}/municipios`) + `resolveMunicipio` (match client-side por nome normalizado) + `getUf` (isola o aninhamento real `microrregiao.mesorregiao.UF`, descoberto só na chamada real — a suposição inicial de um campo `uf` plano estava errada)
- [x] Testado manualmente contra as APIs reais (chave do `.env` local): Places Text Search e Geocoding retornaram 200 OK; IBGE retornou os 142 municípios de MT e resolveu Poconé corretamente
- [x] `npx tsc --noEmit` sem erros

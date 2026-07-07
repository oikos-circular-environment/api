# T4 — Parsers de endereço e horário

**Status:** ✅ Concluído
**Depende de:** T1
**Arquivos:** `services/address-parser.ts` (+spec), `services/business-hours-parser.ts` (+spec)

## Checklist

- [x] `services/address-parser.ts` — `class GoogleAddressParser.parse(place, ctx)`
- [x] `services/business-hours-parser.ts` — `class GoogleBusinessHoursParser.parse(hours)`
- [x] Spec de endereço: casos com endereço completo, sem CEP, sem bairro (fallback `"Centro"`), sem número (fallback `"S/N"`) — descoberto que o `district` herda a cidade concatenada em endereços de 4 segmentos (`"Bairro, Cidade"`), comportamento já presente no dataset real migrado, não um bug novo
- [x] **Bug real encontrado e corrigido (via validação de schema em T9)**: `companyAddressSchema` exige `latitude`/`longitude` como `number` obrigatório (regra de negócio: endereço só é válido com geolocalização real, sem `.nullable()`). O parser caía para `null` quando o Google não retornava `location` — corrigido para usar `ctx.center` (centro da cidade) como fallback. `AddressSeed.latitude`/`longitude` mudou de `number | null` para `number`
- [x] Spec de horário: múltiplos períodos no mesmo dia agrupados corretamente; sem `periods` retorna `[]`
- [x] `npm run test -- address-parser business-hours-parser` passa (9 testes)

# Contexto
O contexto atual de denúncia é baseada apenas na abertura da denúncia por parte do usuário. E não envolve resolução ou atualização vinda de terceiros.

A ideia é promover primeiramente a criação destas denúncias, e depois democratizar estes dados de forma na qual a sociedade possa interagir, evitando duplicidade e aumentando também a confiabilidade destas informações.

Posteriormente a isso temos a solução por parte de terceiros (órgãos públicos ou privados).

## Detalhes

Uma denúncia pode conter varias capturas, cada captura obrigatoriamente deve conter seus campos obrigatórios como já definido no schema.

Dentro de `complaint_captures`, a coluna geospatial é um json, no entanto os dados são estruturados.

```typescript
type Geospatial = {
  heading: {
    trueHeading: number;
    magHeading: number;
    accuracy: number;
  };
  location: {
    coords: {
      latitude: number;
      longitude: number;
      altitude: number | null;
      accuracy: number | null;
      altitudeAccuracy: number | null;
      heading: number | null;
      speed: number | null;
    };
    timestamp: number;
    mocked?: boolean;
  };
  addresses: {
    city: string | null;
    district: string | null;
    streetNumber: string | null;
    street: string | null;
    region: string | null;
    subregion: string | null;
    country: string | null;
    postalCode: string | null;
    name: string | null;
    isoCountryCode: string | null;
    timezone: string | null;
    formattedAddress: string | null;
  };
};

```

Essas informações inicialmente são capturados pela biblioteca do `expo-location`, portanto o objetivo é apenas salvar e retornar esses dados neste mesmo formato, visto que é o que precisamos no momento.

Dito isso na requisição de criação é necessário que essa estrutura seja tratada conforme a tipagem.

## Endpoints

#### Complaints
- GET `/complaints`: Lista todas as denúncias de um usuário;
- GET `/complaints/{id}`: Retorna os dados completos de uma determinada denúncia do usuário; 
- POST `/complaints`: Cria a denúncia com os dados brutos, a imagem não é enviada neste momento. Por padrão o status é aberto (OPEN);
- PATCH `/complaints/{id}`: atualiza apenas os dados básicos como tipo da denúncia (type) e observação (observation) dentro de `complaint_captures`;
- PATCH `/complaints/{id}/resolved`: O usuário pode marcar a própria denúncia como resolvida. Desta forma o status será resolvido (RESOLVED)
- PATCH `/complaints/{id}/canceled`: O usuário pode marcar a própria denúncia como cancelada. Desta forma o status será cancelado (CANCELED);

#### Attachments
Não será possível depois da criação fazer deleção ou atualização das imagens. Deste modo é possível assegurar a confiabilidade das informações.

- POST `/complaints/attachments`: Após a criação bruta dos dados este `endpoint` permite anexar a imagem a denúncia.

#### Dashboard
- GET `/complaints/dashboard`: Retorna de forma resumida os seguintes dados:

```typescript
export type ComplaintResume = {
  total: 10,
  open: 5,
  pending: 5,
  resolved: 4,
  canceled: 1,
  rejected: 0
};
```

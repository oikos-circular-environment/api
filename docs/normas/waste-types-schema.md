# Schema de Tipagem — Categorias de Resíduos (ABNT NBR 10004:2024)

> Normalização das categorias de resíduos para inclusão no banco de dados do Oikos.
> Base: `docs/normas/waste-categories-simplified.md` e `docs/normas/abnt-nbr-10004-knowledge-base.md`

---

## 1. Novos Enums — Prisma Schema

Adicionar ao `prisma/schema.prisma`:

```prisma
enum HazardLevel {
  LOW        // 🟢 Baixo — RNP confirmado, contato humano diário seguro
  MEDIUM     // 🟡 Médio — RNP potencial ou composição ambígua
  HIGH       // 🔴 Alto  — RP confirmado, exige coleta especializada
  VERY_HIGH  // ⛔ Muito Alto — RP de alta virulência/explosão, proibido coleta comum
}

enum WasteClassification {
  RP   // Resíduo Perigoso (Classe 1)
  RNP  // Resíduo Não Perigoso (Classe 2)
}
```

---

## 2. Novos Models — Prisma Schema

```prisma
model WasteCategory {
  id              String              @id @default(uuid())
  name            String
  description     String?
  hazard_level    HazardLevel
  classification  WasteClassification
  lgr_code        String?             // Código LGR principal (ex: "15 01 02 00")
  lgr_chapter     Int?                // Capítulo LGR (ex: 15)
  regulatory_note String?             // Ex: "Logística reversa obrigatória — CONAMA 401/2008"
  created_at      DateTime            @default(now())
  updated_at      DateTime            @updatedAt

  subcategories    WasteSubcategory[]
  company_wastes   CompanyWaste[]
  company_services CompanyService[]

  @@map("waste_categories")
}

model WasteSubcategory {
  id             String               @id @default(uuid())
  name           String
  hazard_level   HazardLevel?         // Sobrescreve o da categoria pai quando diferente
  classification WasteClassification? // Sobrescreve o da categoria pai quando diferente
  lgr_code       String?
  notes          String?
  created_at     DateTime             @default(now())

  category_id String
  category    WasteCategory @relation(fields: [category_id], references: [id], onDelete: Cascade)

  @@map("waste_subcategories")
}
```

### Alterações em models existentes

Adicionar relação em `CompanyWaste` e `CompanyService`:

```prisma
// Em CompanyWaste — adicionar:
  waste_category_id String?
  waste_category    WasteCategory? @relation(fields: [waste_category_id], references: [id], onDelete: SetNull)

// Em CompanyService — adicionar:
  waste_category_id String?
  waste_category    WasteCategory? @relation(fields: [waste_category_id], references: [id], onDelete: SetNull)
```

> `waste_category_id` é opcional (`String?`) para não quebrar registros existentes.

---

## 3. TypeScript — Tipos e Interfaces

```typescript
// src/modules/wastes/waste-types.ts

export const HazardLevel = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  VERY_HIGH: 'VERY_HIGH',
} as const
export type HazardLevel = (typeof HazardLevel)[keyof typeof HazardLevel]

export const WasteClassification = {
  RP: 'RP',
  RNP: 'RNP',
} as const
export type WasteClassification = (typeof WasteClassification)[keyof typeof WasteClassification]

export interface WasteCategory {
  id: string
  name: string
  description?: string | null
  hazard_level: HazardLevel
  classification: WasteClassification
  lgr_code?: string | null
  lgr_chapter?: number | null
  regulatory_note?: string | null
  created_at: Date
  updated_at: Date
  subcategories?: WasteSubcategory[]
}

export interface WasteSubcategory {
  id: string
  name: string
  hazard_level?: HazardLevel | null
  classification?: WasteClassification | null
  lgr_code?: string | null
  notes?: string | null
  created_at: Date
  category_id: string
  category?: WasteCategory
}
```

---

## 4. Zod — Schemas de Validação

```typescript
// src/modules/wastes/waste-schemas.ts
import { z } from 'zod'

export const HazardLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'])

export const WasteClassificationSchema = z.enum(['RP', 'RNP'])

export const WasteSubcategorySchema = z.object({
  name: z.string().min(1),
  hazard_level: HazardLevelSchema.optional(),
  classification: WasteClassificationSchema.optional(),
  lgr_code: z.string().optional(),
  notes: z.string().optional(),
})

export const WasteCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  hazard_level: HazardLevelSchema,
  classification: WasteClassificationSchema,
  lgr_code: z.string().optional(),
  lgr_chapter: z.number().int().optional(),
  regulatory_note: z.string().optional(),
  subcategories: z.array(WasteSubcategorySchema).optional(),
})

export type WasteCategoryInput = z.infer<typeof WasteCategorySchema>
export type WasteSubcategoryInput = z.infer<typeof WasteSubcategorySchema>
```

---

## 5. Seed Data

```typescript
// prisma/seeds/waste-categories.seed.ts
import type { WasteCategoryInput } from '../../src/modules/wastes/waste-schemas'

export const WASTE_CATEGORIES_SEED: WasteCategoryInput[] = [
  {
    name: 'Papel / Papelão',
    description: 'Embalagens e materiais celulósicos em geral',
    hazard_level: 'LOW',
    classification: 'RNP',
    lgr_code: '15 01 01 00',
    lgr_chapter: 15,
    subcategories: [
      { name: 'Caixas de papelão', lgr_code: '15 01 01 02' },
      { name: 'Papel de escritório, revistas e jornais' },
      { name: 'Embalagens de papel e cartão', lgr_code: '15 01 01 01' },
      { name: 'Embalagens longa-vida / Tetra Pak', lgr_code: '15 01 05 00' },
    ],
  },
  {
    name: 'Plástico',
    description: 'Embalagens e materiais plásticos em geral (limpos)',
    hazard_level: 'LOW',
    classification: 'RNP',
    lgr_code: '15 01 02 00',
    lgr_chapter: 15,
    subcategories: [
      { name: 'PET (garrafas de refrigerante e água)' },
      { name: 'PEAD (frascos de higiene, balde, leite)' },
      { name: 'PVC (tubos, canos, calhas)' },
      { name: 'PEBD (sacolas, filmes, embalagens flexíveis)' },
      { name: 'PP (potes, copos, tampas)' },
      { name: 'PS / Isopor (copos descartáveis, caixas)' },
      { name: 'Outros plásticos (carcaças, galões, conduítes)', lgr_code: '15 03 01 00' },
    ],
  },
  {
    name: 'Metal / Alumínio',
    description: 'Embalagens metálicas e sucatas de metal',
    hazard_level: 'LOW',
    classification: 'RNP',
    lgr_code: '15 01 04 00',
    lgr_chapter: 15,
    subcategories: [
      { name: 'Latas de alumínio (bebidas)' },
      { name: 'Latas de aço (alimentos, tintas vazias)' },
      { name: 'Sucata ferrosa (ferragens, vigas, vergalhões)', lgr_code: '15 03 02 01' },
      { name: 'Sucata não ferrosa (alumínio, cobre, latão)', lgr_code: '15 03 02 02' },
      { name: 'Fios e cabos de cobre' },
      { name: 'Embalagens aerossol VAZIAS', lgr_code: '15 01 12 00' },
    ],
  },
  {
    name: 'Vidro',
    description: 'Embalagens e materiais de vidro limpos',
    hazard_level: 'LOW',
    classification: 'RNP',
    lgr_code: '15 01 07 00',
    lgr_chapter: 15,
    subcategories: [
      { name: 'Garrafas e frascos (alimentos, bebidas, cosméticos)' },
      { name: 'Potes de vidro (conservas, geleia)' },
      { name: 'Vidro plano (janelas, espelhos)', lgr_code: '15 03 03 00' },
    ],
  },
  {
    name: 'Madeira',
    description: 'Madeira não tratada e industrializada sem biocidas',
    hazard_level: 'LOW',
    classification: 'RNP',
    lgr_code: '17 02 01 02',
    lgr_chapter: 17,
    subcategories: [
      { name: 'Madeira serrada não tratada (ripas, vigas, tábuas)', lgr_code: '17 02 01 02', hazard_level: 'LOW', classification: 'RNP' },
      { name: 'Compensado, MDF, OSB, madeira industrializada', lgr_code: '17 02 01 01', hazard_level: 'MEDIUM' },
      { name: 'Paletes e caixotes não tratados', lgr_code: '15 03 06 00', hazard_level: 'LOW' },
      {
        name: 'Madeira tratada com biocidas (CCA, CCB, creosoto)',
        lgr_code: '17 02 04 01',
        hazard_level: 'HIGH',
        classification: 'RP',
        notes: 'RP confirmado — dormentes, mourões, decks externos. Coleta especializada.',
      },
    ],
  },
  {
    name: 'Têxtil / Roupas / Tecidos',
    description: 'Vestuário, calçados e retalhos têxteis limpos',
    hazard_level: 'LOW',
    classification: 'RNP',
    lgr_code: '15 03 05 00',
    lgr_chapter: 15,
    subcategories: [
      { name: 'Roupas usadas (camisas, calças, casacos)' },
      { name: 'Calçados (tênis, sapatos)' },
      { name: 'Bolsas e acessórios têxteis' },
      { name: 'Retalhos de tecido e fios' },
      { name: 'Carpetes, tapetes e panos' },
    ],
  },
  {
    name: 'Borracha / Pneus',
    description: 'Pneus inservíveis e materiais de borracha em geral',
    hazard_level: 'LOW',
    classification: 'RNP',
    lgr_code: '16 01 24 00',
    lgr_chapter: 16,
    regulatory_note: 'Logística reversa obrigatória — Resolução CONAMA 416/2009',
    subcategories: [
      { name: 'Pneus de automóveis', lgr_code: '16 01 24 00' },
      { name: 'Pneus de motocicletas', lgr_code: '16 01 27 00' },
      { name: 'Pneus de caminhões e ônibus', lgr_code: '16 01 26 00' },
      { name: 'Pneus de bicicletas', lgr_code: '16 01 25 00' },
      { name: 'Mangueiras, correias e borrachas industriais', lgr_code: '15 03 07 00' },
    ],
  },
  {
    name: 'Eletroeletrônicos (REEE)',
    description: 'Equipamentos elétricos e eletrônicos fora de uso — composição variável, tratar como MÉDIO/ALTO por segurança',
    hazard_level: 'MEDIUM',
    classification: 'RNP',
    lgr_code: '15 05 04 00',
    lgr_chapter: 15,
    regulatory_note: 'Logística reversa obrigatória — Decreto 9.177/2017 (PNRS)',
    subcategories: [
      { name: 'Computadores e notebooks', hazard_level: 'MEDIUM' },
      { name: 'Smartphones e tablets', hazard_level: 'MEDIUM', notes: 'Remover bateria antes do descarte' },
      { name: 'Monitores LCD/LED', hazard_level: 'MEDIUM' },
      { name: 'Monitores CRT (tubo — antigos)', hazard_level: 'HIGH', classification: 'RP', notes: 'Contém até 3 kg de chumbo no funil de vidro' },
      { name: 'Televisores LCD/LED', hazard_level: 'MEDIUM' },
      { name: 'Televisores de tubo (CRT)', hazard_level: 'HIGH', classification: 'RP', notes: 'Chumbo significativo' },
      { name: 'Impressoras e scanners', hazard_level: 'MEDIUM' },
      { name: 'Geladeiras e ar-condicionado', hazard_level: 'HIGH', classification: 'RP', notes: 'Contém CFC/HCFC — drenagem obrigatória por técnico', lgr_code: '16 02 11 00' },
      { name: 'Equipamentos de som e vídeo', hazard_level: 'MEDIUM' },
      { name: 'Fios e cabos elétricos', hazard_level: 'LOW', classification: 'RNP' },
    ],
  },
  {
    name: 'Pilhas e Baterias',
    description: 'Pilhas portáteis, baterias de lítio, chumbo-ácido e acumuladores',
    hazard_level: 'HIGH',
    classification: 'RP',
    lgr_code: '15 04 01 01',
    lgr_chapter: 15,
    regulatory_note: 'Logística reversa obrigatória — Resolução CONAMA 401/2008',
    subcategories: [
      {
        name: 'Baterias de lítio portáteis (Li-ion, LiPo)',
        hazard_level: 'VERY_HIGH',
        classification: 'RP',
        lgr_code: '15 04 01 01',
        notes: 'Risco de incêndio e explosão, especialmente se danificada. Armazenar em recipiente metálico com areia.',
      },
      {
        name: 'Baterias Níquel-Cádmio (NiCd)',
        hazard_level: 'HIGH',
        classification: 'RP',
        lgr_code: '15 04 01 00',
        notes: 'Cádmio — cancerígeno e ecotóxico',
      },
      {
        name: 'Baterias Níquel-Hidreto Metálico (NiMH)',
        hazard_level: 'HIGH',
        classification: 'RP',
        lgr_code: '15 04 07 00',
      },
      {
        name: 'Bateria chumbo-ácido (automotiva)',
        hazard_level: 'HIGH',
        classification: 'RP',
        lgr_code: '15 04 03 00',
        notes: 'Chumbo + ácido sulfúrico',
      },
      {
        name: 'Pilhas-botão (relógio, controle remoto)',
        hazard_level: 'HIGH',
        classification: 'RP',
        lgr_code: '15 04 01 00',
        notes: 'Contêm mercúrio ou lítio miniatura',
      },
      {
        name: 'Pilhas alcalinas (AA, AAA, C, D, 9V)',
        hazard_level: 'MEDIUM',
        classification: 'RNP',
        lgr_code: '15 04 02 01',
        notes: 'Único tipo RNP. Mesmo assim, logística reversa obrigatória.',
      },
      {
        name: 'Bateria de lítio estacionária',
        hazard_level: 'HIGH',
        classification: 'RP',
        lgr_code: '15 04 05 00',
      },
    ],
  },
  {
    name: 'Lâmpadas',
    description: 'Lâmpadas de diferentes tecnologias — fluorescentes contêm mercúrio (RP)',
    hazard_level: 'HIGH',
    classification: 'RP',
    lgr_code: '15 05 01 00',
    lgr_chapter: 15,
    regulatory_note: 'Logística reversa obrigatória — Decreto 9.177/2017',
    subcategories: [
      {
        name: 'Fluorescente (tubular e compacta)',
        hazard_level: 'HIGH',
        classification: 'RP',
        lgr_code: '15 05 01 00',
        notes: 'Contém mercúrio (3–5 mg/lâmpada). Não quebrar.',
      },
      {
        name: 'Vapor de sódio (postes)',
        hazard_level: 'HIGH',
        classification: 'RP',
        lgr_code: '15 05 01 00',
        notes: 'Sódio reativo + mercúrio',
      },
      {
        name: 'Vapor de mercúrio',
        hazard_level: 'HIGH',
        classification: 'RP',
        lgr_code: '15 05 01 00',
      },
      {
        name: 'LED',
        hazard_level: 'MEDIUM',
        classification: 'RNP',
        lgr_code: '15 05 02 00',
        notes: 'Pode conter arsênico e índio; sem mercúrio',
      },
      {
        name: 'Incandescente',
        hazard_level: 'LOW',
        classification: 'RNP',
        lgr_code: '15 05 02 00',
      },
      {
        name: 'Halógena',
        hazard_level: 'MEDIUM',
        classification: 'RNP',
        lgr_code: '15 05 02 00',
      },
    ],
  },
  {
    name: 'Óleo Vegetal Usado (de cozinha)',
    description: 'Óleo de fritura e gorduras animais de cozimento',
    hazard_level: 'MEDIUM',
    classification: 'RNP',
    lgr_code: '15 03 09 00',
    lgr_chapter: 15,
    regulatory_note: 'Destinação para biodiesel — Resolução ANP 7/2008',
    subcategories: [
      { name: 'Óleo de soja, canola, girassol, oliva (frituras)' },
      { name: 'Gordura animal de cozimento (banha, sebo)' },
    ],
  },
  {
    name: 'Óleo Mineral / Lubrificante',
    description: 'Óleos de motor, hidráulicos, transmissão e graxas — todos RP',
    hazard_level: 'VERY_HIGH',
    classification: 'RP',
    lgr_code: '13 02 01 00',
    lgr_chapter: 13,
    regulatory_note: 'Coleta especializada obrigatória — Resolução CONAMA 362/2005 (rerrefino)',
    subcategories: [
      { name: 'Óleo de motor (automóveis, motos, caminhões)', lgr_code: '13 02 01 00' },
      { name: 'Óleo hidráulico usado', lgr_code: '13 01 10 00' },
      { name: 'Óleo de transmissão usado', lgr_code: '13 02 98 00' },
      { name: 'Graxas e lubrificantes usados', lgr_code: '13 08 04 00' },
    ],
  },
  {
    name: 'Medicamentos',
    description: 'Medicamentos vencidos domiciliares comuns (RNP) e especiais (RP)',
    hazard_level: 'MEDIUM',
    classification: 'RNP',
    lgr_code: '15 05 08 00',
    lgr_chapter: 15,
    regulatory_note: 'Pontos de coleta regulamentados pela ANVISA — RDC 222/2018',
    subcategories: [
      {
        name: 'Medicamentos comuns vencidos (analgésicos, antigripais)',
        hazard_level: 'MEDIUM',
        classification: 'RNP',
        lgr_code: '15 05 08 00',
      },
      {
        name: 'Hormônios e anticoncepcionais',
        hazard_level: 'HIGH',
        classification: 'RP',
        lgr_code: '18 02 01 00',
        notes: 'Descarte apenas via farmácias/serviços de saúde',
      },
      {
        name: 'Antibióticos e antimicrobianos',
        hazard_level: 'HIGH',
        classification: 'RP',
        lgr_code: '18 02 01 00',
        notes: 'Descarte apenas via farmácias/serviços de saúde',
      },
      {
        name: 'Quimioterápicos / antineoplásicos',
        hazard_level: 'VERY_HIGH',
        classification: 'RP',
        lgr_code: '18 02 01 00',
        notes: 'Serviços de saúde especializados apenas',
      },
    ],
  },
  {
    name: 'Embalagens Contaminadas',
    description: 'Embalagens que contiveram substâncias perigosas — sempre RP',
    hazard_level: 'HIGH',
    classification: 'RP',
    lgr_code: '15 01 10 00',
    lgr_chapter: 15,
    regulatory_note: 'Logística reversa específica — agrotóxicos via INPEV; lubrificantes via sistema próprio',
    subcategories: [
      { name: 'Embalagens de agrotóxico / pesticida', notes: 'Logística reversa obrigatória — INPEV' },
      { name: 'Embalagens de solventes, tintas com solvente' },
      { name: 'Embalagens de produtos corrosivos (ácidos, bases)' },
      { name: 'Embalagens de desinfetantes industriais', lgr_code: '15 05 10 00' },
      { name: 'Aerossóis não completamente vazios com produto perigoso' },
    ],
  },
  {
    name: 'Construção Civil (RCD)',
    description: 'Resíduos de construção e demolição — maioria RNP, amianto é MUITO ALTO',
    hazard_level: 'LOW',
    classification: 'RNP',
    lgr_code: '17 01 01 00',
    lgr_chapter: 17,
    subcategories: [
      { name: 'Concreto, cimento, argamassa', lgr_code: '17 01 01 00', hazard_level: 'LOW', classification: 'RNP' },
      { name: 'Tijolos e blocos cerâmicos', lgr_code: '17 01 02 00', hazard_level: 'LOW', classification: 'RNP' },
      { name: 'Azulejos, pisos cerâmicos, louças sanitárias', lgr_code: '17 01 03 00', hazard_level: 'LOW', classification: 'RNP' },
      { name: 'Gesso (drywall, gesso liso)', lgr_code: '17 08 02 00', hazard_level: 'LOW', classification: 'RNP' },
      { name: 'Asfalto sem alcatrão (RAP)', lgr_code: '17 03 02 00', hazard_level: 'LOW', classification: 'RNP' },
      { name: 'Solos e rochas limpos', lgr_code: '17 05 04 00', hazard_level: 'LOW', classification: 'RNP' },
      {
        name: 'Amianto / Fibrocimento (eternit, telhas, tubos)',
        lgr_code: '17 06 05 00',
        hazard_level: 'VERY_HIGH',
        classification: 'RP',
        notes: 'Coleta especializada obrigatória — proibida coleta comum',
      },
      {
        name: 'Madeira tratada com biocidas (construção)',
        lgr_code: '17 02 04 01',
        hazard_level: 'HIGH',
        classification: 'RP',
      },
    ],
  },
  {
    name: 'Veículos em Fim de Vida',
    description: 'Automóveis, motos e componentes — exige drenagem prévia',
    hazard_level: 'HIGH',
    classification: 'RP',
    lgr_code: '16 01 03 00',
    lgr_chapter: 16,
    regulatory_note: 'Exige credenciamento de desmontadora (SENATRAN/DETRAN). Pneus — CONAMA 416/2009.',
    subcategories: [
      { name: 'Veículo completo (com fluidos)', hazard_level: 'HIGH', classification: 'RP', lgr_code: '16 01 03 00' },
      { name: 'Veículo drenado (sem fluidos perigosos)', hazard_level: 'LOW', classification: 'RNP', lgr_code: '16 01 04 00' },
      { name: 'Filtros de óleo automotivos', hazard_level: 'HIGH', classification: 'RP', lgr_code: '16 01 07 00' },
      { name: 'Fluidos de freio', hazard_level: 'HIGH', classification: 'RP', lgr_code: '16 01 13 00' },
      { name: 'Air bags não deflagrados', hazard_level: 'HIGH', classification: 'RP', lgr_code: '16 01 10 00' },
    ],
  },
  {
    name: 'Resíduos Orgânicos',
    description: 'Restos de alimentos, poda de árvores e resíduos vegetais — RNP Classe 2A',
    hazard_level: 'LOW',
    classification: 'RNP',
    lgr_code: '02 01 03 00',
    lgr_chapter: 2,
    regulatory_note: 'Compostagem — Resolução CONAMA 481/2017; PNRS — Decreto 10.936/2022',
    subcategories: [
      { name: 'Restos de alimentos crus (frutas, cascas, vegetais)', hazard_level: 'LOW' },
      { name: 'Restos de alimentos cozidos (carnes, laticínios)', hazard_level: 'MEDIUM', notes: 'Requer sistema fechado de compostagem — atrai vetores' },
      { name: 'Borra de café, chá e filtros' },
      { name: 'Poda de árvores e arbustos (galhos, troncos)', hazard_level: 'LOW', lgr_code: '02 01 03 00' },
      { name: 'Grama, folhas e resíduos de jardinagem' },
      { name: 'Resíduos de feiras livres e hortifrúti', lgr_code: '02 01 03 00' },
      { name: 'Resíduos de restaurantes e cozinhas comerciais', hazard_level: 'MEDIUM', notes: 'Volume elevado; grandes geradores — sujeitos à Resolução ANVISA' },
    ],
  },
  {
    name: 'Resíduos de Serviços de Saúde (RSS)',
    description: 'Resíduos hospitalares, clínicos e laboratoriais — todos RP, coleta proibida para empresas convencionais',
    hazard_level: 'VERY_HIGH',
    classification: 'RP',
    lgr_code: '18 01 02 00',
    lgr_chapter: 18,
    regulatory_note: 'Coleta obrigatória por empresa licenciada pela ANVISA e Secretaria de Saúde. RDC ANVISA 222/2018. Tratamento por autoclave ou incineração.',
    subcategories: [
      { name: 'Materiais perfurocortantes (agulhas, seringas, lâminas)', lgr_code: '18 04 01 00' },
      { name: 'Resíduos com agentes biológicos (curativos, sangue)', lgr_code: '18 01 02 00' },
      { name: 'Medicamentos especiais (antibióticos, hormônios, quimioterápicos)', lgr_code: '18 02 01 00' },
      { name: 'Peças anatômicas e órgãos', lgr_code: '18 01 12 00' },
      { name: 'Resíduos radioativos (medicina nuclear)', lgr_code: '18 03 01 00' },
      { name: 'Equipamentos de hemodiálise e diálise descartados', lgr_code: '18 01 07 00' },
    ],
  },
]
```

---

## 6. Migration de Referência

Após aplicar as alterações no schema Prisma, gerar a migration:

```bash
npx prisma migrate dev --name add_waste_categories
```

Para rodar o seed:

```bash
npx prisma db seed
```

---

## 7. Relação com o Modelo Atual

```
WasteCategory (1) ──── (N) WasteSubcategory
      │
      │ (1)
      │
      N
CompanyWaste ──── (N) CompanyService
```

A coluna `waste_type` (`RECYCLABLE` | `GARBAGE`) no `CompanyWaste` existente pode conviver com `waste_category_id` durante a migração. O `waste_category_id` é a forma normalizada.

---

*Referências:*
- *`docs/normas/waste-categories-simplified.md`*
- *`docs/normas/abnt-nbr-10004-knowledge-base.md`*

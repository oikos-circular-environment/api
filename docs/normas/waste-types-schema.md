# Schema de Tipagem — Categorias de Resíduos (ABNT NBR 10004:2024)

> Normalização das categorias de resíduos para inclusão no banco de dados do Oikos.
> Base: `docs/normas/waste-categories-simplified.md` e `docs/normas/abnt-nbr-10004-knowledge-base.md`

---

## 1. Novos Enums — Prisma Schema

Adicionar ao `prisma/schema.prisma`:

```prisma
enum HazardLevel {
  LOW        // 🟢 Baixo — RNP confirmado, contato humano diário seguro
  MEDIUM     // 🟡 Médio — RNP potencial ou Entrada-Espelho
  HIGH       // 🔴 Alto  — RP confirmado, exige coleta especializada
  VERY_HIGH  // ⛔ Muito Alto — RP de alta virulência/explosão, proibido coleta comum
}

enum WasteClassification {
  RP   // Resíduo Perigoso (Classe 1)
  RNP  // Resíduo Não Perigoso (Classe 2)
}

enum LGREntryType {
  UNIQUE  // Entrada Única (U) — classificação direta, sem ambiguidade
  MIRROR  // Entrada-Espelho (E) — depende de análise da composição
}

enum WasteCategorySlug {
  PAPER
  PLASTIC
  METAL
  GLASS
  WOOD
  TEXTILE
  RUBBER
  ELECTRONIC
  BATTERY
  LAMP
  VEGETABLE_OIL
  MINERAL_OIL
  MEDICINE
  CONTAMINATED_PACKAGING
  CONSTRUCTION
  VEHICLE
  ORGANIC
  HEALTH_CARE_WASTE
}
```

---

## 2. Novos Models — Prisma Schema

```prisma
model WasteCategory {
  id             String            @id @default(uuid())
  slug           WasteCategorySlug @unique
  label          String            // Nome de exibição em PT-BR
  description    String?
  hazard_level   HazardLevel
  classification WasteClassification
  entry_type     LGREntryType
  lgr_code       String?           // Código LGR principal (ex: "15 01 02 00")
  lgr_chapter    Int?              // Capítulo LGR (ex: 15)
  is_oikos_accepted Boolean        @default(true)  // Oikos aceita esta categoria?
  requires_specialized_collection Boolean @default(false)
  regulatory_note String?          // Ex: "Logística reversa obrigatória — CONAMA 401/2008"
  created_at     DateTime          @default(now())
  updated_at     DateTime          @updatedAt

  subcategories  WasteSubcategory[]
  company_wastes CompanyWaste[]
  company_services CompanyService[]

  @@map("waste_categories")
}

model WasteSubcategory {
  id             String               @id @default(uuid())
  name           String               // Slug/identificador interno
  label          String               // Nome de exibição em PT-BR
  hazard_level   HazardLevel?         // Sobrescreve o da categoria pai quando diferente
  classification WasteClassification? // Sobrescreve o da categoria pai quando diferente
  lgr_code       String?
  notes          String?
  created_at     DateTime             @default(now())

  category_id    String
  category       WasteCategory @relation(fields: [category_id], references: [id], onDelete: Cascade)

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

export const LGREntryType = {
  UNIQUE: 'UNIQUE',
  MIRROR: 'MIRROR',
} as const
export type LGREntryType = (typeof LGREntryType)[keyof typeof LGREntryType]

export const WasteCategorySlug = {
  PAPER: 'PAPER',
  PLASTIC: 'PLASTIC',
  METAL: 'METAL',
  GLASS: 'GLASS',
  WOOD: 'WOOD',
  TEXTILE: 'TEXTILE',
  RUBBER: 'RUBBER',
  ELECTRONIC: 'ELECTRONIC',
  BATTERY: 'BATTERY',
  LAMP: 'LAMP',
  VEGETABLE_OIL: 'VEGETABLE_OIL',
  MINERAL_OIL: 'MINERAL_OIL',
  MEDICINE: 'MEDICINE',
  CONTAMINATED_PACKAGING: 'CONTAMINATED_PACKAGING',
  CONSTRUCTION: 'CONSTRUCTION',
  VEHICLE: 'VEHICLE',
  ORGANIC: 'ORGANIC',
  HEALTH_CARE_WASTE: 'HEALTH_CARE_WASTE',
} as const
export type WasteCategorySlug = (typeof WasteCategorySlug)[keyof typeof WasteCategorySlug]

export interface WasteCategory {
  id: string
  slug: WasteCategorySlug
  label: string
  description?: string | null
  hazard_level: HazardLevel
  classification: WasteClassification
  entry_type: LGREntryType
  lgr_code?: string | null
  lgr_chapter?: number | null
  is_oikos_accepted: boolean
  requires_specialized_collection: boolean
  regulatory_note?: string | null
  created_at: Date
  updated_at: Date
  subcategories?: WasteSubcategory[]
}

export interface WasteSubcategory {
  id: string
  name: string
  label: string
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

export const LGREntryTypeSchema = z.enum(['UNIQUE', 'MIRROR'])

export const WasteCategorySlugSchema = z.enum([
  'PAPER',
  'PLASTIC',
  'METAL',
  'GLASS',
  'WOOD',
  'TEXTILE',
  'RUBBER',
  'ELECTRONIC',
  'BATTERY',
  'LAMP',
  'VEGETABLE_OIL',
  'MINERAL_OIL',
  'MEDICINE',
  'CONTAMINATED_PACKAGING',
  'CONSTRUCTION',
  'VEHICLE',
  'ORGANIC',
  'HEALTH_CARE_WASTE',
])

export const WasteSubcategorySchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  hazard_level: HazardLevelSchema.optional(),
  classification: WasteClassificationSchema.optional(),
  lgr_code: z.string().optional(),
  notes: z.string().optional(),
})

export const WasteCategorySchema = z.object({
  slug: WasteCategorySlugSchema,
  label: z.string().min(1),
  description: z.string().optional(),
  hazard_level: HazardLevelSchema,
  classification: WasteClassificationSchema,
  entry_type: LGREntryTypeSchema,
  lgr_code: z.string().optional(),
  lgr_chapter: z.number().int().optional(),
  is_oikos_accepted: z.boolean().default(true),
  requires_specialized_collection: z.boolean().default(false),
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
    slug: 'PAPER',
    label: 'Papel / Papelão',
    description: 'Embalagens e materiais celulósicos em geral',
    hazard_level: 'LOW',
    classification: 'RNP',
    entry_type: 'UNIQUE',
    lgr_code: '15 01 01 00',
    lgr_chapter: 15,
    is_oikos_accepted: true,
    requires_specialized_collection: false,
    subcategories: [
      { name: 'cardboard', label: 'Caixas de papelão', lgr_code: '15 01 01 02' },
      { name: 'paper', label: 'Papel de escritório, revistas e jornais' },
      { name: 'cardboard_packaging', label: 'Embalagens de papel e cartão', lgr_code: '15 01 01 01' },
      { name: 'long_life', label: 'Embalagens longa-vida / Tetra Pak', lgr_code: '15 01 05 00' },
    ],
  },
  {
    slug: 'PLASTIC',
    label: 'Plástico',
    description: 'Embalagens e materiais plásticos em geral (limpos)',
    hazard_level: 'LOW',
    classification: 'RNP',
    entry_type: 'UNIQUE',
    lgr_code: '15 01 02 00',
    lgr_chapter: 15,
    is_oikos_accepted: true,
    requires_specialized_collection: false,
    subcategories: [
      { name: 'pet', label: 'PET (garrafas de refrigerante e água)' },
      { name: 'hdpe', label: 'PEAD (frascos de higiene, balde, leite)' },
      { name: 'pvc', label: 'PVC (tubos, canos, calhas)' },
      { name: 'ldpe', label: 'PEBD (sacolas, filmes, embalagens flexíveis)' },
      { name: 'pp', label: 'PP (potes, copos, tampas)' },
      { name: 'ps', label: 'PS / Isopor (copos descartáveis, caixas)' },
      { name: 'other_plastics', label: 'Outros plásticos (carcaças, galões, conduítes)', lgr_code: '15 03 01 00' },
    ],
  },
  {
    slug: 'METAL',
    label: 'Metal / Alumínio',
    description: 'Embalagens metálicas e sucatas de metal',
    hazard_level: 'LOW',
    classification: 'RNP',
    entry_type: 'UNIQUE',
    lgr_code: '15 01 04 00',
    lgr_chapter: 15,
    is_oikos_accepted: true,
    requires_specialized_collection: false,
    subcategories: [
      { name: 'aluminum_cans', label: 'Latas de alumínio (bebidas)' },
      { name: 'steel_cans', label: 'Latas de aço (alimentos, tintas vazias)' },
      { name: 'ferrous_scrap', label: 'Sucata ferrosa (ferragens, vigas, vergalhões)', lgr_code: '15 03 02 01' },
      { name: 'non_ferrous_scrap', label: 'Sucata não ferrosa (alumínio, cobre, latão)', lgr_code: '15 03 02 02' },
      { name: 'copper_wire', label: 'Fios e cabos de cobre' },
      { name: 'aerosol_empty', label: 'Embalagens aerossol VAZIAS', lgr_code: '15 01 12 00' },
    ],
  },
  {
    slug: 'GLASS',
    label: 'Vidro',
    description: 'Embalagens e materiais de vidro limpos',
    hazard_level: 'LOW',
    classification: 'RNP',
    entry_type: 'UNIQUE',
    lgr_code: '15 01 07 00',
    lgr_chapter: 15,
    is_oikos_accepted: true,
    requires_specialized_collection: false,
    subcategories: [
      { name: 'bottles', label: 'Garrafas e frascos (alimentos, bebidas, cosméticos)' },
      { name: 'jars', label: 'Potes de vidro (conservas, geleia)' },
      { name: 'flat_glass', label: 'Vidro plano (janelas, espelhos)', lgr_code: '15 03 03 00' },
    ],
  },
  {
    slug: 'WOOD',
    label: 'Madeira',
    description: 'Madeira não tratada e industrializada sem biocidas',
    hazard_level: 'LOW',
    classification: 'RNP',
    entry_type: 'MIRROR',
    lgr_code: '17 02 01 02',
    lgr_chapter: 17,
    is_oikos_accepted: true,
    requires_specialized_collection: false,
    subcategories: [
      { name: 'sawn_wood', label: 'Madeira serrada não tratada (ripas, vigas, tábuas)', lgr_code: '17 02 01 02', hazard_level: 'LOW', classification: 'RNP' },
      { name: 'engineered_wood', label: 'Compensado, MDF, OSB, madeira industrializada', lgr_code: '17 02 01 01', hazard_level: 'MEDIUM' },
      { name: 'pallets', label: 'Paletes e caixotes não tratados', lgr_code: '15 03 06 00', hazard_level: 'LOW' },
      {
        name: 'treated_wood',
        label: 'Madeira tratada com biocidas (CCA, CCB, creosoto)',
        lgr_code: '17 02 04 01',
        hazard_level: 'HIGH',
        classification: 'RP',
        notes: 'NÃO aceitar — RP confirmado. Dormentes, mourões, decks externos.',
      },
    ],
  },
  {
    slug: 'TEXTILE',
    label: 'Têxtil / Roupas / Tecidos',
    description: 'Vestuário, calçados e retalhos têxteis limpos',
    hazard_level: 'LOW',
    classification: 'RNP',
    entry_type: 'UNIQUE',
    lgr_code: '15 03 05 00',
    lgr_chapter: 15,
    is_oikos_accepted: true,
    requires_specialized_collection: false,
    subcategories: [
      { name: 'clothing', label: 'Roupas usadas (camisas, calças, casacos)' },
      { name: 'footwear', label: 'Calçados (tênis, sapatos)' },
      { name: 'bags', label: 'Bolsas e acessórios têxteis' },
      { name: 'fabric_scraps', label: 'Retalhos de tecido e fios' },
      { name: 'carpets', label: 'Carpetes, tapetes e panos' },
    ],
  },
  {
    slug: 'RUBBER',
    label: 'Borracha / Pneus',
    description: 'Pneus inservíveis e materiais de borracha em geral',
    hazard_level: 'LOW',
    classification: 'RNP',
    entry_type: 'UNIQUE',
    lgr_code: '16 01 24 00',
    lgr_chapter: 16,
    is_oikos_accepted: true,
    requires_specialized_collection: false,
    regulatory_note: 'Logística reversa obrigatória — Resolução CONAMA 416/2009',
    subcategories: [
      { name: 'car_tires', label: 'Pneus de automóveis', lgr_code: '16 01 24 00' },
      { name: 'motorcycle_tires', label: 'Pneus de motocicletas', lgr_code: '16 01 27 00' },
      { name: 'truck_tires', label: 'Pneus de caminhões e ônibus', lgr_code: '16 01 26 00' },
      { name: 'bicycle_tires', label: 'Pneus de bicicletas', lgr_code: '16 01 25 00' },
      { name: 'rubber_parts', label: 'Mangueiras, correias e borrachas industriais', lgr_code: '15 03 07 00' },
    ],
  },
  {
    slug: 'ELECTRONIC',
    label: 'Eletroeletrônicos (REEE)',
    description: 'Equipamentos elétricos e eletrônicos fora de uso — Entrada-Espelho',
    hazard_level: 'MEDIUM',
    classification: 'RNP',
    entry_type: 'MIRROR',
    lgr_code: '15 05 04 00',
    lgr_chapter: 15,
    is_oikos_accepted: true,
    requires_specialized_collection: true,
    regulatory_note: 'Logística reversa obrigatória — Decreto 9.177/2017 (PNRS)',
    subcategories: [
      { name: 'computers', label: 'Computadores e notebooks', hazard_level: 'MEDIUM' },
      { name: 'smartphones', label: 'Smartphones e tablets', hazard_level: 'MEDIUM', notes: 'Remover bateria antes do descarte' },
      { name: 'lcd_monitors', label: 'Monitores LCD/LED', hazard_level: 'MEDIUM' },
      { name: 'crt_monitors', label: 'Monitores CRT (tubo — antigos)', hazard_level: 'HIGH', classification: 'RP', notes: 'Contém até 3 kg de chumbo no funil de vidro' },
      { name: 'lcd_tv', label: 'Televisores LCD/LED', hazard_level: 'MEDIUM' },
      { name: 'crt_tv', label: 'Televisores de tubo (CRT)', hazard_level: 'HIGH', classification: 'RP', notes: 'Chumbo significativo' },
      { name: 'printers', label: 'Impressoras e scanners', hazard_level: 'MEDIUM' },
      { name: 'refrigerators', label: 'Geladeiras e ar-condicionado', hazard_level: 'HIGH', classification: 'RP', notes: 'Contém CFC/HCFC — drenagem obrigatória por técnico', lgr_code: '16 02 11 00' },
      { name: 'audio_video', label: 'Equipamentos de som e vídeo', hazard_level: 'MEDIUM' },
      { name: 'cables', label: 'Fios e cabos elétricos', hazard_level: 'LOW', classification: 'RNP' },
    ],
  },
  {
    slug: 'BATTERY',
    label: 'Pilhas e Baterias',
    description: 'Pilhas portáteis, baterias de lítio, chumbo-ácido e acumuladores',
    hazard_level: 'HIGH',
    classification: 'RP',
    entry_type: 'MIRROR',
    lgr_code: '15 04 01 01',
    lgr_chapter: 15,
    is_oikos_accepted: false,
    requires_specialized_collection: true,
    regulatory_note: 'Logística reversa obrigatória — Resolução CONAMA 401/2008',
    subcategories: [
      {
        name: 'lithium_battery',
        label: 'Baterias de lítio portáteis (Li-ion, LiPo)',
        hazard_level: 'VERY_HIGH',
        classification: 'RP',
        lgr_code: '15 04 01 01',
        notes: 'Risco de incêndio e explosão, especialmente se danificada. Armazenar em recipiente metálico com areia.',
      },
      {
        name: 'nicd_battery',
        label: 'Baterias Níquel-Cádmio (NiCd)',
        hazard_level: 'HIGH',
        classification: 'RP',
        lgr_code: '15 04 01 00',
        notes: 'Cádmio — cancerígeno e ecotóxico',
      },
      {
        name: 'nimh_battery',
        label: 'Baterias Níquel-Hidreto Metálico (NiMH)',
        hazard_level: 'HIGH',
        classification: 'RP',
        lgr_code: '15 04 07 00',
      },
      {
        name: 'lead_acid_battery',
        label: 'Bateria chumbo-ácido (automotiva)',
        hazard_level: 'HIGH',
        classification: 'RP',
        lgr_code: '15 04 03 00',
        notes: 'Chumbo + ácido sulfúrico',
      },
      {
        name: 'button_cell',
        label: 'Pilhas-botão (relógio, controle remoto)',
        hazard_level: 'HIGH',
        classification: 'RP',
        lgr_code: '15 04 01 00',
        notes: 'Contêm mercúrio ou lítio miniatura',
      },
      {
        name: 'alkaline_battery',
        label: 'Pilhas alcalinas (AA, AAA, C, D, 9V)',
        hazard_level: 'MEDIUM',
        classification: 'RNP',
        lgr_code: '15 04 02 01',
        notes: 'Único tipo RNP. Mesmo assim, logística reversa obrigatória.',
      },
      {
        name: 'stationary_lithium',
        label: 'Bateria de lítio estacionária',
        hazard_level: 'HIGH',
        classification: 'RP',
        lgr_code: '15 04 05 00',
      },
    ],
  },
  {
    slug: 'LAMP',
    label: 'Lâmpadas',
    description: 'Lâmpadas de diferentes tecnologias — fluorescentes exigem coleta especializada',
    hazard_level: 'HIGH',
    classification: 'RP',
    entry_type: 'MIRROR',
    lgr_code: '15 05 01 00',
    lgr_chapter: 15,
    is_oikos_accepted: false,
    requires_specialized_collection: true,
    regulatory_note: 'Logística reversa obrigatória — Decreto 9.177/2017',
    subcategories: [
      {
        name: 'fluorescent',
        label: 'Fluorescente (tubular e compacta)',
        hazard_level: 'HIGH',
        classification: 'RP',
        lgr_code: '15 05 01 00',
        notes: 'Contém mercúrio (3–5 mg/lâmpada). Não quebrar.',
      },
      {
        name: 'sodium_vapor',
        label: 'Vapor de sódio (postes)',
        hazard_level: 'HIGH',
        classification: 'RP',
        lgr_code: '15 05 01 00',
        notes: 'Sódio reativo + mercúrio',
      },
      {
        name: 'mercury_vapor',
        label: 'Vapor de mercúrio',
        hazard_level: 'HIGH',
        classification: 'RP',
        lgr_code: '15 05 01 00',
      },
      {
        name: 'led',
        label: 'LED',
        hazard_level: 'MEDIUM',
        classification: 'RNP',
        lgr_code: '15 05 02 00',
        notes: 'Pode conter arsênico e índio; sem mercúrio',
      },
      {
        name: 'incandescent',
        label: 'Incandescente',
        hazard_level: 'LOW',
        classification: 'RNP',
        lgr_code: '15 05 02 00',
      },
      {
        name: 'halogen',
        label: 'Halógena',
        hazard_level: 'MEDIUM',
        classification: 'RNP',
        lgr_code: '15 05 02 00',
      },
    ],
  },
  {
    slug: 'VEGETABLE_OIL',
    label: 'Óleo Vegetal Usado (de cozinha)',
    description: 'Óleo de fritura e gorduras animais de cozimento',
    hazard_level: 'MEDIUM',
    classification: 'RNP',
    entry_type: 'MIRROR',
    lgr_code: '15 03 09 00',
    lgr_chapter: 15,
    is_oikos_accepted: true,
    requires_specialized_collection: false,
    regulatory_note: 'Destinação para biodiesel — Resolução ANP 7/2008',
    subcategories: [
      { name: 'cooking_oil', label: 'Óleo de soja, canola, girassol, oliva (frituras)' },
      { name: 'animal_fat', label: 'Gordura animal de cozimento (banha, sebo)' },
    ],
  },
  {
    slug: 'MINERAL_OIL',
    label: 'Óleo Mineral / Lubrificante',
    description: 'Óleos de motor, hidráulicos, transmissão e graxas — todos RP',
    hazard_level: 'VERY_HIGH',
    classification: 'RP',
    entry_type: 'UNIQUE',
    lgr_code: '13 02 01 00',
    lgr_chapter: 13,
    is_oikos_accepted: false,
    requires_specialized_collection: true,
    regulatory_note: 'Coleta especializada obrigatória — Resolução CONAMA 362/2005 (rerrefino)',
    subcategories: [
      { name: 'engine_oil', label: 'Óleo de motor (automóveis, motos, caminhões)', lgr_code: '13 02 01 00' },
      { name: 'hydraulic_oil', label: 'Óleo hidráulico usado', lgr_code: '13 01 10 00' },
      { name: 'transmission_oil', label: 'Óleo de transmissão usado', lgr_code: '13 02 98 00' },
      { name: 'grease', label: 'Graxas e lubrificantes usados', lgr_code: '13 08 04 00' },
    ],
  },
  {
    slug: 'MEDICINE',
    label: 'Medicamentos',
    description: 'Medicamentos vencidos domiciliares comuns (RNP) e especiais (RP)',
    hazard_level: 'MEDIUM',
    classification: 'RNP',
    entry_type: 'UNIQUE',
    lgr_code: '15 05 08 00',
    lgr_chapter: 15,
    is_oikos_accepted: true,
    requires_specialized_collection: false,
    regulatory_note: 'Pontos de coleta regulamentados pela ANVISA — RDC 222/2018',
    subcategories: [
      {
        name: 'common_medicine',
        label: 'Medicamentos comuns vencidos (analgésicos, antigripais)',
        hazard_level: 'MEDIUM',
        classification: 'RNP',
        lgr_code: '15 05 08 00',
      },
      {
        name: 'hormones',
        label: 'Hormônios e anticoncepcionais',
        hazard_level: 'HIGH',
        classification: 'RP',
        lgr_code: '18 02 01 00',
        notes: 'Descarte apenas via farmácias/serviços de saúde',
      },
      {
        name: 'antibiotics',
        label: 'Antibióticos e antimicrobianos',
        hazard_level: 'HIGH',
        classification: 'RP',
        lgr_code: '18 02 01 00',
        notes: 'Descarte apenas via farmácias/serviços de saúde',
      },
      {
        name: 'chemotherapy',
        label: 'Quimioterápicos / antineoplásicos',
        hazard_level: 'VERY_HIGH',
        classification: 'RP',
        lgr_code: '18 02 01 00',
        notes: 'Serviços de saúde especializados apenas',
      },
    ],
  },
  {
    slug: 'CONTAMINATED_PACKAGING',
    label: 'Embalagens Contaminadas',
    description: 'Embalagens que contiveram substâncias perigosas — sempre RP',
    hazard_level: 'HIGH',
    classification: 'RP',
    entry_type: 'UNIQUE',
    lgr_code: '15 01 10 00',
    lgr_chapter: 15,
    is_oikos_accepted: false,
    requires_specialized_collection: true,
    regulatory_note: 'Logística reversa específica — agrotóxicos via INPEV; lubrificantes via sistema próprio',
    subcategories: [
      { name: 'pesticide_packaging', label: 'Embalagens de agrotóxico / pesticida', notes: 'Logística reversa obrigatória — INPEV' },
      { name: 'solvent_packaging', label: 'Embalagens de solventes, tintas com solvente' },
      { name: 'corrosive_packaging', label: 'Embalagens de produtos corrosivos (ácidos, bases)' },
      { name: 'disinfectant_packaging', label: 'Embalagens de desinfetantes industriais', lgr_code: '15 05 10 00' },
      { name: 'pressurized_packaging', label: 'Aerossóis não completamente vazios com produto perigoso' },
    ],
  },
  {
    slug: 'CONSTRUCTION',
    label: 'Construção Civil (RCD)',
    description: 'Resíduos de construção e demolição — maioria RNP, amianto é MUITO ALTO',
    hazard_level: 'LOW',
    classification: 'RNP',
    entry_type: 'MIRROR',
    lgr_code: '17 01 01 00',
    lgr_chapter: 17,
    is_oikos_accepted: true,
    requires_specialized_collection: false,
    subcategories: [
      { name: 'concrete', label: 'Concreto, cimento, argamassa', lgr_code: '17 01 01 00', hazard_level: 'LOW', classification: 'RNP' },
      { name: 'brick', label: 'Tijolos e blocos cerâmicos', lgr_code: '17 01 02 00', hazard_level: 'LOW', classification: 'RNP' },
      { name: 'ceramic', label: 'Azulejos, pisos cerâmicos, louças sanitárias', lgr_code: '17 01 03 00', hazard_level: 'LOW', classification: 'RNP' },
      { name: 'gypsum', label: 'Gesso (drywall, gesso liso)', lgr_code: '17 08 02 00', hazard_level: 'LOW', classification: 'RNP' },
      { name: 'asphalt_no_tar', label: 'Asfalto sem alcatrão (RAP)', lgr_code: '17 03 02 00', hazard_level: 'LOW', classification: 'RNP' },
      { name: 'clean_soil', label: 'Solos e rochas limpos', lgr_code: '17 05 04 00', hazard_level: 'LOW', classification: 'RNP' },
      {
        name: 'asbestos',
        label: 'Amianto / Fibrocimento (eternit, telhas, tubos)',
        lgr_code: '17 06 05 00',
        hazard_level: 'VERY_HIGH',
        classification: 'RP',
        notes: 'PROIBIDO coleta comum — coleta especializada obrigatória',
      },
      {
        name: 'treated_wood_construction',
        label: 'Madeira tratada com biocidas (construção)',
        lgr_code: '17 02 04 01',
        hazard_level: 'HIGH',
        classification: 'RP',
      },
    ],
  },
  {
    slug: 'VEHICLE',
    label: 'Veículos em Fim de Vida',
    description: 'Automóveis, motos e componentes — exige drenagem prévia',
    hazard_level: 'HIGH',
    classification: 'RP',
    entry_type: 'UNIQUE',
    lgr_code: '16 01 03 00',
    lgr_chapter: 16,
    is_oikos_accepted: false,
    requires_specialized_collection: true,
    regulatory_note: 'Exige credenciamento de desmontadora (SENATRAN/DETRAN). Pneus — CONAMA 416/2009.',
    subcategories: [
      { name: 'full_vehicle', label: 'Veículo completo (com fluidos)', hazard_level: 'HIGH', classification: 'RP', lgr_code: '16 01 03 00' },
      { name: 'drained_vehicle', label: 'Veículo drenado (sem fluidos perigosos)', hazard_level: 'LOW', classification: 'RNP', lgr_code: '16 01 04 00' },
      { name: 'oil_filter', label: 'Filtros de óleo automotivos', hazard_level: 'HIGH', classification: 'RP', lgr_code: '16 01 07 00' },
      { name: 'brake_fluid', label: 'Fluidos de freio', hazard_level: 'HIGH', classification: 'RP', lgr_code: '16 01 13 00' },
      { name: 'airbag', label: 'Air bags não deflagrados', hazard_level: 'HIGH', classification: 'RP', lgr_code: '16 01 10 00' },
    ],
  },
  {
    slug: 'ORGANIC',
    label: 'Resíduos Orgânicos',
    description: 'Restos de alimentos, poda de árvores e resíduos vegetais — RNP Classe 2A',
    hazard_level: 'LOW',
    classification: 'RNP',
    entry_type: 'UNIQUE',
    lgr_code: '02 01 03 00',
    lgr_chapter: 2,
    is_oikos_accepted: true,
    requires_specialized_collection: false,
    regulatory_note: 'Compostagem — Resolução CONAMA 481/2017; PNRS — Decreto 10.936/2022',
    subcategories: [
      { name: 'raw_food_scraps', label: 'Restos de alimentos crus (frutas, cascas, vegetais)', hazard_level: 'LOW' },
      { name: 'cooked_food_scraps', label: 'Restos de alimentos cozidos (carnes, laticínios)', hazard_level: 'MEDIUM', notes: 'Requer sistema fechado de compostagem — atrai vetores' },
      { name: 'coffee_grounds', label: 'Borra de café, chá e filtros' },
      { name: 'tree_pruning', label: 'Poda de árvores e arbustos (galhos, troncos)', hazard_level: 'LOW', lgr_code: '02 01 03 00' },
      { name: 'garden_waste', label: 'Grama, folhas e resíduos de jardinagem' },
      { name: 'market_waste', label: 'Resíduos de feiras livres e hortifrúti', lgr_code: '02 01 03 00' },
      { name: 'restaurant_waste', label: 'Resíduos de restaurantes e cozinhas comerciais', hazard_level: 'MEDIUM', notes: 'Volume elevado; grandes geradores — sujeitos à Resolução ANVISA' },
    ],
  },
  {
    slug: 'HEALTH_CARE_WASTE',
    label: 'Resíduos de Serviços de Saúde (RSS)',
    description: 'Resíduos hospitalares, clínicos e laboratoriais — todos RP, coleta proibida para empresas convencionais',
    hazard_level: 'VERY_HIGH',
    classification: 'RP',
    entry_type: 'UNIQUE',
    lgr_code: '18 01 02 00',
    lgr_chapter: 18,
    is_oikos_accepted: false,
    requires_specialized_collection: true,
    regulatory_note: 'Coleta obrigatória por empresa licenciada pela ANVISA e Secretaria de Saúde. RDC ANVISA 222/2018. Tratamento por autoclave ou incineração.',
    subcategories: [
      { name: 'sharps', label: 'Materiais perfurocortantes (agulhas, seringas, lâminas)', lgr_code: '18 04 01 00' },
      { name: 'biological', label: 'Resíduos com agentes biológicos (curativos, sangue)', lgr_code: '18 01 02 00' },
      { name: 'special_medicine', label: 'Medicamentos especiais (antibióticos, hormônios, quimioterápicos)', lgr_code: '18 02 01 00' },
      { name: 'anatomical', label: 'Peças anatômicas e órgãos', lgr_code: '18 01 12 00' },
      { name: 'radioactive', label: 'Resíduos radioativos (medicina nuclear)', lgr_code: '18 03 01 00' },
      { name: 'dialysis', label: 'Equipamentos de hemodiálise e diálise descartados', lgr_code: '18 01 07 00' },
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

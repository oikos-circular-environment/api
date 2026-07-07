# T14 — Seletor de anexos de denúncia

**Status:** ⬜ Pendente
**Depende de:** T3, T12
**Arquivos:** `cli/complaints/services/complaint-attachment-picker.ts` (+spec)

## Checklist

- [ ] Lista fixa dos 7 arquivos movidos para `cli/assets/` em T3 (`image-test.jpg`, `images.jpeg`, `images (1).jpeg`, `landfill.jpg`, `plastic-waste-3692513_640.jpg`, `plasticbottles_0.jpg`, `waste.jpg`)
- [ ] `ComplaintAttachmentPicker.pick(): ComplaintAttachmentSeed[]` — distribuição ponderada de quantidade (`0: 10%`, `1: 60%`, `2: 25%`, `3: 5%` via `faker.helpers.weightedArrayElement`), sem repetir o mesmo arquivo na mesma denúncia (`faker.helpers.arrayElements` sem reposição)
- [ ] Todo item retornado tem `type: "PHOTO"` (os 7 assets são todos imagem)
- [ ] Spec cobre: quantidade nunca excede 3 nem repete arquivo; distribuição de quantidade é plausível num teste estatístico com N grande (não determinístico ponto a ponto)

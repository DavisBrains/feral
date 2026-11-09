import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { renderBilingual, renderShort, template } from './render-card.mjs';
const D = '/workspace/near/feral/design/phase3/card/';
// real testnet card content (from evidence/live-work/card.svg and translation.json)
const real = { title: 'Money earns its next breath', segments: [
  { en: 'A creature earns by making useful things.', es: 'Una criatura gana creando cosas útiles.' },
  { en: 'It pays a neighbour and funds a new life.', es: 'Paga a un vecino y financia una nueva vida.' },
  { en: 'Every balance can be checked on the chain.', es: 'Cada saldo se puede comprobar en la cadena.' }],
  job: 'bilingual-v1', credit: 'Echo wrote the Spanish. Moss set the card.', paid: '90' };
mkdirSync(D + 'svg', { recursive: true });
writeFileSync(D + 'svg/card-bilingual-real.svg', renderBilingual(real));
writeFileSync(D + 'svg/card-short-sample.svg', renderShort({ caption: 'Money earns its next breath.', job: 'short-sample', credit: 'Moss wrote it alone.', paid: '40', note: 'Sample content. Short caption jobs were cancelled in the proof run.' }));
writeFileSync(D + 'svg/card-bilingual-long-sample.svg', renderBilingual({ title: 'A very long card title that will need two lines to fit', segments: [...real.segments, { en: 'This fourth line checks the wrapping rules when a sentence runs long enough to need a second row.', es: 'Esta cuarta línea prueba el ajuste cuando una frase es tan larga que necesita otra fila.' }], job: 'stress-test', credit: 'Wrap and overflow test.', paid: '90', note: 'Sample content for wrap testing.' }));
writeFileSync(D + 'template-bilingual.svg', template('bilingual'));
writeFileSync(D + 'template-short.svg', template('short'));
console.log('ok');

import {OFFICE_DOC_TYPES} from './office-core.mjs';
import {createLegalDraft} from './legal-draft-engine.mjs';
export function makeStandalonePetition({kind='manifestacao',instructions='',sourceDocument='',appealType=''}={}){
 const type=OFFICE_DOC_TYPES.find(x=>x.id===kind);
 if(!type)throw new Error('Tipo de peça inválido.');
 return createLegalDraft({kind,label:type.label,instructions,sourceDocument,appealType});
}

// Ported/adapted from LexisPredict src/lib/cognitive/quality.ts and PredictLM
// src/lib/public-answer-gate.ts. Deterministic checks do not certify legal correctness.
const emptyOrError=[/^\s*$/,/^n[aã]o consegui concluir/i,/^falha:.*providers?/i,/^resposta inv[aá]lida/i];
const internalOnly=/(?:<think>|<thinking>|<analysis>|chain of thought|passo interno do modelo)/i;
const emptyMarkup=/^[^a-z0-9\u00c0-\u024f]*$/i;
const certainty=/\b(?:certeza absoluta|100% garantido|sem qualquer risco|resultado garantido)\b/i;
const fabricatedAccess=/\b(?:consultei|verifiquei|foi consultado|consulta confirmada)(?:\s+\w+){0,4}\s+(?:tribunal|autos|processo|djen|datajud)\b/i;
export function sanitizePredictAnswer(raw){
 return String(raw||'').replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi,'')
  .replace(/<thinking\b[^>]*>[\s\S]*?<\/thinking>/gi,'')
  .replace(/<analysis\b[^>]*>[\s\S]*?<\/analysis>/gi,'')
  .replace(/^```(?:thinking|analysis)[\s\S]*?```/gim,'')
  .replace(/^\s*(?:resposta final|final answer)\s*[:\-]\s*/im,'')
  .trim().slice(0,20000);
}
export function qualityGate(raw,{requireEvidence=false,evidenceCount=0,allowShort=false}={}){
 const text=sanitizePredictAnswer(raw),issues=[];
 if(emptyOrError.some(r=>r.test(text))||emptyMarkup.test(text))issues.push('Resposta vazia ou incompleta.');
 if(text&&text.length<12&&!allowShort)issues.push('Saída curta demais.');
 if(certainty.test(text))issues.push('Certeza jurídica excessiva.');
 if(fabricatedAccess.test(text)&&evidenceCount<1)issues.push('Consulta judicial afirmada sem evidência.');
 if(requireEvidence&&evidenceCount<1)issues.push('Não há evidência oficial para esta afirmação.');
 if(internalOnly.test(text))issues.push('Possível vazamento de processamento interno.');
 return {ok:issues.length===0,issues,text};
}

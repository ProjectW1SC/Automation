/**
 * Snapshot of *confirmed* feedback-based learning, not learned weights or
 * private user memory. Source: W2CAPITAL/PredictLm,
 * reports/selfimprove/auto-learning.json, branch automation/auto-learning-snapshot
 * at GitHub blob de651ca1f5649a852551610904249214ba36bdbc (2026-11-13).
 *
 * The Infinitum CRM may USE these approved guidelines at inference time.
 * It MUST NOT auto-approve new lessons, rewrite its code, or ingest raw
 * private feedback / client documents. Self-improvement requires human review.
 */
export const LEARNING_AUDIT=Object.freeze({
 checkedAt:'2026-11-13',
 policy:{humanApprovalRequired:true,autoPatch:false,rawFeedbackTransfer:false,customerDataTransfer:false},
 predictlm:{
  lastChecked:'2026-11-13',
  latestSnapshotAt:'2026-11-13T06:58:24.658Z',
  source:'W2CAPITAL/PredictLm:automation/auto-learning-snapshot/reports/selfimprove/auto-learning.json',
  sourceBlob:'de651ca1f5649a852551610904249214ba36bdbc',
  verifiedRuntimeLessons:3,
  evidenceOccurrences:48,
  approvedGlobalLessons:0,
  status:'3 lições promovidas no snapshot; nenhuma nova lição desde 2026-09-30',
  scheduledSyncIssue:'CI coleta e testa, mas não consegue abrir PR devido a permissões do GitHub Actions'
 },
 lexis:{
  source:'W1CAPITAL/LexisPredict:main/scripts/selfimprove/cycle.mjs',
  knowledgeSource:'Supabase LexisPredict · agregados de knowledge_docs/knowledge_chunks',
  knowledgeDocuments:4,
  knowledgeChunks:198,
  latestKnowledgeRecord:'2026-07-31',
  autonomousCyclesConfirmed:0,
  publishedAutoImprovementReportsConfirmed:0,
  agentFactsConfirmed:0,
  status:'base documental confirmada; ciclos de autoaprimoramento não comprovados no repositório'
 }
});
export const VERIFIED_RUNTIME_LESSONS=Object.freeze([
 Object.freeze({
  id:'media-reliability',category:'media-reliability',surface:'media',
  instruction:'Quando geração de mídia falhar ou for rejeitada, preserve o pedido original, não substitua por conteúdo desconexo e só apresente resultado quando houver artefato real validado.',
  evidenceCount:33,negativeCount:0,errorCount:33,confidence:0.9732,lastSeen:'2026-09-29T20:33:30.51231+00:00',
  source:'PredictLM / predict_auto_lessons / auto-learning snapshot 2026-11-13'
 }),
 Object.freeze({
  id:'chat-negative-relevance',category:'chat-negative-relevance',surface:'chat',
  instruction:'Feedback negativo em chat exige mais aderência ao pedido: prefira resposta direta, valide sobreposição temática e suprima README, blocos Relacionado, corpus ou conhecimento recuperado que não responda à pergunta.',
  evidenceCount:11,negativeCount:11,errorCount:0,confidence:0.8482,lastSeen:'2026-09-26T21:31:22.682943+00:00',
  source:'PredictLM / predict_auto_lessons / auto-learning snapshot 2026-11-13'
 }),
 Object.freeze({
  id:'chat-failure-recovery',category:'chat-failure-recovery',surface:'chat',
  instruction:'Quando uma rota de chat falhar, preserve a intenção exata do usuário, tente outra rota compatível e rejeite qualquer fallback que mude de assunto ou despeje contexto interno.',
  evidenceCount:4,negativeCount:0,errorCount:4,confidence:0.7431,lastSeen:'2026-09-24T23:56:08.524106+00:00',
  source:'PredictLM / predict_auto_lessons / auto-learning snapshot 2026-11-13'
 })
]);

/**
 * Contextual instructions are *fixed/promoted* operational lessons.
 * They never contain or echo the user's prompt, and never count as legal
 * evidence, dates, tribunal records, or permissions for external actions.
 */
export function verifiedLearningContext(_prompt,{surface='chat',limit=3}={}){
 const group=String(surface||'').toLowerCase().trim();
 if(!['chat','legal','media'].includes(group))return '';
 const selected=group==='media'?[VERIFIED_RUNTIME_LESSONS[0]]:
  [VERIFIED_RUNTIME_LESSONS[1],VERIFIED_RUNTIME_LESSONS[2]];
 const cap=Math.min(3,Math.max(1,Math.trunc(Number(limit)||3)));
 return 'LIÇÕES OPERACIONAIS CONFIRMADAS (não constituem prova jurídica nem autorizam ações externas):\n'+
  selected.slice(0,cap).map(x=>'- '+x.instruction).join('\n');
}

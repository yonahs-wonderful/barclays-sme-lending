const assert=require('node:assert/strict');
const fs=require('node:fs');
const core=require('../js/live-core.js');
const data=JSON.parse(fs.readFileSync('mock-data.json','utf8'));
for(const t of data.turns.slice(1)) {
 const exact=t.events.map(e=>e.text).join('\n');
 const out=core.eventsToTurn([{speaker:'customer',data:{type:'text',text:'customer echo'}},{speaker:'system',data:{type:'function_call',function_call:{name:'lending_step',output:JSON.stringify({Response:{result:{canonical_text:exact,rich_content:t.rich_content}}})}}},{speaker:'agent',data:{type:'text',text:'A model paraphrase should not replace canonical copy'}}]);
 assert.equal(out.events.length,1);assert.equal(out.events[0].text,exact);assert.deepEqual(out.rich_content,t.rich_content);
}
const question=core.eventsToTurn([{speaker:'system',data:{type:'function_call',function_call:{name:'lending_step',output:{Response:{result:{stage:1,guidance:'Answer question'}}}}}},{speaker:'agent',data:{type:'text',text:'RCF means revolving credit facility.'}}]);
assert.equal(question.events[0].text,'RCF means revolving credit facility.');assert.equal(question.rich_content.length,0);
assert.equal(core.eventsToTurn([{speaker:'system',data:{type:'function_call',function_call:{name:'lookup_customer',output:{Response:{result:{name:'test'}}}}}}]).rich_content[0].type,'claim_type_identified');
console.log('PASS: exact canonical text and cards, natural answers, no customer echo, legacy mapping');

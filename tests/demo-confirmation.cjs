const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
let now=0;const jobs=[],messages=[];
const scope={window:{},Map,setTimeout(fn,delay){const job={fn,at:now+delay};jobs.push(job);return job;},clearTimeout(job){job.cancelled=true;}};
vm.runInNewContext(fs.readFileSync('js/demo-confirmation.js','utf8'),scope);
const timer=scope.window.createDemoConfirmation(m=>messages.push(m));
const card={type:'claim_lodged',data:{task_id:'real-task',claim_ref:'RCF-TEST'}};
timer.schedule({type:'claim_lodged',data:{claim_ref:'no-task'}});assert.equal(jobs.length,0);
timer.schedule(card);timer.schedule(card);assert.equal(jobs.length,1);assert.equal(jobs[0].at,600000);
function advance(ms){now+=ms;jobs.forEach(j=>{if(!j.done&&!j.cancelled&&j.at<=now){j.done=true;j.fn();}});}
advance(599999);assert.equal(messages.length,0);advance(1);assert.equal(messages.length,1);assert.match(messages[0].text,/RCF-TEST/);assert.equal(messages[0].demoConfirmation,true);
timer.schedule(card);assert.equal(jobs.length,1);timer.schedule({type:'claim_lodged',data:{task_id:'second',claim_ref:'other'}});timer.dispose();advance(600000);assert.equal(messages.length,1);
console.log('PASS: accepted card only; ten-minute deadline; once per task; reference; simulation label; unmount cancellation.');

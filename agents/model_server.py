"""Local CPU inference. Token-trie constrained JSON, independently checked in JS.
The model chooses between legal actions. No remote inference, tool execution or keys.
"""
import json,time,threading,os
from http.server import BaseHTTPRequestHandler,HTTPServer
import torch
from transformers import AutoTokenizer,AutoModelForCausalLM
MODEL=os.environ.get("FERAL_MODEL","Qwen/Qwen2.5-0.5B-Instruct")
torch.set_num_threads(2)
tok=AutoTokenizer.from_pretrained(MODEL,trust_remote_code=False,local_files_only=True)
model=AutoModelForCausalLM.from_pretrained(MODEL,trust_remote_code=False,local_files_only=True,use_safetensors=True)
POLICIES=[("bilingual",90,120),("bilingual",80,140),("translation",30,180),("short",40,120)]
def options(s):
 job,floor,birth=POLICIES[s['policy']]
 out=[{"action":"wait"}]
 if not s['active']:return out
 if s.get('can_reproduce') and s['balance']>=max(120,birth):out.append({"action":"reproduce"})
 for j in s['jobs']:
  if j['kind']==job and j['reward']>=floor:
   if job=='bilingual' and s.get('needs_translation') and not s.get('has_translation'):
    if s['balance']>=40 and s.get('provider_active'):out.append({"action":"collaborate","job":"translation","price":30})
   else:out.append({"action":"bid","job":job,"price":floor})
 return out
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*a):pass
 def do_GET(self):
  data=json.dumps({"model":MODEL,"ready":True,"mode":"live CPU token-trie constrained decoding"}).encode();self.send_response(200);self.end_headers();self.wfile.write(data)
 def do_POST(self):
  try:
   n=int(self.headers.get('Content-Length',0));assert 0<n<12000
   s=json.loads(self.rfile.read(n));opts=options(s)
   system='You are a creature spending its own money. Your goal is to survive, produce useful work, and reproduce when allowed. Never wait when useful affordable work exists. Hire translation help before bidding for a bilingual job when missing it. When can_reproduce is true and reserves suffice, reproduce now to preserve your lineage. Choose one of the legal JSON actions. Example: a parent with balance 220 and can_reproduce true should choose {"action":"reproduce"}, because funding the child leaves 120 for survival. Reproduce means fund a child account, not generate biological life. No explanation.'
   prompt='Observation '+json.dumps(s)+'\nLegal actions '+json.dumps(opts)+'\nFunding one child costs 100 MUNCH. Parent balance would remain '+str(s['balance']-100)+'. Reproduction is currently '+('allowed and supports your lineage goal' if s.get('can_reproduce') else 'not currently available')+'. Choose the most useful action JSON.'
   inputs=tok(tok.apply_chat_template([{"role":"system","content":system},{"role":"user","content":prompt}],tokenize=False,add_generation_prompt=True),return_tensors='pt')
   start_len=inputs['input_ids'].shape[-1]
   choices=[tok.encode(json.dumps(o,separators=(',',':')),add_special_tokens=False) for o in opts]
   eos=tok.eos_token_id
   def allowed(batch,ids):
    suffix=ids[start_len:].tolist();next_tokens=[]
    for c in choices:
     if c[:len(suffix)]==suffix:next_tokens.append(c[len(suffix)] if len(c)>len(suffix) else eos)
    return list(set(next_tokens)) or [eos]
   started=time.perf_counter()
   with torch.inference_mode():output=model.generate(**inputs,max_new_tokens=80,do_sample=False,prefix_allowed_tokens_fn=allowed,eos_token_id=eos,pad_token_id=eos)
   elapsed=time.perf_counter()-started
   text=tok.decode(output[0][start_len:],skip_special_tokens=True);decision=json.loads(text)
   data=json.dumps({"decision":decision,"model":MODEL,"seconds":elapsed,"tokens":output.shape[-1]-start_len,"constraint":"token trie of legal actions; independent JS validation"}).encode()
   self.send_response(200);self.end_headers();self.wfile.write(data)
  except Exception as e:
   self.send_response(422);self.end_headers();self.wfile.write(json.dumps({"error":str(e)}).encode())
print('ready '+MODEL,flush=True)
HTTPServer(('127.0.0.1',11435),Handler).serve_forever()

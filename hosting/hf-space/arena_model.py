"""Feral v2 inference service (box only, loopback).
POST /choose    {"system","observation","options":[{...}]} -> one option, token trie constrained
POST /translate {"en": "..."} -> {"es": "..."} short free generation, validated by the keeper
GET  /health
Same pinned Qwen2.5 1.5B Instruct as the recorded run. No keys, no tools, no network.
"""
import json,time,os,threading
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
import torch
from transformers import AutoTokenizer,AutoModelForCausalLM
MODEL=os.environ.get("FERAL_MODEL","Qwen/Qwen2.5-1.5B-Instruct")
REVISION=os.environ.get("FERAL_MODEL_REVISION","989aa7980e4cf806f80c7fef2b1adb7bc71aa306")
torch.set_num_threads(int(os.environ.get("FERAL_THREADS","4")))
# Image bake downloads into the HF cache. Runtime stays offline unless FERAL_MODEL_LOCAL_ONLY=0.
LOCAL_ONLY=os.environ.get("FERAL_MODEL_LOCAL_ONLY","1")!="0"
tok=AutoTokenizer.from_pretrained(MODEL,trust_remote_code=False,local_files_only=LOCAL_ONLY,revision=REVISION)
model=AutoModelForCausalLM.from_pretrained(MODEL,trust_remote_code=False,local_files_only=LOCAL_ONLY,revision=REVISION,use_safetensors=True)
lock=threading.Lock()
def chat(system,user):
 return tok(tok.apply_chat_template([{"role":"system","content":system},{"role":"user","content":user}],tokenize=False,add_generation_prompt=True),return_tensors='pt')
def choose(body):
 opts=body['options'];assert 1<=len(opts)<=16
 inputs=chat(body['system'][:1500],'Observation '+json.dumps(body['observation'])[:5000]+'\nLegal actions, choose exactly one:\n'+'\n'.join(json.dumps(o,separators=(',',':')) for o in opts))
 start=inputs['input_ids'].shape[-1];eos=tok.eos_token_id
 choices=[tok.encode(json.dumps(o,separators=(',',':')),add_special_tokens=False) for o in opts]
 def allowed(b,ids):
  suf=ids[start:].tolist();nxt=set()
  for c in choices:
   if c[:len(suf)]==suf:nxt.add(c[len(suf)] if len(c)>len(suf) else eos)
  return list(nxt) or [eos]
 t=time.perf_counter()
 with torch.inference_mode():out=model.generate(**inputs,max_new_tokens=120,do_sample=False,prefix_allowed_tokens_fn=allowed,eos_token_id=eos,pad_token_id=eos)
 text=tok.decode(out[0][start:],skip_special_tokens=True)
 decision=json.loads(text);reason=None
 if body.get('explain'):
  # The model states its own reason for the action it already chose. Free text, bounded, shown as its words.
  q=chat(body['system'][:1500],'Observation '+json.dumps(body['observation'])[:5000]+'\nYou chose '+text+'. The outcome is not known yet. In one short first person sentence under 20 words, say why you are choosing this. Do not claim any result.')
  qs=q['input_ids'].shape[-1]
  with torch.inference_mode():o2=model.generate(**q,max_new_tokens=40,do_sample=False,pad_token_id=eos)
  reason=tok.decode(o2[0][qs:],skip_special_tokens=True).strip().split('\n')[0][:160]
 return {"decision":decision,"reason":reason,"model":MODEL,"seconds":round(time.perf_counter()-t,2),"constraint":"token trie over the legal actions; keeper validates again"}
def translate(body):
 en=str(body['en']);assert 1<=len(en)<=120
 inputs=chat('You translate English captions to natural Latin American Spanish. Reply with the Spanish caption only, one line, no quotes.',en)
 start=inputs['input_ids'].shape[-1];t=time.perf_counter()
 with torch.inference_mode():out=model.generate(**inputs,max_new_tokens=60,do_sample=False,pad_token_id=tok.eos_token_id)
 es=tok.decode(out[0][start:],skip_special_tokens=True).strip().split('\n')[0].strip().strip('"')
 return {"es":es,"model":MODEL,"seconds":round(time.perf_counter()-t,2),"mode":"greedy generation"}
class H(BaseHTTPRequestHandler):
 def log_message(self,*a):pass
 def reply(self,code,obj):
  d=json.dumps(obj).encode();self.send_response(code);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(d)
 def do_GET(self):
  self.reply(200,{"model":MODEL,"revision":REVISION,"ready":True,"routes":["/choose","/translate","/health"]})
 def do_POST(self):
  try:
   n=int(self.headers.get('Content-Length',0));assert 0<n<20000
   body=json.loads(self.rfile.read(n))
   with lock:self.reply(200,choose(body) if self.path=='/choose' else translate(body) if self.path=='/translate' else {"error":"route"})
  except Exception as e:self.reply(422,{"error":str(e)[:200]})
ThreadingHTTPServer(('127.0.0.1',int(os.environ.get("FERAL_MODEL_PORT","11436"))),H).serve_forever()

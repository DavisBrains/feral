import json,time,traceback
from pathlib import Path
result={"model":"Qwen/Qwen2.5-0.5B-Instruct","route":"transformers CPU from normal Hugging Face download","trust_remote_code":False,"inference_ran":False}
try:
 import torch
 from transformers import AutoTokenizer,AutoModelForCausalLM
 torch.set_num_threads(2)
 start=time.perf_counter()
 tok=AutoTokenizer.from_pretrained(result["model"],trust_remote_code=False)
 model=AutoModelForCausalLM.from_pretrained(result["model"],trust_remote_code=False,use_safetensors=True)
 result["load_seconds"]=time.perf_counter()-start
 prompt='Return only JSON with action bid, wait, or collaborate, job bilingual, translation, or short, and integer price from 0 to 100. Your policy is bilingual, minimum price 90, balance 240. Available job bilingual pays 90 and needs translation help costing 30.'
 inputs=tok(tok.apply_chat_template([{"role":"user","content":prompt}],tokenize=False,add_generation_prompt=True),return_tensors="pt")
 for run in range(2):
  start=time.perf_counter()
  with torch.inference_mode(): output=model.generate(**inputs,max_new_tokens=96,do_sample=False,pad_token_id=tok.eos_token_id)
  seconds=time.perf_counter()-start
  text=tok.decode(output[0][inputs["input_ids"].shape[-1]:],skip_special_tokens=True)
  result.setdefault("runs",[]).append({"seconds":seconds,"tokens":output.shape[-1]-inputs["input_ids"].shape[-1],"text":text})
 result["inference_ran"]=True
except Exception as e:
 result["error_type"]=type(e).__name__;result["error"]=str(e)[:1500]
print(json.dumps(result,indent=2))
Path("evidence/phase2-model-runtime.json").write_text(json.dumps(result,indent=2)+"\n")

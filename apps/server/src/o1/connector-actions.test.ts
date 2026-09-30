import { test, expect } from "node:test";
import { ConnectorActionService } from "./connector-actions.ts";

test("connector proposal never executes before approval", async () => {
  let executed=false;
  const bus={ execute:async()=>{ executed=true; return {ok:true}; } } as never;
  const db={
    value:null as any,
    async put(_owner:string,_kind:string,value:any){ this.value=value; return value; },
    async get(){ return this.value; },
  } as any;
  const service=new ConnectorActionService(db,bus);
  const action=await service.propose("owner","imessage.send",{chatId:"chat",text:"hello"});
  expect(action.status).toBe("awaiting_review");
  expect(executed).toBe(false);
});

test("connector decision executes only after an approved hash", async () => {
  let executed=false;
  const bus={ execute:async(input:any)=>{ executed=input.approved===true; return {ok:true}; } } as never;
  const db={ value:null as any, async put(_o:string,_k:string,v:any){this.value=v;return v;}, async get(){return this.value;} } as any;
  const service=new ConnectorActionService(db,bus);
  const action=await service.propose("owner","slack.send_message",{channel:"c",text:"hello"});
  const result=await service.decide("owner",action.id,action.hash,"approve");
  expect(executed).toBe(true);
  expect(result.status).toBe("succeeded");
});

test("marks an interrupted external write as outcome_unknown", async () => {
  const bus={ execute:async()=>{ throw Object.assign(new Error("provider timed out"), { name: "TimeoutError" }); } } as never;
  const db={ value:null as any, async put(_o:string,_k:string,v:any){this.value=v;return v;}, async get(){return this.value;} } as any;
  const service=new ConnectorActionService(db,bus);
  const action=await service.propose("owner","slack.send_message",{channel:"c",text:"hello"});
  const result=await service.decide("owner",action.id,action.hash,"approve");
  expect(result.status).toBe("outcome_unknown");
});
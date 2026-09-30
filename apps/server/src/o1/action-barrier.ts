/** O1 adaptation of the OpenBot action-admission pattern: synchronous admission, asynchronous draining. */
export function createActionBarrier() {
  let closed=false;
  let active=0;
  const waiters=new Set<()=>void>();
  return {
    enter():()=>void {
      if(closed) throw new Error("Action admission is closed for this runtime.");
      active+=1;
      let released=false;
      return ()=>{
        if(released) return;
        released=true;
        active-=1;
        if(active===0) for(const wake of [...waiters]) wake();
      };
    },
    close(){ closed=true; },
    open(){ closed=false; },
    pending(){ return active; },
    drain(timeoutMs=30_000):Promise<void>{
      if(active===0) return Promise.resolve();
      return new Promise((resolve,reject)=>{
        let timer:ReturnType<typeof setTimeout>;
        const wake=()=>{
          clearTimeout(timer);
          waiters.delete(wake);
          resolve();
        };
        timer=setTimeout(()=>{
          waiters.delete(wake);
          reject(new Error("An admitted action is still finishing; control transfer is not safe."));
        },timeoutMs);
        waiters.add(wake);
      });
    },
  };
}

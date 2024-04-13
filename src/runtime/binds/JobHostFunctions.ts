import { HostFunctionsNamespace } from "../HostFunctionsNamespace";
import NostrConnectorClient from "../PoolConnectorClient";
import { JobInput,JobParam } from "openagents-grpc-proto";
export default class JobHostFunctions extends HostFunctionsNamespace {
    constructor(client: NostrConnectorClient) {
        super("Job");
        this.registerFunction("log", async (mng,jobId,cp,offs:bigint)=>{
            const log=cp.read(offs).text();
            client.logForJob({jobId:jobId,log});
        });
        this.registerFunction("get", async (mng,currentJobId,cp, offs:bigint)=>{
            const jobId = cp.read(offs).text() || currentJobId;
            const res=await client.r(client.getJob({jobId}));
            const job:string=JSON.stringify(res);
            return cp.store(job);
        });
        this.registerFunction("isDone", async (mng, currentJobId, cp, offs: bigint) => {
            const jobId = cp.read(offs).text();
            console.log("Check job" + jobId);
            const res = await client.r(client.isJobDone({ jobId }));
            return res.isDone ? BigInt(1) : BigInt(0);
        });
        this.registerFunction("newInputEventRef", async (mng, _, cp, eventIdOff: bigint, markerOff:bigint,sourceOff:bigint) => {
            const ref=cp.read(eventIdOff).text();
            const marker=cp.read(markerOff).text();
            const source=cp.read(sourceOff).text();
            const input: JobInput={
                ref:ref,
                type:"event",
                marker,
                source
            };
            const inputStr=JSON.stringify(input);
            return cp.store(inputStr);
        });
        this.registerFunction("newInputJobRef", async (mng, _, cp, jobIdOff: bigint, markerOff:bigint,sourceOff:bigint) => {
            const ref=cp.read(jobIdOff).text();
            const marker=cp.read(markerOff).text();
            const source=cp.read(sourceOff).text();
            const input: JobInput={
                ref:ref,
                type:"data",
                marker,
                source
            }
            const inputStr=JSON.stringify(input);
            return cp.store(inputStr);
        });
        this.registerFunction("newInputData", async (mng, _, cp, dataOff: bigint, markerOff:bigint) => {
            const data=cp.read(dataOff).text();
            const marker=cp.read(markerOff).text();
            const input: JobInput={
                data,
                type:"text",
                marker
            }
            const inputStr=JSON.stringify(input);
            return cp.store(inputStr);
        });
        this.registerFunction("newParam", async (mng, _, cp, keyOff:bigint,valuesJsonOffset: bigint) => {            
            const key=cp.read(keyOff).text();
            const values = cp.read(valuesJsonOffset).json();
            const param:JobParam={
                key,
                value:values
            };
            const paramStr=JSON.stringify(param);
            return cp.store(paramStr);
        });
        this.registerFunction("waitFor", async (mng, _, cp, jobIdOff: bigint) => {
             const jobId = cp.read(jobIdOff).text();
             while(true){
                console.log("Check job" + jobId);
                const res = await client.r(client.isJobDone({ jobId }));
                console.log("Job done",res);
                if(res.isDone){
                    return  BigInt(1);
                }else{
                    await new Promise((res)=>setTimeout(res,100));
                }
             }
             return  BigInt(0);
             
        });
        this.registerFunction("request", async (mng, _, cp, 
            reqOff:bigint,
        ) => {
            const req = cp.read(reqOff).json();
                
            const res = await client.r(
                client.requestJob({
                    runOn: req.runOn,
                    expireAfter: Number(req.expireAfter),
                    input: req.inputs,
                    param: req.params,
                    description: req.description,
                    kind: req.kind,
                    outputFormat: req.outputFormata,
                })
            );
            const jobs: string = JSON.stringify(res);
            return cp.store(jobs);
        });

    }
   

    



}
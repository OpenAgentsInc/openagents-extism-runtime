import { CallContext } from "@extism/extism";
import { HostFunctionsNamespace } from "../HostFunctionsNamespace";
import NostrConnectorClient from "../NostrConnectorClient";
import { JobInput, JobParam } from "../proto/Protocol";
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
        this.registerFunction("isDone", async (mng, _, cp, offs: bigint) => {
            const res = await client.r(client.isJobDone({ jobId: cp.read(offs).text() }));
            const v:Uint8Array = new Uint8Array(1);
            return v[0]?1:0;
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
        this.registerFunction("request", async (mng, _, cp, 
            runOnOff: bigint, maxDuration:number, descriptionOff: bigint, 
            inputJsonOffset:bigint, paramsJsonOffset:bigint) => {
            const runOn=cp.read(runOnOff).text();          
            const inputs=cp.read(inputJsonOffset).json();
            const params=cp.read(paramsJsonOffset).json();  
            const description=cp.read(descriptionOff).text();
            const res = await client.r(client.requestJob({ 
                runOn,
                maxDuration,
                input:inputs,
                param:params,
                description,
                customerPrivateKey:""//TODO
            }));
            const jobs: string = JSON.stringify(res);
            return cp.store(jobs);
        });

    }
   

    



}
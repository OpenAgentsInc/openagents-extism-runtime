import { CallContext } from "@extism/extism";
import { HostFunctionsNamespace } from "../runtime/HostFunctionsNamespace";
import NostrConnectorClient from "../runtime/NostrConnectorClient";
import { JobInput, JobParam } from "../runtime/proto/Protocol";
export default class JobHostFunctions extends HostFunctionsNamespace {
    constructor(client: NostrConnectorClient) {
        super("Job");
        this.registerFunction("log",  (mng,jobId,cp,offs:bigint)=>{
            const log=cp.read(offs).text();
            console.info("log "+log);
        });
        this.registerFunction("get", async (mng,currentJobId,cp, offs:bigint)=>{
            const jobId = cp.read(offs).text() || currentJobId;
            console.info("get",jobId);
        });
        this.registerFunction("isDone", async (mng, _, cp, offs: bigint) => {
            const jobId = cp.read(offs).text();
            console.info("isDone",jobId);
            return 1;            
        });
        this.registerFunction("newInputEventRef", async (mng, _, cp, eventIdOff: bigint, markerOff:bigint,sourceOff:bigint) => {
            const ref=cp.read(eventIdOff).text();
            const marker=cp.read(markerOff).text();
            const source=cp.read(sourceOff).text();
            console.info("newInputEventRef",ref,marker,source);
            return cp.store("{}");
        });
        this.registerFunction("newInputJobRef", async (mng, _, cp, jobIdOff: bigint, markerOff:bigint,sourceOff:bigint) => {
            const ref=cp.read(jobIdOff).text();
            const marker=cp.read(markerOff).text();
            const source=cp.read(sourceOff).text();
            console.info("newInputJobRef",ref,marker,source);
            return cp.store("{}");
        });
        this.registerFunction("newInputData", async (mng, _, cp, dataOff: bigint, markerOff:bigint) => {
            const data=cp.read(dataOff).text();
            const marker=cp.read(markerOff).text();
            console.info("newInputData",data,marker);
            return cp.store("{}");
        });
        this.registerFunction("newParam", async (mng, _, cp, keyOff:bigint,valuesJsonOffset: bigint) => {            
            const key=cp.read(keyOff).text();
            const values = cp.read(valuesJsonOffset).json();
            console.info("newParam",key,values);
            return cp.store("{}");
        });
        this.registerFunction("request", async (mng, _, cp, 
            runOnOff: bigint, maxDuration:number, descriptionOff: bigint, 
            inputJsonOffset:bigint, paramsJsonOffset:bigint) => {
            const runOn=cp.read(runOnOff).text();          
            const inputs=cp.read(inputJsonOffset).json();
            const params=cp.read(paramsJsonOffset).json();  
            const description=cp.read(descriptionOff).text();
            console.info("request",runOn,maxDuration,description,inputs,params);
            return cp.store("{}");
        });

    }
   

    



}
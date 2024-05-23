import { HostFunctionsNamespace } from "../HostFunctionsNamespace";
import NostrConnectorClient from "../PoolConnectorClient";
import { Job, JobInput,JobParam,JobStatus } from "openagents-grpc-proto";
export default class JobHostFunctions extends HostFunctionsNamespace {
    constructor(client: NostrConnectorClient) {
        super("Job");
        this.registerFunction("log", async (mng, pluginPath, pluginId, currentJob: Job, cp, offs: bigint) => {
            const log = cp.read(offs).text();
            console.log(pluginId, ":", log);
            client.logForJob({ jobId: currentJob.id, log });
        });
        this.registerFunction("get", async (mng, pluginPath, pluginId, currentJob, cp, offs: bigint) => {
            const jobId = cp.read(offs).text() || currentJob.id;
            const res = await client.r(client.getJob({ jobId }));
            const job: string = JSON.stringify(res);
            return cp.store(job);
        });
        this.registerFunction("isDone", async (mng, pluginPath, pluginId, currentJob, cp, offs: bigint) => {
            const jobId = cp.read(offs).text();
            const res = await client.r(client.isJobDone({ jobId }));
            return res.isDone ? BigInt(1) : BigInt(0);
        });
        this.registerFunction(
            "newInputEventRef",
            async (
                mng,
                pluginPath,
                pluginId,
                currentJob,
                cp,
                eventIdOff: bigint,
                markerOff: bigint,
                sourceOff: bigint
            ) => {
                const ref = cp.read(eventIdOff).text();
                const marker = cp.read(markerOff).text();
                const source = cp.read(sourceOff).text();
                const input: JobInput = {
                    ref: ref,
                    type: "event",
                    marker,
                    source,
                };
                const inputStr = JSON.stringify(input);
                return cp.store(inputStr);
            }
        );
        this.registerFunction(
            "newInputJobRef",
            async (
                mng,
                pluginPath,
                pluginId,
                currentJob,
                cp,
                jobIdOff: bigint,
                markerOff: bigint,
                sourceOff: bigint
            ) => {
                const ref = cp.read(jobIdOff).text();
                const marker = cp.read(markerOff).text();
                const source = cp.read(sourceOff).text();
                const input: JobInput = {
                    ref: ref,
                    type: "job",
                    marker,
                    source,
                };
                const inputStr = JSON.stringify(input);
                return cp.store(inputStr);
            }
        );
        this.registerFunction(
            "newInputData",
            async (
                mng,
                pluginPath,
                pluginId,
                currentJob,
                cp,
                dataOff: bigint,
                typeOff: bigint,
                markerOff: bigint,
                relayOff: bigint
            ) => {
                const data = cp.read(dataOff).text();
                const marker = cp.read(markerOff).text();
                const type = cp.read(typeOff).text();
                const source = cp.read(relayOff).text();
                const input: JobInput = {
                    data,
                    type,
                    marker,
                    source,
                };
                const inputStr = JSON.stringify(input);
                return cp.store(inputStr);
            }
        );
        this.registerFunction(
            "newParam",
            async (mng, pluginPath, pluginId, currentJob, cp, keyOff: bigint, valuesJsonOffset: bigint) => {
                const key = cp.read(keyOff).text();
                const values = cp.read(valuesJsonOffset).json();
                const param: JobParam = {
                    key,
                    value: values.map((v) => v.toString()),
                };
                const paramStr = JSON.stringify(param);
                return cp.store(paramStr);
            }
        );


        this.registerFunction(
            "waitFor",
            async (mng, pluginPath, pluginId, currentJob, cp, jobIdOff: bigint, nExpectedResultsB: bigint, maxWaitTimeB: bigint) => {
                const jobId = cp.read(jobIdOff).text() ;
                const logPassthrough = true;
                const expectedResults = Number(nExpectedResultsB);
                const maxWaitTime = Number(maxWaitTimeB);


                const trackedLogs = [];
                
                let t=Date.now();
                while (true) {
                    try {
                        const job = await client.r(
                            client.getJob({ jobId, wait: 1000, nResultsToWait: expectedResults })
                        );
                        if (job) {
                            let successes = 0;
                            for(const state of job.results){
                                // propagate logs
                                if (logPassthrough){
                                    for (const log of state.logs) {
                                        if (!trackedLogs.includes(log.id)) {
                                            trackedLogs.push(log.id);
                                            console.log(pluginId, ":", log.log);
                                            client.logForJob({ jobId: currentJob.id, log: log.log });
                                        }
                                    }
                                }
                                if (state.status == JobStatus.SUCCESS)  successes++;
                                if(successes >= expectedResults){
                                    return BigInt(1);
                                }
                            }
                        }
                    } catch (e) {
                        // console.error(e);
                    }
                    if(Date.now()-t>maxWaitTime){
                        break;
                    }
                    await new Promise((res) => setTimeout(res, 100));
                }
                return BigInt(0);
            }
        );
        
        this.registerFunction(
            "subrequest",
            async (mng, pluginPath, pluginId, currentJob, cp, reqOff: bigint) => {
                const r = cp.read(reqOff).text();
                let req = JSON.parse(r);
                req = {
                    runOn: req.runOn,
                    expireAfter: Number(req.expireAfter) || 0,
                    input: req.inputs || [],
                    param: req.params || [],
                    description: req.description || "",
                    kind: req.kind || 5003,
                    outputFormat: req.outputFormat || "application/json",
                    requestProvider: currentJob.provider || undefined,
                    encrypted: currentJob.encrypted || false,
                };
                // console.log("Request job", req)
                const res = await client.r(client.requestJob(req));
                
                const jobs: string = JSON.stringify(res);
                return cp.store(jobs);
            }
        );

        this.registerFunction(
            "request",
            async (mng, pluginPath, pluginId, currentJob, cp, reqOff: bigint) => {
                const r = cp.read(reqOff).text();
                let req = JSON.parse(r);
                req = {
                    runOn: req.runOn,
                    expireAfter: Number(req.expireAfter) || 0,
                    input: req.inputs || [],
                    param: req.params || [],
                    description: req.description || "",
                    kind: req.kind || 5003,
                    outputFormat: req.outputFormat || "application/json",
                    requestProvider: req.requestProvider || undefined,
                    encrypted: req.encrypted || false,
                };
                // console.log("Request job", req)
                const res = await client.r(client.requestJob(req));
                const jobs: string = JSON.stringify(res);
                return cp.store(jobs);
            }
        );

    }
   

    



}
import { HostFunctionsNamespace } from "../HostFunctionsNamespace";
import NostrConnectorClient from "../PoolConnectorClient";
import { JobInput,JobParam,JobStatus } from "openagents-grpc-proto";
export default class JobHostFunctions extends HostFunctionsNamespace {
    constructor(client: NostrConnectorClient) {
        super("Job");
        this.registerFunction("log", async (mng, pluginPath, pluginId, jobId, cp, offs: bigint) => {
            const log = cp.read(offs).text();
            console.log(pluginId,":", log);
            client.logForJob({ jobId: jobId, log });
        });
        this.registerFunction("get", async (mng, pluginPath, pluginId, currentJobId, cp, offs: bigint) => {
            const jobId = cp.read(offs).text() || currentJobId;
            const res = await client.r(client.getJob({ jobId }));
            const job: string = JSON.stringify(res);
            return cp.store(job);
        });
        this.registerFunction("isDone", async (mng, pluginPath, pluginId, currentJobId, cp, offs: bigint) => {
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
                _,
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
                _,
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
            async (mng, pluginPath, pluginId, _, cp, dataOff: bigint, typeOff: bigint, markerOff: bigint, relayOff: bigint) => {
                const data = cp.read(dataOff).text();
                const marker = cp.read(markerOff).text();
                const type = cp.read(typeOff).text();
                const source = cp.read(relayOff).text();
                const input: JobInput = {
                    data,
                    type,
                    marker,
                    source
                };
                const inputStr = JSON.stringify(input);
                return cp.store(inputStr);
            }
        );
        this.registerFunction(
            "newParam",
            async (mng, pluginPath, pluginId, _, cp, keyOff: bigint, valuesJsonOffset: bigint) => {
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
                // this.registerFunction(
                //     "waitFor",
                //     async (mng, pluginPath, pluginId, _, cp, jobIdOff: bigint, logPassthroughBI: bigint) => {
                //         const jobId = cp.read(jobIdOff).text();
                //         while (true) {
                //             try{
                //                 console.log("Check job" + jobId);
                //                 const res = await client.r(client.isJobDone({ jobId }));
                //                 console.log("Job done", res);
                //                 if (res.isDone) {
                //                     return BigInt(1);
                //                 } else {
                //                     await new Promise((res) => setTimeout(res, 100));
                //                 }
                //             }catch(e){
                //                 console.error(e);
                //             }
                //         }
                //         return BigInt(0);
                //     }
                // );

        this.registerFunction(
            "waitFor",
            async (
                mng,
                pluginPath,
                pluginId,
                currentJobId,
                cp,
                jobIdOff: bigint,
            ) => {
                const jobId = cp.read(jobIdOff).text();
                const logPassthrough = true;
                let lastLog = 0;
                while (true) {
                    try {
                        const job = await client.r(client.getJob({ jobId , wait: 1000}));
                        if (job) {
                            if (job.state.status == JobStatus.SUCCESS && job.result.timestamp) {
                                return BigInt(1);
                            } else {
                            
                                if (logPassthrough) {
                                    for (const log of job.state.logs) {
                                        if (log.timestamp > lastLog) {
                                            console.log(pluginId, ":", log);
                                            client.logForJob({ jobId: currentJobId, log: log.log });
                                            lastLog = log.timestamp;
                                        }
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        // console.error(e);
                    }
                    await new Promise((res) => setTimeout(res, 100));
                }
                return BigInt(0);
            }
        );
        this.registerFunction("request", async (mng, pluginPath, pluginId, _, cp, reqOff: bigint) => {
            const r = cp.read(reqOff).text();
            let req=JSON.parse(r);
            req = {
                runOn: req.runOn,
                expireAfter: Number(req.expireAfter) || 0,
                input: req.inputs || [],
                param: req.params || [],
                description: req.description || "",
                kind: req.kind || 5003,
                outputFormat: req.outputFormat || "application/json",
            };
            // console.log("Request job", req)
            const res = await client.r(
                client.requestJob(req)
            );
            const jobs: string = JSON.stringify(res);
            return cp.store(jobs);
        });

    }
   

    



}
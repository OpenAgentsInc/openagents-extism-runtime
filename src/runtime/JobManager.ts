import { 
    PoolConnectorClient,    
    PendingJobs, 
    Job, 
    JobInput
} from "openagents-grpc-proto";


import ExtismJob from "./ExtismJob";
import { CallContext, CurrentPlugin } from "@extism/extism";
 import {ExtismFunction, HostFunctionsNamespace} from "./HostFunctionsNamespace";
import Secrets from "./Secrets";
import Crypto from "crypto";
type FailedJob = {
    jobId: string;
    time: number;
};
export default class JobManager {
    conn: PoolConnectorClient;
    loopTimeout: NodeJS.Timeout;
    stopNow: boolean = false;
    // jobs: ExtismJob[] = [];
    hostNamespaces: Array<HostFunctionsNamespace> = [];
    failedJobs: FailedJob[] = [];
    secrets: Secrets;

    constructor(conn: PoolConnectorClient, secrets: Secrets) {
        this.conn = conn;
        this.secrets = secrets;
    }

    async registerNamespace(namespace: HostFunctionsNamespace) {
        this.hostNamespaces.push(namespace);
    }

    async stop() {
        clearTimeout(this.loopTimeout);
        this.stopNow = true;
    }

    async start() {
        console.log("Starting job manager");
        await this._loop();
    }

    async _startPendingJobs() {
        try {
            this.failedJobs = this.failedJobs.filter((fj) => Date.now() - fj.time < 1000 * 60 * 5);

            const pendingJobs: PendingJobs = (
                await this.conn.getPendingJobs({
                    filterByRunOn: "openagents/extism-runtime",
                    wait: 60000,
                    excludeId: this.failedJobs.map((j) => j.jobId),
                    filterByBids: [
                        {
                            amount: 0,
                            currency: "bitcoin",
                            protocol: "lightning",
                        }
                    ],
                })
            ).response;

            if (pendingJobs.jobs.length > 0) {
                console.log(pendingJobs.jobs.length, "jobs to start");
            } else {
                console.log("No jobs to start");
            }

            for (const job of pendingJobs.jobs) {
                try {
                    const inputs: JobInput[] = job.input;
                    const input = inputs[0];

                    let inputData = input.data;
                    const pluginMain: string = job.param.find((param) => param.key == "main")?.value[0] || "";
                    const maxExecutionTime = job.maxExecutionTime;
                    const expiration = Math.min(Date.now() + maxExecutionTime, job.expiration);
                    const pluginMainSHAHash = Crypto.createHash("sha256").update(pluginMain).digest("hex");

                    let allowedHosts = undefined;
                    for(const p of job.param){
                        if (p.key == "allow-host") {
                            if (!allowedHosts) allowedHosts = [];
                            allowedHosts.push(...p.value);
                        } else if (p.key == "allow-hosts") {
                            if (!allowedHosts) allowedHosts = [];
                            allowedHosts.push(...p.value);
                        }
                    }
                    
                    if(this.secrets){
                        const secrets0 = this.secrets.namespace(pluginMainSHAHash);
                        const secrets1 = this.secrets.namespace(pluginMain);               
                        
                        const regex = /%secret.([a-zA-Z0-9_-]+)%/g;
                        let match;
                        while ((match = regex.exec(inputData)) !== null) {
                            const secretValue =
                                (await secrets0.get(match[1])) || (await secrets1.get(match[1]));
                            inputData = inputData.replace(match[0], secretValue || match[0]);
                        }

                    }

                    const mergedHostFunctions: {
                        [key: string]: ExtismFunction;
                    } = {};
                    for (const namespace of this.hostNamespaces) {
                        const functions: { [key: string]: ExtismFunction } = namespace.getHostFunctions(
                            this,
                            job,
                            pluginMain,
                            pluginMainSHAHash
                        );
                        for (const [name, func] of Object.entries(functions)) {
                            mergedHostFunctions[name] = func;
                        }
                    }
                    console.log("Running plugin", pluginMain);
                    const plugin = new ExtismJob(job.id, pluginMain, expiration, mergedHostFunctions, allowedHosts);
                    const res = (await this.conn.acceptJob({ jobId: job.id })).response;
                    console.log("Accepted job", res);
                    // console.log("Initializing plugin", pluginMain, pluginMainSHAHash,inputData);
                    plugin
                        .init()
                        .then(() => {
                            // this.jobs.push(plugin);
                            plugin
                                .run(inputData)
                                .then((output) => {
                                    // console.log("Plugin execution completed with output", output);
                                    this.conn.completeJob({
                                        jobId: job.id,
                                        output,
                                    });
                                    plugin.destroy();
                                })
                                .catch((e) => {
                                    console.error("Error running job", e);
                                    this.conn.cancelJob({
                                        jobId: job.id,
                                        reason: e.toString(),
                                    });
                                    plugin.destroy();
                                });
                        })
                        .catch((e) => {
                            console.error("Error initializing job", e);
                            this.conn.cancelJob({
                                jobId: job.id,
                                reason: e.toString(),
                            });
                             this.failedJobs.push({
                                 jobId: job.id,
                                 time: Date.now(),
                             });
                            plugin.destroy();
                        });
                
                } catch (e) {
                    console.error("Error starting job", job.id, e);
                    this.failedJobs.push({
                        jobId: job.id,
                        time: Date.now(),
                    });
                }
            }
        } catch (e) {
            console.error("Error starting pending jobs", e);
        }
    }

    // async _jobsLooping() {
    //     for (let i = 0; i < this.jobs.length; i++) {
    //         const job = this.jobs[i];
    //         try {
    //             if (await job.isExpired()) {
    //                 job.destroy();
    //                 this.jobs.splice(i, 1);
    //                 i--;
    //             } else {
    //                 job.loop();
    //             }
    //         } catch (e) {
    //             console.error("Error looping job", job.jobId, e);
    //         }
    //     }
    // }

    // async _loop1() {
    //     if (this.stopNow) return;
    //     await this._jobsLooping();
    //     this.loopTimeout = setTimeout(() => {
    //         this._loop1();
    //     }, 100);
    // }

    async _loop2() {
        if (this.stopNow) return;
        await this._startPendingJobs();
        this.loopTimeout = setTimeout(() => {
            this._loop2();
        }, 10);
    }

    async _loop() {
        // await this._loop1();
        await this._loop2();
    }
}
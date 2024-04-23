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
    jobs: ExtismJob[] = [];
    hostNamespaces: Array<HostFunctionsNamespace> = [];
    failedJobs: FailedJob[] = [];

    constructor(conn: PoolConnectorClient) {
        this.conn = conn;
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
            
            const pendingJobs: PendingJobs = (
                await this.conn.getPendingJobs({
                    filterByRunOn: "openagents/extism-runtime",
                    wait: 60000
                })
            ).response;
            if (pendingJobs.jobs.length > 0) {
                console.log(pendingJobs.jobs.length, "jobs to start");
            }else{
                console.log("No jobs to start");
            }
            this.failedJobs = this.failedJobs.filter((fj) => Date.now() - fj.time < 1000 * 60 * 5);
            for (const job of pendingJobs.jobs) {
                try {
                    if (this.failedJobs.find((fj) => fj.jobId == job.id)) {
                        // console.log("Skipping failed job", job.id);
                        continue;
                    }
                    const inputs: JobInput[] = job.input;
                    const input = inputs[0];

                    const inputData = input.data;
                    const pluginMain: string = job.param.find((param) => param.key == "main")?.value[0] || "";
                    const maxExecutionTime = job.maxExecutionTime;
                    const expiration = Math.min(Date.now() + maxExecutionTime, job.expiration);
                    const pluginMainSHAHash = Crypto.createHash("sha256").update(pluginMain).digest("hex");

                    const mergedHostFunctions: {
                        [key: string]: ExtismFunction;
                    } = {};
                    for (const namespace of this.hostNamespaces) {
                        const functions: { [key: string]: ExtismFunction } = namespace.getHostFunctions(
                            this,
                            job.id,
                            pluginMain,
                            pluginMainSHAHash
                        );
                        for (const [name, func] of Object.entries(functions)) {
                            mergedHostFunctions[name] = func;
                        }
                    }
                    console.log("Running plugin", pluginMain);
                    const plugin = new ExtismJob(job.id, pluginMain, expiration, mergedHostFunctions);
                    const res = (await this.conn.acceptJob({ jobId: job.id })).response;
                    console.log("Accepted job", res);
                    // console.log("Initializing plugin", pluginMain, pluginMainSHAHash,inputData);
                    plugin
                        .init()
                        .then(() => {
                            this.jobs.push(plugin);
                            plugin
                                .run(inputData)
                                .then((output) => {
                                    // console.log("Plugin execution completed with output", output);
                                    this.conn.completeJob({
                                        jobId: job.id,
                                        output,
                                    });
                                })
                                .catch((e) => {
                                    console.error("Error running job", e);
                                    this.conn.cancelJob({
                                        jobId: job.id,
                                        reason: e.toString(),
                                    });
                                });
                        })
                        .catch((e) => {
                            console.error("Error initializing job", e);
                            this.conn.cancelJob({
                                jobId: job.id,
                                reason: e.toString(),
                            });
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

    async _jobsLooping() {
        for (let i = 0; i < this.jobs.length; i++) {
            const job = this.jobs[i];
            try {
                if (await job.isExpired()) {
                    job.destroy();
                    this.jobs.splice(i, 1);
                    i--;
                } else {
                    job.loop();
                }
            } catch (e) {
                console.error("Error looping job", job.jobId, e);
            }
        }
    }

    async _loop1() {
        if (this.stopNow) return;
        await this._jobsLooping();
        this.loopTimeout = setTimeout(() => {
            this._loop1();
        }, 100);
    }

    async _loop2() {
        if (this.stopNow) return;
        await this._startPendingJobs();
        this.loopTimeout = setTimeout(() => {
            this._loop2();
        }, 10);
    }
    
    async _loop() {
        await this._loop1();   
        await this._loop2();   
    }
}
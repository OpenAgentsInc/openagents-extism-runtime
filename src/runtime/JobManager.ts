import { 
    PoolConnectorClient,    
    PendingJobs, 
    Job, 
    JobInput
} from "openagents-grpc-proto";


import ExtismJob from "./ExtismJob";
import { CallContext, CurrentPlugin } from "@extism/extism";
 import {ExtismFunction, HostFunctionsNamespace} from "./HostFunctionsNamespace";

export default class JobManager {
    conn: PoolConnectorClient;
    loopTimeout: NodeJS.Timeout;
    stopNow: boolean = false;
    jobs: ExtismJob[] = [];
    hostNamespaces: Array<HostFunctionsNamespace> = [];
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
                })
            ).response;
            if (pendingJobs.jobs.length > 0) {
                console.log(pendingJobs.jobs.length, "jobs to start");
            }
            for (const job of pendingJobs.jobs) {
                try {
                    const inputs: JobInput[] = job.input;
                    const input = inputs[0];

                    const inputData = input.data;
                    const pluginMain: string = job.param.find((param) => param.key == "main")?.value[0] || "";
                    const pluginDeps: string[] =
                        job.param.find((param) => param.key == "dependencies")?.value || [];
                    const maxExecutionTime = job.maxExecutionTime;
                    const expiration = Math.min(Date.now() + maxExecutionTime, job.expiration);

                    const mergedHostFunctions: {
                        [key: string]: ExtismFunction;
                    } = {};
                    for (const namespace of this.hostNamespaces) {
                        const functions: { [key: string]: ExtismFunction } = namespace.getHostFunctions(
                            this,
                            job.id
                        );
                        for (const [name, func] of Object.entries(functions)) {
                            mergedHostFunctions[name] = func;
                        }
                    }

                    const plugin = new ExtismJob(
                        job.id,
                        pluginMain,
                        pluginDeps,
                        expiration,
                        mergedHostFunctions
                    );
                    const res = (await this.conn.acceptJob({ jobId: job.id })).response;
                    plugin
                        .init()
                        .then(() => {
                            this.jobs.push(plugin);
                            plugin
                                .run(inputData)
                                .then((output) =>
                                    this.conn.completeJob({
                                        jobId: job.id,
                                        output,
                                    })
                                )
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

    async _loop() {
        await this._startPendingJobs();
        await this._jobsLooping();
        if (this.stopNow) return;
        this.loopTimeout = setTimeout(() => {
            this._loop();
        }, 10);
    }
}
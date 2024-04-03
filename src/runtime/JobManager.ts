import { NostrConnectorClient  } from "./proto/rpc.client";

import {PendingJobs} from "./proto/rpc";
import { Job, JobInput } from "./proto/Protocol";
import ExtismJob from "./ExtismJob";
import { CallContext, CurrentPlugin } from "@extism/extism";
 import {ExtismFunction, HostFunctionsNamespace} from "./HostFunctionsNamespace";

export default class JobManager {
    conn: NostrConnectorClient;
    loopTimeout: NodeJS.Timeout;
    stopNow: boolean = false;
    jobs: ExtismJob[] = [];
    hostNamespaces: Array<HostFunctionsNamespace>=[];
    constructor(conn: NostrConnectorClient) {
        this.conn = conn;
    }

    async registerNamespace(namespace: HostFunctionsNamespace){
        this.hostNamespaces.push(namespace);

    };

    async stop() {
        clearTimeout(this.loopTimeout);
        this.stopNow = true;
    }

    async start() {
        await this._loop();
    }

    async _startPendingJobs() {
        const pendingJobs: PendingJobs = (
            await this.conn.getPendingJobs({
                filterByRunOn: "openagents/extism-runtime",
            })
        ).response;

        for (const job of pendingJobs.jobs) {
            const inputs: JobInput[] = job.input;
            const input = inputs[0];

            const inputData = input.data;
            const pluginMain: string = job.param.find((param) => param.key == "main")?.value[0];
            const pluginDeps: string[] = job.param.find((param) => param.key == "dependencies")?.value;
            const maxExecutionTime = job.maxExecutionTime;
            const expiration = Math.min(Date.now() + maxExecutionTime, job.expiration);


            const mergedHostFunctions:{
                [key:string]:ExtismFunction
            }={};
            for(const namespace of this.hostNamespaces){
                const functions: { [key: string]: ExtismFunction }= namespace.getHostFunctions(this,job.id);
                for(const [name,func] of Object.entries(functions)){
                    mergedHostFunctions[name]=func;
                }
            } 

            const plugin = new ExtismJob(job.id, pluginMain, pluginDeps, expiration, mergedHostFunctions);
            const res = (await this.conn.acceptJob({ jobId: job.id })).response;

            plugin.init().then(() => {
                plugin.run(inputData).then((output) => {
                    this.conn.completeJob({
                        jobId: job.id,
                        output,
                    });
                });
                this.jobs.push(plugin);
            });
        }
    }

    async _jobsLooping() {
        for (let i = 0; i < this.jobs.length; i++) {
            const job = this.jobs[i];
            if (await job.isExpired()) {
                await job.destroy();
                this.jobs.splice(i, 1);
                i--;
            } else {
                await job.loop();
            }
        }
    }

    async _loop() {
        const results = await Promise.allSettled([this._startPendingJobs(), this._jobsLooping()]);
        // print errors
        if (this.stopNow) return;
        this.loopTimeout = setTimeout(this._loop.bind(this), 10);
    }
}
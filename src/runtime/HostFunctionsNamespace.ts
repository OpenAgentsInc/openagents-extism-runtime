import { CurrentPlugin } from "@extism/extism";
import JobManager from "./JobManager";
import { Job } from "openagents-grpc-proto";

export type ExtismFunction = (callContext: CurrentPlugin, ...args: any[]) => any;

export type HostFunction = (
    mng: JobManager,
    pluginPath: string,
    pluginId:string,
    currentJob: Job,
    callContext: CurrentPlugin,
    ...args: any[]
) => any;


export class HostFunctionsNamespace {
    functions: Map<string, HostFunction> = new Map();
    namespace: string;
    constructor(namespace: string) {
        this.namespace = namespace;
    }

    registerFunction(name: string, func: HostFunction) {
        this.functions.set(this.namespace + "_" + name, func);
    }


    getHostFunctions(mng: JobManager, currentJob: Job, pluginPath:string, pluginId: string): { [key: string]: ExtismFunction } {
        const extismHostFunctions: {
            [key: string]: ExtismFunction;
        } = {};

        for (const [name, func] of this.functions) {
            extismHostFunctions[name] = (callContext: CurrentPlugin, ...args: any[]) => {
                return func(mng, pluginPath, pluginId, currentJob, callContext, ...args);
            };
        }

        return extismHostFunctions;
    }
}

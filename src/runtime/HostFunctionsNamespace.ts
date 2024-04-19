import { CurrentPlugin } from "@extism/extism";
import JobManager from "./JobManager";

export type ExtismFunction = (callContext: CurrentPlugin, ...args: any[]) => any;

export type HostFunction = (
    mng: JobManager,
    pluginPath: string,
    pluginId:string,
    jobId: string,
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


    getHostFunctions(mng: JobManager, jobId: string, pluginPath:string, pluginId: string): { [key: string]: ExtismFunction } {
        const extismHostFunctions: {
            [key: string]: ExtismFunction;
        } = {};

        for (const [name, func] of this.functions) {
            extismHostFunctions[name] = (callContext: CurrentPlugin, ...args: any[]) => {
                return func(mng, pluginPath,pluginId, jobId, callContext, ...args);
            };
        }

        return extismHostFunctions;
    }
}

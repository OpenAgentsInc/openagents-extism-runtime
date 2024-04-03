import { CurrentPlugin } from "@extism/extism";
import JobManager from "./JobManager";

export type ExtismFunction = (callContext: CurrentPlugin, ...args: any[]) => any;

export type HostFunction = (
    mng: JobManager,
    jobId: string,
    callContext: CurrentPlugin,
    ...args: any[]
) => any;

export type Interceptor = (
    functioName: string,
    mng: JobManager,
    jobId: string,
    callContext: CurrentPlugin,
    ...args: any[]
) => (any[]|undefined);

export class HostFunctionsNamespace {
    functions: Map<string, HostFunction> = new Map();
    namespace: string;
    interceptor: Interceptor;
    constructor(namespace: string) {
        this.namespace = namespace;
    }

    registerFunction(name: string, func: HostFunction) {
        this.functions.set(this.namespace + "_" + name, func);
    }

    interceptedBy(interceptor: Interceptor) {
        this.interceptor = interceptor;
        return this;
    }

    getHostFunctions(mng: JobManager, jobId: string): { [key: string]: ExtismFunction } {
        const extismHostFunctions: {
            [key: string]: ExtismFunction;
        } = {};

        for (const [name, func] of this.functions) {
            extismHostFunctions[name] = (callContext: CurrentPlugin, ...args: any[]) => {
                if (!this.interceptor) {
                    return func(mng, jobId, callContext, ...args);
                } else {
                    const newArgs = this.interceptor(name, mng, jobId, callContext, name, ...args);
                    if (!newArgs) {
                        return undefined;
                    } else {
                        return func(mng, jobId, callContext, ...newArgs);
                    }
                }
            };
        }

        return extismHostFunctions;
    }
}

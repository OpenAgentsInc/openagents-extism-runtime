import * as Extism from "@extism/extism";
import Path from "path";
import {ExtismFunction} from "./HostFunctionsNamespace";

type Fragment = {
    plugin: Extism.Plugin;
    meta: {},
    names: string[];
}



export default class ExtismJob {
    mainPluginPath: string;
    initialized: boolean = false;

    main: Fragment;
    dependencies: Fragment[] = [];
    expiration: number = 0;
    looping: boolean = false;
    jobId: string;
    hostFunctions: { [key: string]: ExtismFunction };
    executionQueue: Promise<string|undefined> = Promise.resolve(undefined);

    constructor(
        jobId: string,
        mainPluginPath: string,
        expiration: number,
        hostFunctions: { [key: string]: ExtismFunction }
    ) {
        // TODO: check origins
        this.mainPluginPath = mainPluginPath;
        this.expiration = expiration;
        this.jobId = jobId;
        this.hostFunctions = hostFunctions;

        // autodestruct
        setTimeout(async () => {
            await this.destroy();
        },1000*60*5);
    }

    async init() {
        if (this.initialized) throw new Error("Already initialized");
        this.main = await this._loadFragment(this.mainPluginPath);
     

        this.initialized = true;
        for (const plugin of [this.main, ...this.dependencies]) {
            await this._callPluginMaybe(plugin.plugin, "init").catch((e) => {
                console.error(e);
            });
        }
    }

    async isExpired() {
        return Date.now() > this.expiration;
    }

    async _loadFragment(path: string): Promise<Fragment> {
        const options = {
            useWasi: true,
            runInWorker: true,
            functions: {
                "extism:host/user": this.hostFunctions,
            },
            allowedHosts:["*"]
        };
        const plugin = await Extism.createPlugin(path, options);
        let meta: any;
        if (await plugin.functionExists("getMeta")) {
            meta = await plugin.call("getMeta");
        }
        if (!meta) meta = {};

        const names = [];
        names.push(path);
        names.push(Path.basename(path));
        if (meta.name) names.push(meta.name);

        const fragment: Fragment = {
            plugin: plugin,
            meta,
            names,
        };
        return fragment;
    }

    async _callPlugin(plugin: Extism.Plugin, method: string, jobId?: string, inputData?: string){
        return await this._callPluginMaybe(plugin, method, jobId, inputData, true);
    }
    async _callPluginMaybe(
        plugin: Extism.Plugin,
        method: string,
        jobId?: string,
        inputData?: string,
        required?: boolean
    ): Promise<string | undefined> {
        if (!this.initialized) throw new Error("Not initialized");
        const q=this.executionQueue.then(async () => {
            try{
                const fexists = async (name) => {
                    return await plugin.functionExists(name);
                };
                let out: Extism.PluginOutput;
                if (jobId && (await fexists(method + "ForJob"))) {
                    out = await plugin.call(
                        method + "ForJob",
                        JSON.stringify({
                            jobId: jobId,
                            args: inputData,
                        })
                    );
                } else if (await fexists(method)) {
                    out = await plugin.call(method, inputData);
                } else {
                    if (required) {
                        throw new Error("No method " + method + " found in  plugin " + this);
                    } else {
                        return "";
                    }
                }
                return out?out.text():undefined;
            }catch(e){
                console.error("Error calling plugin in execution queue",e);
                throw e;
            }
        }).catch((e)=>{
            console.error("Error in execution queue",e);
            throw e;
        });
        
     
        this.executionQueue= q;
        return await q;
    }

    // async callPlugin(pluginName: string, input: string): Promise<string | undefined> {
    //     if (!this.initialized) throw new Error("Not initialized");
    //     for (let i = 0; i < this.dependencies.length; i++) {
    //         const fragment = this.dependencies[i];
    //         if (!fragment.names.includes(pluginName)) continue;
    //         return await this._callPlugin(fragment.plugin, "run", this.jobId, input);
    //     }
    //     return undefined;
    // }

    async run(inputData: string): Promise<string | undefined> {
        if (!this.initialized) throw new Error("Not initialized");
        try{
            return await this._callPlugin(this.main.plugin, "run", this.jobId, inputData);
        }catch(e){
            console.error("Error running plugin",e);
            throw e;
        }
    }

    async loop() {
        if (!this.initialized) throw new Error("Not initialized");
          
        if (this.looping) return;
        this.looping = true;
        await this._callPluginMaybe(this.main.plugin, "loop", this.jobId, "{}")
            .finally(() => {
                this.looping = false;
            })
            .catch((e) => {
                console.error(e);
            });
    }

    async destroy() {
        if (!this.initialized) return;
        this.initialized = false;
        for (const plugin of [this.main, ...this.dependencies]) {
            try {
                await this._callPluginMaybe(plugin.plugin, "destroy").catch((e) => {
                    console.error(e);
                });
            } catch (e) {
                console.log("Error destroying plugin", e);
            }
        }
        for (const plugin of [this.main, ...this.dependencies]) {
            try {
                await plugin.plugin.close();
            } catch (e) {
                console.log("Error closing plugin", e);
            }
        }
    }
}

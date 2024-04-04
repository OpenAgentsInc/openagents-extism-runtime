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
    dependenciesPaths: string[];
    initialized: boolean = false;

    main: Fragment;
    dependencies: Fragment[] = [];
    expiration: number = 0;
    looping: boolean = false;
    jobId: string;
    hostFunctions: {  [key: string]: ExtismFunction  };

    constructor(
        jobId: string,
        mainPluginPath: string,
        dependenciesPaths: string[],
        expiration: number,
        hostFunctions: {  [key: string]: ExtismFunction }
    ) {
        // TODO: check origins
        this.mainPluginPath = mainPluginPath;
        this.dependenciesPaths = dependenciesPaths;
        this.expiration = expiration;
        this.jobId = jobId;
        this.hostFunctions = hostFunctions;
    }

    async init() {
        if (this.initialized) throw new Error("Already initialized");
        this.main = await this._loadFragment(this.mainPluginPath);
        for (let i = 0; i < this.dependenciesPaths.length; i++) {
            const fragment = await this._loadFragment(this.dependenciesPaths[i]);
            this.dependencies.push(fragment);
        }

        this.initialized = true;
        for (const plugin of [this.main, ...this.dependencies]) {
            this._callPlugin(plugin.plugin, "init").catch((e) => {
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

    async _callPlugin(
        plugin: Extism.Plugin,
        method: string,
        jobId?: string,
        inputData?: string
    ): Promise<string | undefined> {
        if (!this.initialized) throw new Error("Not initialized");
        let out: Extism.PluginOutput;
        if (jobId && (await plugin.functionExists(method + "ForJob"))) {
            out = await plugin.call(
                method + "ForJob",
                JSON.stringify({
                    jobId: jobId,
                    args: inputData,
                })
            );
        } else if (await plugin.functionExists(method)) {
            out = await plugin.call(method, inputData);
        } else {
            throw new Error("No method " + method + " found in  plugin " + this);
        }
        return out.text();
    }

    async callPlugin(pluginName: string, input: string): Promise<string | undefined> {
        if (!this.initialized) throw new Error("Not initialized");
        for (let i = 0; i < this.dependencies.length; i++) {
            const fragment = this.dependencies[i];
            if (!fragment.names.includes(pluginName)) continue;
            return await this._callPlugin(fragment.plugin, "run", this.jobId, input);
        }
        return undefined;
    }

    async run(inputData: string): Promise<string | undefined> {
        if (!this.initialized) throw new Error("Not initialized");
        return this._callPlugin(this.main.plugin, "run", this.jobId, inputData);
    }

    async loop() {
        if (!this.initialized) throw new Error("Not initialized");
        if (this.looping) return;
        this.looping = true;
        this._callPlugin(this.main.plugin, "loop", this.jobId, "{}")
            .finally(() => {
                this.looping = false;
            })
            .catch((e) => {
                console.error(e);
            });
    }

    async destroy() {
        if (!this.initialized) throw new Error("Not initialized");
        for (const plugin of [this.main, ...this.dependencies]) {
            try {
                this._callPlugin(plugin.plugin, "destroy").catch((e) => {
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

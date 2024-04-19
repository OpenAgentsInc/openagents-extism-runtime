
import Fs from "fs";
export class SecretProvider {
    get(namespace:string, name: string): string {
        throw new Error("Not implemented");
    }
}

export class SecretNamespace {
    providers: SecretProvider[];
    namespace: string;
    constructor(providers:SecretProvider[], namespace:string){
        this.providers = providers;
        this.namespace = namespace;
    }
    get(name: string): string {
        for (const provider of this.providers){
            try{
                const s = provider.get(this.namespace, name);
                if (s) return s;
            }catch(e){
                console.error(e);
            }
        }
        return undefined;
    }
}

export class HttpSecretProvider extends SecretProvider {
    url: string;
    lastFetch: number = 0;
    refreshInterval: number;
    document: {[key:string]:string} = {};
    constructor(url: string,refreshInterval:number = 1000*60){
        super();
        this.url = url;
        this.refreshInterval = refreshInterval;
    }
    async getRemote(){
        if(Date.now() - this.lastFetch > this.refreshInterval){
            this.document=await fetch(this.url).then(res=>res.json());
            this.lastFetch = Date.now();
        }
        return this.document;
    }
    get(namespace:string, name: string): string {
        const n:{[key:string]:string} = this.getRemote()[namespace];
        if(n) return n[name];
        return undefined;
    }
}

class LocalSecretProvider extends SecretProvider {
    path: string;
    document: {[key:string]:string} = {};
    lastFetch: number = 0;
    refreshInterval: number;
    constructor(path: string,refreshInterval:number = 1000*60){
        super();
        this.path = path;
        this.refreshInterval = refreshInterval;        
    }
    async getLocal(){
        if(Date.now() - this.lastFetch > this.refreshInterval){
            if(Fs.existsSync(this.path)){
                this.document = JSON.parse(await Fs.promises.readFile(this.path,"utf8"));
            }
            this.lastFetch = Date.now();
        }
        return this.document||{};
    }
    get(namespace:string, name: string): string {
        const n:{[key:string]:string} = this.getLocal()[namespace];
        if(n) return n[name];
        return undefined;
    }
}

export default class Secrets {
    providers: SecretProvider[]= [];
    namespace(ns: string): SecretNamespace {
        return new SecretNamespace(this.providers, ns);
    }
    
    useBestProvider(path: string): SecretProvider {
        if(path.startsWith("http://") || path.startsWith("https://")){
            return new HttpSecretProvider(path);    
        }else {
            return new LocalSecretProvider(path);
        }
    }

    addProvider(provider: SecretProvider|string){
        if (typeof provider === "string"){
            provider = this.useBestProvider(provider);
        }
        this.providers.push(provider as SecretProvider);
    }
}
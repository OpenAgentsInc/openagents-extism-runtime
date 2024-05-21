
import Fs from "fs";
import Crypto from "crypto";
export class SecretProvider {
    key: string;
    async get(namespace:string, name: string): Promise<string> {
        throw new Error("Not implemented");
    }
    setKey(key: string){
        this.key = key;
    }
    decrypt(data: string): string {
        if (!this.key||!data.startsWith("enc:")) {
            return data;
        }
        const encryptedData = data.slice(4);
        const privateKey =  this.key;
        const buffer = Buffer.from(encryptedData, "base64");
        const decrypted = Crypto.privateDecrypt(
            {
                key: privateKey,
                padding: Crypto.constants.RSA_PKCS1_OAEP_PADDING,
            },
            buffer
        );
        return decrypted.toString("utf8");
    }
}

export class SecretNamespace {
    providers: SecretProvider[];
    namespace: string;
    constructor(providers:SecretProvider[], namespace:string){
        this.providers = providers;
        this.namespace = namespace;
    }
    async get(name: string): Promise<string>{
        for (const provider of this.providers){
            try{
                const s = await provider.get(this.namespace, name);
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
    async get(namespace:string, name: string): Promise<string> {
        const n = (await this.getRemote())[namespace];
        if(n) return this.decrypt(n[name]);
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
    async get(namespace:string, name: string): Promise<string> {
        const n  = (await this.getLocal())[namespace];
        if(n) return this.decrypt(n[name]);
        return undefined;
    }
}

export default class Secrets {
    providers: SecretProvider[]= [];
    key: string;
    constructor(keyPath: string){
        if(Fs.existsSync(keyPath)){
            this.key = Fs.readFileSync(keyPath,"utf8");
        }else{
            console.warn("Key file not found");
        }
    }

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
        provider.setKey(this.key);
        this.providers.push(provider as SecretProvider);
    }
}
import Fs from "fs";
import Path from "path";
import JSON5 from "json5";
export default  class PluginRepo{
    private indexPath: string;
    private lastRefresh: number = 0;
    private refreshTime: number = 1000*60*15;
    private plugins: any[] = [];

    constructor(indexPath:string|undefined){
        this.indexPath = indexPath;
    }   

    async refresh(){
        if(!this.indexPath) return;
        try{
            if(Date.now() - this.lastRefresh > this.refreshTime){
                let plugins;
                if(this.indexPath.startsWith("http://") || this.indexPath.startsWith("https://")){
                    const index:string[] = JSON5.parse(await fetch(this.indexPath).then(res=>res.text()));
                    plugins=[];
                    for(const pluginRelPath of index){
                        try{
                            let pluginAbsPath;
                            if(pluginRelPath.startsWith("http://") || pluginRelPath.startsWith("https://")){
                                pluginAbsPath = pluginRelPath;
                            }else{
                                const baseUrl = this.indexPath.split("/").slice(0,-1).join("/");
                                pluginAbsPath = baseUrl + "/" + pluginRelPath;
                            }
                            const plugin = JSON5.parse(await fetch(pluginAbsPath).then(res=>res.text()));
                            plugins.push(plugin);
                        }catch(e){
                            console.error("Failed to fetch plugin",pluginRelPath,e);
                        }                        
                    }
                }else{
                    if(Fs.existsSync(this.indexPath)){
                        const index:string[] = JSON5.parse(await Fs.promises.readFile(this.indexPath,"utf8"));
                        plugins=[];
                        for(const pluginRelPath of index){
                            try{
                                const pluginAbsPath = Path.join(Path.dirname(this.indexPath),pluginRelPath);
                                const plugin = JSON5.parse(await Fs.promises.readFile(pluginAbsPath,"utf8"));
                                plugins.push(plugin);
                            }catch(e){
                                console.error("Failed to fetch plugin",pluginRelPath,e);
                            }
                        }
                    }                
                }                
                if(plugins)this.plugins = plugins;
            }
        }catch(e){
            console.error("Failed to refresh plugin index",e);
        
        }
        this.lastRefresh = Date.now();
    }


    async getAnnouncements():Promise<Array<{
        meta: string;
        sockets: string;
        template: string;
    }>>{
        await this.refresh();
        const announcements=[];
        for(const plugin of this.plugins){
            try{
                const enabled = plugin.enabled;
                if(typeof enabled!="undefined" && !enabled) continue;
                
                let template=plugin.template;                
                const sockets = plugin.sockets;
                const meta = plugin.meta;
                if(plugin["mini-template"]){
                    const miniTemplate = plugin["mini-template"];
                    const main = miniTemplate.main;
                    const input=miniTemplate.input;
                    const allowedHosts = miniTemplate["allowed-hosts"]||miniTemplate["allowed_hosts"];
                    
                    
                    if(!main || !input) throw new Error("Invalid mini-template");
                    const escapeString = (str)=>{
                        return str.replace(/"/g,`\\"`);
                    };

                    let allowedHostsTemplate="";
                    if(allowedHosts){
                        for(const host of allowedHosts){
                            allowedHostsTemplate+=`["param", "allow-host", "${escapeString(host)}"],\n`;
                        }
                    }

                    let bidsTemplate="";
                    if(meta["prices"]){
                        for(const price of meta["prices"]){
                            bidsTemplate+=`["bid", "${price["amount"]}", "${price["currency"]||"bitcoin"}", "${price["protocol"]||"lightning"}"],\n`;
                        }
                    }
                    
                    
                    template = `
                        {
                            "kind": {{{meta.kind}}},
                            "created_at": {{{sys.timestamp_seconds}}},
                            "tags": [
                                ["param","run-on", "openagents/extism-runtime" ],
                                ["param","main","${escapeString(main)}"],
                                ${allowedHostsTemplate.trim()}
                                ${bidsTemplate.trim()}
                                ["i", "${escapeString(input)}", "text", ""],
                                ["expiration", "{{{sys.expiration_timestamp_seconds}}}"]
                            ],
                            "content":""
                        }                    
                    `;                
                }

                if(!template) throw new Error("Invalid plugin template");
                if(!sockets) throw new Error("Invalid plugin sockets");
                if(!meta) throw new Error("Invalid plugin meta");

                announcements.push({
                    meta: JSON.stringify(meta),
                    sockets: JSON.stringify(sockets),
                    template: template
                });
            }catch(e){
                console.error("Failed to process plugin",plugin,e);
            }
        }

        return announcements;
    }

}
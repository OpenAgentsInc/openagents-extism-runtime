import {  PendingJobs, Job, JobInput } from "openagents-grpc-proto";
import PoolConnectorClient from "./PoolConnectorClient";

export default class Announcer {
    conn: PoolConnectorClient;
    loopTimeout: NodeJS.Timeout;
    stopNow: boolean = false;
    templates = [
        {
            nextAnnounceTimestamp: 0,
            sockets: JSON.stringify({   
                in: { // parameters
                    "input_data" : {
                        name: "Input Data",
                        type: "string",
                        about:"Plugin input data as a json string"
                    },
                    "pluginPath":{
                        name: "Plugin",
                        type: "string",
                        about:"Http(s) path to the plugin to run"
                    }
                },
                out:{
                    "output_type":{
                        name: "Expected output type",
                        type: "string",
                        about: "mime type of the output",
                        value: "application/json"
                    }
                }
            }),  
            meta: JSON.stringify({
                kind: 5003,
                name: "Extism plugin Action",
                about: "Run an extism plugin with some input",
                tos: "",
                privacy: "",
                web: "",
                picture: "",
                tags: ["tool-internal"]
            }),
            template:`{
                "kind": {{meta.kind}},
                "created_at": {{sys.timestamp_seconds}},
                tags: [
                    ["param", "run-on", "openagents/extism-runtime"],
                    ["param", "main", "{{in.pluginPath}}"],
                    ["i", "{{in.input_data}}"],
                    ["expiration", "{{sys.expiration_timestamp_seconds}}"]      
                    ["output", "{{out.output_type}}"]              
                ],
            }`,
        },
    ];
    iconUrl: string = "";
    name: string = "";
    description: string = "";
    nextNodeAnnouncementTimestamp: number = 0;

    constructor(conn: PoolConnectorClient, name: string, iconUrl: string, description: string) {
        this.conn = conn;
        this.name = name;
        this.iconUrl = iconUrl;
        this.description = description;
    }

    async stop() {
        clearTimeout(this.loopTimeout);
        this.stopNow = true;
    }

    async start() {
        console.log("Starting job manager");
        await this._loop();
    }

    async _loop() {
        try {
            if (Date.now() >= this.nextNodeAnnouncementTimestamp) {
                const res = await this.conn.r(
                    this.conn.announceNode({
                        iconUrl: this.iconUrl,
                        name: this.name,
                        description: this.description,
                    })
                );
                const refreshTime = res.refreshInterval;
                this.nextNodeAnnouncementTimestamp = Date.now() + refreshTime;
            }

            for (const template of this.templates) {
                if (Date.now() >= template.nextAnnounceTimestamp) {
                    const res = await this.conn.r(
                        this.conn.announceEventTemplate({
                            meta: template.meta,
                            sockets: template.sockets,
                            template: template.template,
                        })
                    );
                    const refreshInterval = res.refreshInterval;
                    template.nextAnnounceTimestamp = Date.now() + refreshInterval;
                }
            }
        } catch (e) {
            console.error(e);
        }

        if (this.stopNow) return;
        this.loopTimeout = setTimeout(() => {
            this._loop();
        }, 10);
    }
}
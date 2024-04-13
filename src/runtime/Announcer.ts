import {  PendingJobs, Job, JobInput } from "openagents-grpc-proto";
import PoolConnectorClient from "./PoolConnectorClient";

export default class Announcer {
    conn: PoolConnectorClient;
    loopTimeout: NodeJS.Timeout;
    stopNow: boolean = false;
    templates = [
        {
            nextAnnounceTimestamp: 0,
            template: {
                kind: 5003,
                tags: [
                    ["name", "Extism Action"],
                    ["param", "run-on", "openagents/extism-runtime"],
                    ["param", "main", "%PLUGIN_PATH%"],
                    ["about", "An action that runs an extism plugin with some input"],
                    ["i", "%INPUT%"],
                    ["tos", ""],
                    ["privacy", ""],
                    ["author", ""],
                    ["web", ""],
                    ["picture", ""],
                ],
            },
        },
    ];
    iconUrl: string = "";
    name: string = "";
    description: string = "";
    nextNodeAnnouncementTimestamp: number = 0;

    constructor(
        conn: PoolConnectorClient,
        name: string,
        iconUrl: string,
        description: string
    ) {
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
            if(Date.now()>=this.nextNodeAnnouncementTimestamp){
                const res = await this.conn.r(
                    this.conn.announceNode({
                        iconUrl: this.iconUrl,
                        name: this.name,
                        description: this.description
                    })
                );
                const refreshTime= res.refreshInterval;
                this.nextNodeAnnouncementTimestamp = Date.now() + refreshTime;
            }

            for (const template of this.templates) {
                if (Date.now() >= template.nextAnnounceTimestamp) {
                    const res=await this.conn.r(this.conn.announceEventTemplate({
                        eventTemplate: JSON.stringify(template.template, null, 2),
                    }));
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
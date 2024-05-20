import Fs from "fs";
import Path from "path";
import Express from "express";
import * as GRPC from "@grpc/grpc-js";
import { GrpcTransport  } from "@protobuf-ts/grpc-transport";
import JobManager from "./JobManager";
import JobHostFunctions from "./binds/JobHostFunctions";
import NostrHostFunctions from "./binds/NostrHostFunctions";
import PoolConnectorClient from "./PoolConnectorClient";
import Announcer from "./Announcer";
import Secrets from "./Secrets";
import SecretHostFunctions from "./binds/SecretsHostFunctions";
import BlobHostFunctions from "./binds/BlobHostFunctions";
import PluginRepo from "./PluginRepo";
async function main(){
    const IP = process.env.POOL_ADDRESS || "127.0.0.1";
    const PORT = Number(process.env.POOL_PORT || 5000);
    const POOL_SSL = (process.env.POOL_SSL || "false") == "true";

    const CA_CRT_PATH: string = process.env.POOL_CA_CRT || "";
    const CLIENT_CRT_PATH: string = process.env.POOL_CLIENT_CRT || "";
    const CLIENT_KEY_PATH: string = process.env.POOL_CLIENT_KEY || "";

    const CA_CRT: Buffer | undefined = (CA_CRT_PATH && Fs.existsSync(CA_CRT_PATH))?Fs.readFileSync(CA_CRT_PATH):undefined;
    const CLIENT_CRT: Buffer | undefined =
        CLIENT_CRT_PATH && Fs.existsSync(CLIENT_CRT_PATH) ? Fs.readFileSync(CLIENT_CRT_PATH) : undefined;
    const CLIENT_KEY: Buffer | undefined =
        CLIENT_KEY_PATH && Fs.existsSync(CLIENT_KEY_PATH) ? Fs.readFileSync(CLIENT_KEY_PATH) : undefined;

    const SECRETS_PROVIDERS: string[] = process.env.EXTISM_RUNTIME_SECRETS_PROVIDERS
        ? process.env.EXTISM_RUNTIME_SECRETS_PROVIDERS.split(",")
        : ["https://raw.githubusercontent.com/OpenAgentsInc/openagents-plugins/master/secrets.json"];

    const SECRETS_KEY: string = process.env.EXTISM_RUNTIME_SECRETS_KEY || "./private.pem";
    
    const PLUGINS_REPO =
        process.env.PLUGINS_REPO ||
        "https://raw.githubusercontent.com/OpenAgentsInc/openagents-plugins/master/index.json5";

    const ICON_URL = process.env.ICON_URL || "";
    const NAME = process.env.NAME || "Extism Plugin Runner Node";
    const DESCRIPTION = process.env.DESCRIPTION || "A node that runs extism plugins";

    const NODE_TOKEN = process.env.NODE_TOKEN || "";


    const secrets = new Secrets(SECRETS_KEY);
    for (const provider of SECRETS_PROVIDERS) {
        secrets.addProvider(provider);
    }

    const pluginRepo = new PluginRepo(PLUGINS_REPO);

    const poolConnector = new PoolConnectorClient(IP, PORT, POOL_SSL, CA_CRT, CLIENT_KEY, CLIENT_CRT, NODE_TOKEN);
    await poolConnector.ready()

    const announcer = new Announcer(poolConnector, NAME, ICON_URL, DESCRIPTION, pluginRepo);
    announcer.start();

    const jobManager: JobManager = new JobManager(poolConnector, secrets);
    jobManager.registerNamespace(new JobHostFunctions(poolConnector));
    jobManager.registerNamespace(new NostrHostFunctions(poolConnector));    
    jobManager.registerNamespace(new SecretHostFunctions(secrets));    
    jobManager.registerNamespace(new BlobHostFunctions(poolConnector));    
    await jobManager.start();




}

main();
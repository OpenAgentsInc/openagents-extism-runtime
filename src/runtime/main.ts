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
async function main(){
    const IP = process.env.POOL_ADDRESS || "127.0.0.1";
    const PORT = Number(process.env.POOL_PORT || 5000);
    
    const CA_CRT_PATH: string = process.env.POOL_CA_CRT || "";
    const CLIENT_CRT_PATH: string = process.env.POOL_CLIENT_CRT || "";
    const CLIENT_KEY_PATH: string = process.env.POOL_CLIENT_KEY || "";

    const CA_CRT: Buffer | undefined = (CA_CRT_PATH && Fs.existsSync(CA_CRT_PATH))?Fs.readFileSync(CA_CRT_PATH):undefined;
    const CLIENT_CRT: Buffer | undefined =
        CLIENT_CRT_PATH && Fs.existsSync(CLIENT_CRT_PATH) ? Fs.readFileSync(CLIENT_CRT_PATH) : undefined;
    const CLIENT_KEY: Buffer | undefined =
        CLIENT_KEY_PATH && Fs.existsSync(CLIENT_KEY_PATH) ? Fs.readFileSync(CLIENT_KEY_PATH) : undefined;
    

    const ICON_URL = process.env.ICON_URL || "";
    const NAME = process.env.NAME || "Extism Plugin Runner Node";
    const DESCRIPTION = process.env.DESCRIPTION || "A node that runs extism plugins";

    const poolConnector = new PoolConnectorClient(IP, PORT, CA_CRT, CLIENT_KEY, CLIENT_CRT);

    const announcer = new Announcer(poolConnector, NAME, ICON_URL, DESCRIPTION);
    announcer.start();

    const jobManager:JobManager= new JobManager(poolConnector);
    jobManager.registerNamespace(new JobHostFunctions(poolConnector));
    jobManager.registerNamespace(new NostrHostFunctions(poolConnector));    
    await jobManager.start();




}

main();
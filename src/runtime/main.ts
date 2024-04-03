import Fs from "fs";
import Path from "path";
import Express from "express";
import * as GRPC from "@grpc/grpc-js";
import { GrpcTransport  } from "@protobuf-ts/grpc-transport";
import JobManager from "./JobManager";
import JobHostFunctions from "./binds/JobHostFunctions";
import NostrHostFunctions from "./binds/NostrHostFunctions";
import NostrConnectorClient from "./NostrConnectorClient";
import TestHostFunctions from "./binds/TestHostFunctions";
async function main(){
    const IP = process.env.NOSTR_CONNECT_GRPC_BINDING_ADDRESS || "0.0.0.0";
    const PORT = Number(process.env.NOSTR_CONNECT_GRPC_BINDING_PORT || 5000);

    const nostrConnector = new NostrConnectorClient(IP,PORT);
    const jobManager:JobManager= new JobManager(nostrConnector);
    jobManager.registerNamespace(new JobHostFunctions(nostrConnector));
    jobManager.registerNamespace(new NostrHostFunctions(nostrConnector));
    jobManager.registerNamespace(new TestHostFunctions());
    await jobManager.start();




}

main();
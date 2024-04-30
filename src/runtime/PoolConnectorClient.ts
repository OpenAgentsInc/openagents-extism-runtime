import { PoolConnectorClient as _PoolConnectorClient } from "openagents-grpc-proto";
import * as GRPC from "@grpc/grpc-js";
import { GrpcTransport } from "@protobuf-ts/grpc-transport";
import type { UnaryCall, RpcOutputStream, ServerStreamingCall, RpcOptions } from "@protobuf-ts/runtime-rpc";

export default class PoolConnectorClient extends _PoolConnectorClient {
    constructor(ip: string, port: number, useSSL:boolean=false, rootCerts?: Buffer, privateKey?: Buffer, publicKey?: Buffer, nodeToken?:string) {
        super(
            new GrpcTransport({
                host: `${ip}:${port}`,
                channelCredentials:
                    !useSSL && !rootCerts && !privateKey && !publicKey
                        ? GRPC.ChannelCredentials.createInsecure()
                        : GRPC.ChannelCredentials.createSsl(
                              rootCerts || null,
                              privateKey || null,
                              publicKey || null
                          ),
                clientOptions: {
                    // 20 MB
                    "grpc.max_send_message_length": 20 * 1024 * 1024,
                    "grpc.max_receive_message_length": 20 * 1024 * 1024,
                },
            })
        );
        if (!(!useSSL && !rootCerts && !privateKey && !publicKey)) {
            console.log("using ssl");
        }

        // instrument each function to pass RpcOptions as the last argument
        const options: RpcOptions = {
            meta: {
                authorization: nodeToken,
            },
        };
            const parentPrototype = Object.getPrototypeOf(Object.getPrototypeOf(this));

        for (const key of Object.getOwnPropertyNames(parentPrototype)) {
            const value = this[key];
            if (typeof value === "function") {
                if (key === "constructor" || key === "ready" || key === "r" || key === "rS") continue;
                const originalContext = this;
                this[key] = async (...args: any[]) => {
                    args.push(options);                    
                    return value.apply(originalContext, args);
                };
            }
        }
    }


    async ready(){
        // TODO
    }
   

    async rS<T extends object>(
        c: ServerStreamingCall<object, T> 
    ): Promise<RpcOutputStream<T>> {
        const rpcStatus = await c.status;
        if (!(rpcStatus.code.toString() == "0" || rpcStatus.code.toString() == "OK")) {
            throw new Error(`rpc failed with status ${rpcStatus.code}: ${rpcStatus.detail}`);
        }
        return c.responses;
    }

    async r<T extends object>(c: UnaryCall<object, T> | Promise<UnaryCall<object, T>>): Promise<T> {      
        const cc = await c;
        const rpcStatus = await cc.status;
        if (!(rpcStatus.code.toString() == "0" || rpcStatus.code.toString() == "OK")) {
            throw new Error(`rpc failed with status ${rpcStatus.code}: ${rpcStatus.detail}`);
        }
        return cc.response;
    }
}

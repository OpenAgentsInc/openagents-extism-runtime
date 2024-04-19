import { PoolConnectorClient as _PoolConnectorClient } from "openagents-grpc-proto";
import * as GRPC from "@grpc/grpc-js";
import { GrpcTransport } from "@protobuf-ts/grpc-transport";
import type { UnaryCall,RpcOutputStream, ServerStreamingCall } from "@protobuf-ts/runtime-rpc";

export default class PoolConnectorClient extends _PoolConnectorClient {
    constructor(ip: string, port: number, rootCerts?: Buffer, privateKey?: Buffer, publicKey?: Buffer) {
        super(
            new GrpcTransport({
                host: `${ip}:${port}`,
                channelCredentials:
                    !rootCerts || !privateKey || !publicKey
                        ? GRPC.ChannelCredentials.createInsecure()
                        : GRPC.ChannelCredentials.createSsl(rootCerts, privateKey, publicKey),
            })
        );
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
